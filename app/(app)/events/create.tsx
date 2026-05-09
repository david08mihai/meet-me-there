import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  CATEGORY_TAGS,
  LOCATION_SUGGESTIONS,
  PaymentModel,
  createEvent,
} from '../../../src/lib/mockEvents';
import { DateTimeField } from '../../../src/ui/DateTimeField';
import { Input } from '../../../src/ui/Input';
import { ScreenHeader } from '../../../src/ui/ScreenHeader';
import { theme } from '../../../src/ui/theme';

type Errors = Partial<Record<
  | 'title'
  | 'description'
  | 'tags'
  | 'start'
  | 'end'
  | 'location'
  | 'capacity'
  | 'price',
  string
>>;

const ACCEPTED_IMAGE = /\.(jpg|jpeg|png)$/i;

export default function CreateEvent() {
  const router = useRouter();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [capacity, setCapacity] = useState('25');
  const [paymentModel, setPaymentModel] = useState<PaymentModel>('Free');
  const [price, setPrice] = useState('25');
  const [errors, setErrors] = useState<Errors>({});

  const visibleTags = showMoreTags ? CATEGORY_TAGS : CATEGORY_TAGS.slice(0, 4);
  const locationMatches = LOCATION_SUGGESTIONS.filter((location) =>
    location.label.toLowerCase().includes(locationQuery.trim().toLowerCase()),
  ).slice(0, 4);

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

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
    setErrors((current) => ({ ...current, tags: undefined }));
  };

  const validate = () => {
    const nextErrors: Errors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const now = new Date();
    const numericCapacity = Number.parseInt(capacity, 10);
    const numericPrice = Number(price);

    if (!trimmedTitle) nextErrors.title = 'Event title is required';
    else if (trimmedTitle.length < 3) nextErrors.title = 'Event title is too short';
    else if (trimmedTitle.length > 100) nextErrors.title = 'Event title is too long';

    if (!trimmedDescription) nextErrors.description = 'Description is required';
    else if (trimmedDescription.length > 1000) nextErrors.description = 'Description is too long';

    if (selectedTags.length === 0) nextErrors.tags = 'Please select at least one category tag';

    if (!startTime) nextErrors.start = 'Start time is required';
    else if (startTime <= now) nextErrors.start = 'Please select a future start date and time';

    if (!endTime) nextErrors.end = 'End time is required';
    else if (startTime && endTime <= startTime) nextErrors.end = 'End time must be later than start time';

    if (!selectedLocation) nextErrors.location = 'Location is required';
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
    };
  };

  const handleSubmit = () => {
    const result = validate();
    if (!result.valid || !result.start || !result.end) return;

    try {
      const event = createEvent({
        title,
        description,
        tags: selectedTags,
        startsAt: result.start,
        endsAt: result.end,
        venue: selectedLocation ?? locationQuery,
        imageUrl: coverUri,
        capacity: result.capacity,
        paymentModel,
        price: result.price,
      });

      Alert.alert('Event created', 'Your event has been set up successfully.');
      router.replace({ pathname: '/events/[id]', params: { id: event.id } });
    } catch {
      Alert.alert('Error', 'The event could not be created. Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
            style={({ pressed }) => [styles.coverPicker, pressed && styles.pressed]}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={30} color={theme.colors.primary} />
                <Text style={styles.coverTitle}>Add Cover Image</Text>
                <Text style={styles.coverSubcopy}>Recommended size: 1200 x 675 px</Text>
              </View>
            )}
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Event Information</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Tags</Text>
            <View style={styles.tagWrap}>
              {visibleTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.tag,
                      active && styles.tagActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowMoreTags((value) => !value)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
              >
                <Text style={styles.tagText}>{showMoreTags ? 'Less' : '+ More'}</Text>
              </Pressable>
            </View>
            {errors.tags ? <Text style={styles.error}>{errors.tags}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Field label="Address" error={errors.location} required>
              <Input
                value={locationQuery}
                onChangeText={(value) => {
                  setLocationQuery(value);
                  setSelectedLocation(null);
                  setErrors((current) => ({ ...current, location: undefined }));
                }}
                placeholder="Search address..."
                error={errors.location}
                leftElement={
                  <Ionicons name="search-outline" size={18} color={theme.colors.textMuted} />
                }
              />
            </Field>
            {locationQuery.trim().length > 0 && !selectedLocation ? (
              <View style={styles.suggestionBox}>
                {locationMatches.map((location) => (
                  <Pressable
                    key={location.label}
                    onPress={() => {
                      setSelectedLocation(location.label);
                      setLocationQuery(location.label);
                    }}
                    style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                  >
                    <Ionicons name="location-outline" size={17} color={theme.colors.primary} />
                    <Text style={styles.suggestionText}>{location.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.controlCard}>
            <View>
              <Text style={styles.controlTitle}>Capacity</Text>
              <Text style={styles.controlSubtitle}>Limit attendees</Text>
              {errors.capacity ? <Text style={styles.error}>{errors.capacity}</Text> : null}
            </View>
            <View style={styles.stepper}>
              <Pressable
                onPress={() =>
                  setCapacity((value) => String(Math.max(0, (Number.parseInt(value, 10) || 0) - 1)))
                }
                accessibilityRole="button"
                accessibilityLabel="Decrease capacity"
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <Ionicons name="remove" size={20} color={theme.colors.primary} />
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
                style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Model</Text>
            <Text style={styles.sectionHint}>Entry fee</Text>
            <View style={styles.segmented}>
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
                      active && styles.segmentActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
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
            accessibilityRole="button"
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
          >
            <Text style={styles.submitButtonText}>Set Up Event</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By creating this event, you agree to our{' '}
            <Text style={styles.linkText} onPress={() => Alert.alert('Community Guidelines')}>
              Community Guidelines
            </Text>{' '}
            and{' '}
            <Text style={styles.linkText} onPress={() => Alert.alert('Terms of Service')}>
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
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  required: {
    color: theme.colors.error,
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
  tagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tagText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#FFFFFF',
  },
  suggestionBox: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginTop: -theme.spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  suggestionText: {
    flex: 1,
    color: theme.colors.text,
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
    color: theme.colors.text,
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
  segmentActive: {
    backgroundColor: theme.colors.primary,
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
});
