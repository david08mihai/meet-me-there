import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';
import { DateTimeField } from '../../../src/ui/DateTimeField';
import { Input } from '../../../src/ui/Input';
import { ScreenHeader } from '../../../src/ui/ScreenHeader';
import { theme, useThemeColors, useThemeMode } from '../../../src/ui/theme';

type PaymentModel = 'Free' | 'Paid';
type MapRegion = 'romania' | 'world';

type TagRow = {
  tag_id: number;
  name: string;
};

type Errors = Partial<
  Record<
    | 'title'
    | 'description'
    | 'tags'
    | 'start'
    | 'end'
    | 'location'
    | 'capacity'
    | 'price'
    | 'map',
    string
  >
>;

const ACCEPTED_IMAGE = /\.(jpg|jpeg|png)$/i;
const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 14;

const REGIONS: Record<
  MapRegion,
  { label: string; latitude: number; longitude: number; zoom: number }
> = {
  romania: { label: 'Romania', latitude: 45.9432, longitude: 24.9668, zoom: 6 },
  world: { label: 'World', latitude: 20, longitude: 0, zoom: 2 },
};

function lonToTileX(longitude: number, zoom: number) {
  return ((longitude + 180) / 360) * 2 ** zoom;
}

function latToTileY(latitude: number, zoom: number) {
  const radians = (latitude * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
    2 ** zoom
  );
}

function tileXToLon(tileX: number, zoom: number) {
  return (tileX / 2 ** zoom) * 360 - 180;
}

function tileYToLat(tileY: number, zoom: number) {
  const radians = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / 2 ** zoom)));
  return (radians * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tileUrl(zoom: number, x: number, y: number) {
  const max = 2 ** zoom;
  const wrappedX = ((x % max) + max) % max;
  const clampedY = Math.max(0, Math.min(max - 1, y));
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

export default function CreateEvent() {
  const router = useRouter();
  const { user } = useAuth();
  const colors = useThemeColors();
  const themeMode = useThemeMode();

  const palette = useMemo(
    () => ({
      screen: colors.background,
      card: themeMode === 'dark' ? '#111827' : '#FFFFFF',
      softCard: themeMode === 'dark' ? '#0F172A' : '#F8FAFC',
      softAccent: themeMode === 'dark' ? '#1E293B' : '#EEF0FF',
      chip: themeMode === 'dark' ? '#1E293B' : '#FFFFFF',
      stepper: themeMode === 'dark' ? '#1E293B' : '#EEF0FF',
      mutedBorder: themeMode === 'dark' ? '#475569' : '#CBD5E1',
    }),
    [colors.background, themeMode]
  );

  const [availableTags, setAvailableTags] = useState<TagRow[]>([]);
  const [loadingTags, setLoadingTags] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [capacity, setCapacity] = useState('25');
  const [paymentModel, setPaymentModel] = useState<PaymentModel>('Free');
  const [price, setPrice] = useState('25');
  const [errors, setErrors] = useState<Errors>({});

  const [mapRegion, setMapRegion] = useState<MapRegion>('romania');
  const [mapZoom, setMapZoom] = useState<number>(REGIONS.romania.zoom);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [pickedLatitude, setPickedLatitude] = useState<number | null>(null);
  const [pickedLongitude, setPickedLongitude] = useState<number | null>(null);

  useEffect(() => {
    const loadTags = async () => {
      try {
        setLoadingTags(true);

        const { data, error } = await supabase
          .from('tags')
          .select('tag_id, name')
          .order('name', { ascending: true });

        if (error) throw error;
        setAvailableTags(data ?? []);
      } catch (error) {
        console.error(error);
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to load tags'
        );
      } finally {
        setLoadingTags(false);
      }
    };

    loadTags();
  }, []);

  useEffect(() => {
    setMapZoom(REGIONS[mapRegion].zoom);
  }, [mapRegion]);

  const visibleTags = showMoreTags ? availableTags : availableTags.slice(0, 6);

  const mapCenter = REGIONS[mapRegion];
  const mapWidth = mapSize.width || 320;
  const mapHeight = mapSize.height || 220;
  const centerTileX = lonToTileX(mapCenter.longitude, mapZoom);
  const centerTileY = latToTileY(mapCenter.latitude, mapZoom);

  const tiles = useMemo(() => {
    const halfColumns = Math.ceil(mapWidth / TILE_SIZE / 2) + 2;
    const halfRows = Math.ceil(mapHeight / TILE_SIZE / 2) + 2;
    const baseX = Math.floor(centerTileX);
    const baseY = Math.floor(centerTileY);
    const maxY = 2 ** mapZoom - 1;
    const nextTiles: { key: string; x: number; y: number; left: number; top: number }[] = [];

    for (let y = baseY - halfRows; y <= baseY + halfRows; y += 1) {
      if (y < 0 || y > maxY) continue;
      for (let x = baseX - halfColumns; x <= baseX + halfColumns; x += 1) {
        nextTiles.push({
          key: `${mapZoom}-${x}-${y}`,
          x,
          y,
          left: mapWidth / 2 + (x - centerTileX) * TILE_SIZE,
          top: mapHeight / 2 + (y - centerTileY) * TILE_SIZE,
        });
      }
    }

    return nextTiles;
  }, [centerTileX, centerTileY, mapHeight, mapWidth, mapZoom]);

  const pickedMarkerPosition = useMemo(() => {
    if (pickedLatitude === null || pickedLongitude === null) return null;

    const left =
      mapWidth / 2 + (lonToTileX(pickedLongitude, mapZoom) - centerTileX) * TILE_SIZE;
    const top =
      mapHeight / 2 + (latToTileY(pickedLatitude, mapZoom) - centerTileY) * TILE_SIZE;

    return { left, top };
  }, [pickedLatitude, pickedLongitude, mapWidth, mapHeight, mapZoom, centerTileX, centerTileY]);

  const handleMapLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  const handleMapPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;

    const tileX = centerTileX + (locationX - mapWidth / 2) / TILE_SIZE;
    const tileY = centerTileY + (locationY - mapHeight / 2) / TILE_SIZE;

    const latitude = clamp(tileYToLat(tileY, mapZoom), -85, 85);
    const longitude = tileXToLon(tileX, mapZoom);

    setPickedLatitude(latitude);
    setPickedLongitude(longitude);
    setErrors((current) => ({ ...current, map: undefined }));
  };

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const validMime = /^image\/(jpeg|png)$/i.test(asset.mimeType ?? '');
    const validName = ACCEPTED_IMAGE.test(asset.fileName ?? asset.uri);

    if (!validMime && !validName) {
      Alert.alert('Invalid image', 'Accepted formats: JPG, JPEG, PNG.');
      return;
    }

    setCoverUri(asset.uri);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId]
    );
    setErrors((current) => ({ ...current, tags: undefined }));
  };

  const validate = () => {
    const nextErrors: Errors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedLocation = locationQuery.trim();
    const now = new Date();
    const numericCapacity = Number.parseInt(capacity, 10);
    const numericPrice = Number(price);

    if (!trimmedTitle) nextErrors.title = 'Event title is required';
    else if (trimmedTitle.length < 3) nextErrors.title = 'Event title is too short';
    else if (trimmedTitle.length > 100) nextErrors.title = 'Event title is too long';

    if (!trimmedDescription) nextErrors.description = 'Description is required';
    else if (trimmedDescription.length > 1000) nextErrors.description = 'Description is too long';

    if (selectedTagIds.length === 0) nextErrors.tags = 'Please select at least one category tag';

    if (!startTime) nextErrors.start = 'Start time is required';
    else if (startTime <= now) nextErrors.start = 'Please select a future start date and time';

    if (!endTime) nextErrors.end = 'End time is required';
    else if (startTime && endTime <= startTime) {
      nextErrors.end = 'End time must be later than start time';
    }

    if (!trimmedLocation) nextErrors.location = 'Location is required';
    if (pickedLatitude === null || pickedLongitude === null) {
      nextErrors.map = 'Please pick a point on the map';
    }

    if (!Number.isFinite(numericCapacity) || numericCapacity <= 0) {
      nextErrors.capacity = 'Capacity must be greater than 0';
    }

    if (paymentModel === 'Paid' && (!Number.isFinite(numericPrice) || numericPrice <= 0)) {
      nextErrors.price = 'Ticket price must be greater than 0';
    }

    setErrors(nextErrors);

    return {
      valid: Object.keys(nextErrors).length === 0,
      start: startTime,
      end: endTime,
      capacity: numericCapacity,
      price: numericPrice,
      location: trimmedLocation,
      latitude: pickedLatitude,
      longitude: pickedLongitude,
    };
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an event.');
      return;
    }

    const result = validate();
    if (
      !result.valid ||
      !result.start ||
      !result.end ||
      result.latitude === null ||
      result.longitude === null
    ) {
      return;
    }

    try {
      setSubmitting(true);

      const { data: insertedEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          organizer_user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          cover_image_url: null,
          start_datetime: result.start.toISOString(),
          end_datetime: result.end.toISOString(),
          location_text: result.location,
          latitude: result.latitude,
          longitude: result.longitude,
          max_participants: result.capacity,
          pricing_model: paymentModel === 'Paid' ? 'paid' : 'free',
          ticket_price: paymentModel === 'Paid' ? result.price : null,
          status: 'published',
        })
        .select('event_id')
        .single();

      if (eventError) throw eventError;
      if (!insertedEvent) throw new Error('Event was not created');

      if (selectedTagIds.length > 0) {
        const rows = selectedTagIds.map((tagId) => ({
          event_id: insertedEvent.event_id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase.from('event_tags').insert(rows);
        if (tagsError) throw tagsError;
      }

      Alert.alert(
        'Event created',
        coverUri
          ? 'Your event has been created. Cover upload preview is local only for now.'
          : 'Your event has been created successfully.'
      );

      router.replace({
        pathname: '/events/[id]',
        params: { id: String(insertedEvent.event_id) },
      });
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'The event could not be created. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.screen }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader title="Create Event" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={pickCover}
            accessibilityRole="button"
            accessibilityLabel="Add cover image"
            style={({ pressed }) => [
              styles.coverPicker,
              { backgroundColor: palette.softAccent, borderColor: palette.mutedBorder },
              pressed && styles.pressed,
            ]}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={30} color={colors.primary} />
                <Text style={[styles.coverTitle, { color: colors.primary }]}>Add Cover Image</Text>
                <Text style={[styles.coverSubcopy, { color: colors.textMuted }]}>
                  Recommended size: 1200 x 675 px
                </Text>
              </View>
            )}
          </Pressable>

          <View style={[styles.section, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Information</Text>

            <Field label="Event Title" error={errors.title} required>
              <Input
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  setErrors((current) => ({ ...current, title: undefined }));
                }}
                placeholder="e.g. Morning Yoga in the Park"
                error={errors.title}
              />
            </Field>

            <Field label="Description" error={errors.description} required>
              <Input
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setErrors((current) => ({ ...current, description: undefined }));
                }}
                placeholder="Tell us more about your event..."
                multiline
                textAlignVertical="top"
                style={styles.textArea}
                error={errors.description}
              />
            </Field>
          </View>

          <View style={[styles.section, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Tags</Text>

            {loadingTags ? (
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Loading tags...</Text>
            ) : availableTags.length === 0 ? (
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>No tags available yet.</Text>
            ) : (
              <>
                <View style={styles.tagWrap}>
                  {visibleTags.map((tag) => {
                    const active = selectedTagIds.includes(tag.tag_id);

                    return (
                      <Pressable
                        key={tag.tag_id}
                        onPress={() => toggleTag(tag.tag_id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={({ pressed }) => [
                          styles.tag,
                          { backgroundColor: palette.chip, borderColor: colors.border },
                          active && { backgroundColor: colors.primary, borderColor: colors.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: colors.textMuted },
                            active && styles.tagTextActive,
                          ]}
                        >
                          {tag.name}
                        </Text>
                      </Pressable>
                    );
                  })}

                  {availableTags.length > 6 ? (
                    <Pressable
                      onPress={() => setShowMoreTags((value) => !value)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.tag,
                        { backgroundColor: palette.chip, borderColor: colors.border },
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.tagText, { color: colors.textMuted }]}>
                        {showMoreTags ? 'Less' : '+ More'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {errors.tags ? (
                  <Text style={[styles.error, { color: colors.error }]}>{errors.tags}</Text>
                ) : null}
              </>
            )}
          </View>

          <View style={[styles.section, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>

            <Field label="Start Time" error={errors.start} required>
              <DateTimeField
                value={startTime}
                onChange={(value) => {
                  setStartTime(value);
                  if (endTime && endTime <= value) {
                    const nextEnd = new Date(value);
                    nextEnd.setHours(nextEnd.getHours() + 1);
                    setEndTime(nextEnd);
                  }
                  setErrors((current) => ({ ...current, start: undefined }));
                }}
                placeholder="Select start date and time"
                minimumDate={new Date()}
                error={errors.start}
              />
            </Field>

            <Field label="End Time" error={errors.end} required>
              <DateTimeField
                value={endTime}
                onChange={(value) => {
                  setEndTime(value);
                  setErrors((current) => ({ ...current, end: undefined }));
                }}
                placeholder="Select end date and time"
                minimumDate={startTime ?? new Date()}
                error={errors.end}
              />
            </Field>
          </View>

          <View style={[styles.section, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>

            <Field label="Address" error={errors.location} required>
              <Input
                value={locationQuery}
                onChangeText={(value) => {
                  setLocationQuery(value);
                  setErrors((current) => ({ ...current, location: undefined }));
                }}
                placeholder="Enter event address..."
                error={errors.location}
                leftElement={
                  <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                }
              />
            </Field>

            <Field label="Map Picker" error={errors.map} required>
              <View style={styles.mapSection}>
                <View style={[styles.regionControl, { backgroundColor: palette.softCard, borderColor: colors.border }]}>
                  {(['romania', 'world'] as const).map((option) => {
                    const active = option === mapRegion;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => setMapRegion(option)}
                        style={({ pressed }) => [
                          styles.regionButton,
                          active && { backgroundColor: colors.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.regionText, { color: active ? '#FFFFFF' : colors.textMuted }]}>
                          {REGIONS[option].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View
                  style={[styles.mapCanvas, { borderColor: colors.border }]}
                  onLayout={handleMapLayout}
                >
                  {tiles.map((tile) => (
                    <View
                      key={tile.key}
                      pointerEvents="none"
                      style={[
                        styles.mapTile,
                        {
                          left: tile.left,
                          top: tile.top,
                        },
                      ]}
                    >
                      <Image source={{ uri: tileUrl(mapZoom, tile.x, tile.y) }} style={styles.mapTileImage} />
                    </View>
                  ))}

                  <Pressable style={styles.mapTapLayer} onPress={handleMapPress} />

                  {pickedMarkerPosition ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.selectedMarker,
                        {
                          left: pickedMarkerPosition.left - 16,
                          top: pickedMarkerPosition.top - 32,
                        },
                      ]}
                    >
                      <Ionicons name="location" size={32} color={colors.primary} />
                    </View>
                  ) : null}

                  <View style={styles.mapControls}>
                    <Pressable
                      onPress={() => setMapZoom((value) => clamp(value + 1, MIN_ZOOM, MAX_ZOOM))}
                      style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </Pressable>

                    <Pressable
                      onPress={() => setMapZoom((value) => clamp(value - 1, MIN_ZOOM, MAX_ZOOM))}
                      style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                <Text style={[styles.mapHint, { color: colors.textMuted }]}>
                  Tap on the map to place the event location.
                </Text>

                {pickedLatitude !== null && pickedLongitude !== null ? (
                  <View style={[styles.coordinatesBox, { backgroundColor: palette.softCard, borderColor: colors.border }]}>
                    <Text style={[styles.coordinatesText, { color: colors.text }]}>
                      Latitude: {pickedLatitude.toFixed(6)}
                    </Text>
                    <Text style={[styles.coordinatesText, { color: colors.text }]}>
                      Longitude: {pickedLongitude.toFixed(6)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Field>
          </View>

          <View style={[styles.controlCard, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <View>
              <Text style={[styles.controlTitle, { color: colors.text }]}>Capacity</Text>
              <Text style={[styles.controlSubtitle, { color: colors.textMuted }]}>Limit attendees</Text>
              {errors.capacity ? (
                <Text style={[styles.error, { color: colors.error }]}>{errors.capacity}</Text>
              ) : null}
            </View>

            <View style={styles.stepper}>
              <Pressable
                onPress={() =>
                  setCapacity((value) => String(Math.max(0, (Number.parseInt(value, 10) || 0) - 1)))
                }
                accessibilityRole="button"
                accessibilityLabel="Decrease capacity"
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: palette.stepper },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </Pressable>

              <Input
                value={capacity}
                onChangeText={(value) => {
                  setCapacity(value.replace(/[^0-9]/g, ''));
                  setErrors((current) => ({ ...current, capacity: undefined }));
                }}
                keyboardType="number-pad"
                placeholder="25"
                error={errors.capacity}
                style={styles.capacityInput}
              />

              <Pressable
                onPress={() =>
                  setCapacity((value) => String((Number.parseInt(value, 10) || 0) + 1))
                }
                accessibilityRole="button"
                accessibilityLabel="Increase capacity"
                style={({ pressed }) => [
                  styles.stepButton,
                  { backgroundColor: palette.stepper },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: palette.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pricing Model</Text>
            <Text style={[styles.sectionHint, { color: colors.textMuted }]}>Entry fee</Text>

            <View style={[styles.segmented, { backgroundColor: palette.softCard }]}>
              {(['Free', 'Paid'] as const).map((option) => {
                const active = paymentModel === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setPaymentModel(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.segment,
                      active && { backgroundColor: colors.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: colors.textMuted },
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {paymentModel === 'Paid' ? (
              <Field label="Ticket Price" error={errors.price}>
                <Input
                  value={price}
                  onChangeText={(value) => {
                    setPrice(value.replace(/[^0-9.]/g, ''));
                    setErrors((current) => ({ ...current, price: undefined }));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="25"
                  error={errors.price}
                  leftElement={<Text style={styles.currencyPrefix}>$</Text>}
                />
              </Field>
            ) : null}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              pressed && styles.pressed,
              submitting && styles.disabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Creating...' : 'Set Up Event'}
            </Text>
          </Pressable>

          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By creating this event, you agree to our{' '}
            <Text
              style={[styles.linkText, { color: colors.primary }]}
              onPress={() => Alert.alert('Community Guidelines')}
            >
              Community Guidelines
            </Text>{' '}
            and{' '}
            <Text
              style={[styles.linkText, { color: colors.primary }]}
              onPress={() => Alert.alert('Terms of Service')}
            >
              Terms of Service
            </Text>
            .
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}
        {required ? <Text style={{ color: colors.error }}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  coverPicker: {
    height: 190,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: '#EEF0FF',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  coverTitle: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  coverSubcopy: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
  },
  section: {
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
  },
  sectionHint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  field: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 118,
    paddingTop: theme.spacing.md,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  tagText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  mapSection: {
    gap: theme.spacing.sm,
  },
  regionControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  regionButton: {
    flex: 1,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  mapCanvas: {
    height: 240,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#BFD9DF',
  },
  mapTile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapTileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapTapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedMarker: {
    position: 'absolute',
    zIndex: 5,
  },
  mapControls: {
    position: 'absolute',
    right: theme.spacing.sm,
    top: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  mapControlButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  mapHint: {
    fontSize: theme.fontSize.sm,
  },
  coordinatesBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  coordinatesText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  controlCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  controlTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  controlSubtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  stepButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0FF',
  },
  capacityInput: {
    width: 84,
    paddingHorizontal: theme.spacing.sm,
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  currencyPrefix: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  submitButton: {
    height: 54,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.md,
    fontWeight: '900',
  },
  termsText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  error: {
    color: theme.colors.error,
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});