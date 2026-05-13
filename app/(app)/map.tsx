import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../src/lib/supabase';
import { Select } from '../../src/ui/Select';
import { theme, useThemeColors } from '../../src/ui/theme';

type ViewMode = 'map' | 'list';
type MapRegion = 'romania' | 'world';
type DateFilter = 'all' | 'today' | 'this_week' | 'this_month';
type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

type EventRow = {
  event_id: number;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_datetime: string;
  end_datetime: string;
  location_text: string;
  latitude: number | null;
  longitude: number | null;
  max_participants: number;
  pricing_model: string;
  ticket_price: number | null;
  status: string;
};

type EventTagJoinRow = {
  event_id: number;
  tag_id: number;
};

type TagRow = {
  tag_id: number;
  name: string;
};

type BookingRow = {
  event_id: number;
  booking_status: string;
};

type EventItem = {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  startsAt: string;
  venue: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  attendees: number;
  paymentModel: 'Free' | 'Paid';
  price: number;
  tags: string[];
  isPopular: boolean;
  coordinateLabel: string;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 14;

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
] as const;

const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'All day' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
] as const;

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

function wrapLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function tileUrl(zoom: number, x: number, y: number) {
  const max = 2 ** zoom;
  const wrappedX = ((x % max) + max) % max;
  const clampedY = Math.max(0, Math.min(max - 1, y));
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

function formatCompactDate(startsAt: string) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(startsAt));
}

function isDateMatch(date: Date, filter: DateFilter) {
  if (filter === 'all') return true;

  const now = new Date();

  if (filter === 'today') {
    return date.toDateString() === now.toDateString();
  }

  if (filter === 'this_week') {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return date >= start && date < end;
  }

  if (filter === 'this_month') {
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }

  return true;
}

function isTimeMatch(date: Date, filter: TimeFilter) {
  if (filter === 'all') return true;

  const hour = date.getHours();

  if (filter === 'morning') return hour >= 6 && hour < 12;
  if (filter === 'afternoon') return hour >= 12 && hour < 18;
  if (filter === 'evening') return hour >= 18 || hour < 1;

  return true;
}

export default function ExploreMap() {
  const router = useRouter();
  const colors = useThemeColors();

  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [region, setRegion] = useState<MapRegion>('romania');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);

      const [
        eventsResult,
        tagsResult,
        eventTagsResult,
        bookingsResult,
      ] = await Promise.all([
        supabase
          .from('events')
          .select(
            `
            event_id,
            title,
            description,
            cover_image_url,
            start_datetime,
            end_datetime,
            location_text,
            latitude,
            longitude,
            max_participants,
            pricing_model,
            ticket_price,
            status
          `
          )
          .eq('status', 'published')
          .order('start_datetime', { ascending: true }),

        supabase
          .from('tags')
          .select('tag_id, name')
          .order('name', { ascending: true }),

        supabase
          .from('event_tags')
          .select('event_id, tag_id'),

        supabase
          .from('bookings')
          .select('event_id, booking_status')
          .in('booking_status', ['pending', 'confirmed']),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (tagsResult.error) throw tagsResult.error;
      if (eventTagsResult.error) throw eventTagsResult.error;
      if (bookingsResult.error) throw bookingsResult.error;

      const eventRows = (eventsResult.data ?? []) as EventRow[];
      const tagRows = (tagsResult.data ?? []) as TagRow[];
      const eventTagRows = (eventTagsResult.data ?? []) as EventTagJoinRow[];
      const bookingRows = (bookingsResult.data ?? []) as BookingRow[];

      const tagMap = new Map(tagRows.map((tag) => [tag.tag_id, tag.name]));

      const tagsByEventId = new Map<number, string[]>();
      for (const row of eventTagRows) {
        const tagName = tagMap.get(row.tag_id);
        if (!tagName) continue;
        tagsByEventId.set(row.event_id, [...(tagsByEventId.get(row.event_id) ?? []), tagName]);
      }

      const attendeesByEventId = new Map<number, number>();
      for (const booking of bookingRows) {
        attendeesByEventId.set(
          booking.event_id,
          (attendeesByEventId.get(booking.event_id) ?? 0) + 1
        );
      }

      const mapped: EventItem[] = eventRows.map((event) => {
        const attendees = attendeesByEventId.get(event.event_id) ?? 0;
        return {
          id: event.event_id,
          title: event.title,
          description: event.description,
          imageUrl: event.cover_image_url,
          startsAt: event.start_datetime,
          venue: event.location_text,
          latitude: event.latitude,
          longitude: event.longitude,
          capacity: event.max_participants,
          attendees,
          paymentModel: event.pricing_model === 'paid' ? 'Paid' : 'Free',
          price: event.ticket_price ?? 0,
          tags: tagsByEventId.get(event.event_id) ?? [],
          isPopular: attendees >= 5,
          coordinateLabel: event.location_text,
        };
      });

      setEvents(mapped);
      setAvailableTags(tagRows.map((tag) => tag.name));
    } catch (error) {
      console.error(error);
      setEvents([]);
      setAvailableTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      const startsAt = new Date(event.startsAt);

      const dateOk = isDateMatch(startsAt, dateFilter);
      const timeOk = isTimeMatch(startsAt, timeFilter);
      const tagsOk =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => event.tags.includes(tag));

      return dateOk && timeOk && tagsOk;
    });
  }, [dateFilter, events, selectedTags, timeFilter]);

  const selectedEvent =
    selectedEventId !== null
      ? visibleEvents.find((event) => event.id === selectedEventId) ?? null
      : null;

  const openEvent = (event: EventItem) => {
    router.push({
      pathname: '/events/[id]',
      params: { id: String(event.id) },
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
    setSelectedEventId(null);
  };

  const handlePopular = () => {
    const firstPopular = visibleEvents.find((event) => event.isPopular) ?? visibleEvents[0];
    if (firstPopular) setSelectedEventId(firstPopular.id);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Explore Events</Text>
        <Pressable
          onPress={() => setViewMode((mode) => (mode === 'map' ? 'list' : 'map'))}
          accessibilityRole="button"
          accessibilityLabel={viewMode === 'map' ? 'Switch to list view' : 'Switch to map view'}
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={viewMode === 'map' ? 'list-outline' : 'map-outline'}
            size={22}
            color={colors.primary}
          />
        </Pressable>
      </View>

      <View style={[styles.filters, { backgroundColor: colors.background }]}>
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <Select<DateFilter>
              value={dateFilter}
              onChange={(value) => {
                setDateFilter(value);
                setSelectedEventId(null);
              }}
              options={DATE_FILTER_OPTIONS}
              title="Date"
            />
          </View>

          <View style={styles.filterField}>
            <Select<TimeFilter>
              value={timeFilter}
              onChange={(value) => {
                setTimeFilter(value);
                setSelectedEventId(null);
              }}
              options={TIME_FILTER_OPTIONS}
              title="Time"
            />
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagScroller}
        >
          {availableTags.map((tag) => {
            const active = selectedTags.includes(tag);

            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.filterTag,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                  active && styles.filterTagActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.filterTagText,
                    { color: active ? '#FFFFFF' : colors.text },
                    active && styles.filterTagTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {viewMode === 'map' ? (
        <MapView
          events={visibleEvents}
          region={region}
          selectedEvent={selectedEvent}
          onSelect={(event) => setSelectedEventId(event.id)}
          onClose={() => setSelectedEventId(null)}
          onOpen={openEvent}
          onPopular={handlePopular}
          onRegionChange={setRegion}
          loading={loading}
        />
      ) : (
        <ListView events={visibleEvents} onOpen={openEvent} loading={loading} />
      )}
    </SafeAreaView>
  );
}

function MapView({
  events,
  region,
  selectedEvent,
  onSelect,
  onClose,
  onOpen,
  onPopular,
  onRegionChange,
  loading,
}: {
  events: EventItem[];
  region: MapRegion;
  selectedEvent: EventItem | null;
  onSelect: (event: EventItem) => void;
  onClose: () => void;
  onOpen: (event: EventItem) => void;
  onPopular: () => void;
  onRegionChange: (region: MapRegion) => void;
  loading: boolean;
}) {
  const colors = useThemeColors();
  const isDark = colors.background === '#0F172A';

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(REGIONS[region].zoom);
  const [, forceUpdate] = useState(0);

  const centerRef = useRef({
    latitude: REGIONS[region].latitude,
    longitude: REGIONS[region].longitude,
  });

  const panStartRef = useRef<{ lastDx: number; lastDy: number } | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    centerRef.current = {
      latitude: REGIONS[region].latitude,
      longitude: REGIONS[region].longitude,
    };
    setZoom(REGIONS[region].zoom);
    forceUpdate((n) => n + 1);
  }, [region]);

  const center = centerRef.current;
  const mapWidth = mapSize.width || 360;
  const mapHeight = mapSize.height || 420;
  const centerTileX = lonToTileX(center.longitude, zoom);
  const centerTileY = latToTileY(center.latitude, zoom);

  const tiles = useMemo(() => {
    const halfColumns = Math.ceil(mapWidth / TILE_SIZE / 2) + 2;
    const halfRows = Math.ceil(mapHeight / TILE_SIZE / 2) + 2;
    const baseX = Math.floor(centerTileX);
    const baseY = Math.floor(centerTileY);
    const maxY = 2 ** zoom - 1;
    const nextTiles: { key: string; x: number; y: number; left: number; top: number }[] = [];

    for (let y = baseY - halfRows; y <= baseY + halfRows; y += 1) {
      if (y < 0 || y > maxY) continue;
      for (let x = baseX - halfColumns; x <= baseX + halfColumns; x += 1) {
        nextTiles.push({
          key: `${zoom}-${x}-${y}`,
          x,
          y,
          left: mapWidth / 2 + (x - centerTileX) * TILE_SIZE,
          top: mapHeight / 2 + (y - centerTileY) * TILE_SIZE,
        });
      }
    }

    return nextTiles;
  }, [centerTileX, centerTileY, mapHeight, mapWidth, zoom]);

  const pinchRef = useRef<{ lastDist: number } | null>(null);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          panStartRef.current = { lastDx: 0, lastDy: 0 };
          pinchRef.current = null;
        },
        onPanResponderMove: (event, gestureState) => {
          if (!panStartRef.current) return;

          const touches = event.nativeEvent.touches;

          if (touches && touches.length === 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (pinchRef.current !== null) {
              const ratio = dist / pinchRef.current.lastDist;
              const z = zoomRef.current;
              const nextZoom = clamp(Math.round(z + Math.log2(ratio) * 2), MIN_ZOOM, MAX_ZOOM);
              if (nextZoom !== z) {
                zoomRef.current = nextZoom;
                setZoom(nextZoom);
              }
            }

            pinchRef.current = { lastDist: dist };
            panStartRef.current = { lastDx: gestureState.dx, lastDy: gestureState.dy };
            return;
          }

          pinchRef.current = null;

          const deltaX = gestureState.dx - panStartRef.current.lastDx;
          const deltaY = gestureState.dy - panStartRef.current.lastDy;
          panStartRef.current.lastDx = gestureState.dx;
          panStartRef.current.lastDy = gestureState.dy;

          const z = zoomRef.current;
          const currentTileX = lonToTileX(centerRef.current.longitude, z);
          const currentTileY = latToTileY(centerRef.current.latitude, z);
          const nextTileX = currentTileX - deltaX / TILE_SIZE;
          const nextTileY = clamp(currentTileY - deltaY / TILE_SIZE, 0.0001, 2 ** z - 0.0001);

          centerRef.current = {
            latitude: clamp(tileYToLat(nextTileY, z), -85, 85),
            longitude: wrapLongitude(tileXToLon(nextTileX, z)),
          };
          forceUpdate((n) => n + 1);
        },
        onPanResponderRelease: () => {
          panStartRef.current = null;
          pinchRef.current = null;
        },
        onPanResponderTerminate: () => {
          panStartRef.current = null;
          pinchRef.current = null;
        },
      }),
    []
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  const handleRegionChange = (nextRegion: MapRegion) => {
    onRegionChange(nextRegion);
    onClose();
  };

  const handleRecenter = () => {
    centerRef.current = {
      latitude: REGIONS[region].latitude,
      longitude: REGIONS[region].longitude,
    };
    setZoom(REGIONS[region].zoom);
    forceUpdate((n) => n + 1);
  };

  const handleZoom = (step: number) => {
    setZoom((value) => clamp(value + step, MIN_ZOOM, MAX_ZOOM));
  };

  const markerPosition = (event: EventItem) => {
    if (event.latitude === null || event.longitude === null) {
      return { left: 0, top: 0, visible: false };
    }

    const left = mapWidth / 2 + (lonToTileX(event.longitude, zoom) - centerTileX) * TILE_SIZE;
    const top = mapHeight / 2 + (latToTileY(event.latitude, zoom) - centerTileY) * TILE_SIZE;
    const visible = left > -170 && left < mapWidth + 70 && top > -70 && top < mapHeight + 80;

    return { left, top, visible };
  };

  const visibleMarkers = events
    .map((event) => ({ event, position: markerPosition(event) }))
    .filter((item) => item.position.visible);

  return (
    <View style={styles.mapWrap}>
      <View
        style={[
          styles.mapCanvas,
          {
            backgroundColor: isDark ? '#0F172A' : '#BFD9DF',
            borderColor: colors.border,
          },
        ]}
        onLayout={handleLayout}
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
            <Image source={{ uri: tileUrl(zoom, tile.x, tile.y) }} style={styles.mapTileImage} />
          </View>
        ))}

        <View
          style={[
            styles.mapSoftOverlay,
            {
              backgroundColor: isDark
                ? 'rgba(15,23,42,0.12)'
                : 'rgba(255,255,255,0.04)',
            },
          ]}
          pointerEvents="none"
        />

        <View style={[styles.dragLayer, { touchAction: 'none' } as any]} {...panResponder.panHandlers} />

        <View
          style={[
            styles.regionControl,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {(['romania', 'world'] as const).map((option) => {
            const active = option === region;

            return (
              <Pressable
                key={option}
                onPress={() => handleRegionChange(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
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

        <View style={styles.mapControls}>
          <Pressable
            onPress={() => handleZoom(1)}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            style={({ pressed }) => [
              styles.mapControlButton,
              { backgroundColor: colors.background, borderColor: colors.border },
              zoom === MAX_ZOOM && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </Pressable>

          <View style={styles.zoomBadge}>
            <Text style={styles.zoomText}>{zoom}</Text>
          </View>

          <Pressable
            onPress={() => handleZoom(-1)}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            style={({ pressed }) => [
              styles.mapControlButton,
              { backgroundColor: colors.background, borderColor: colors.border },
              zoom === MIN_ZOOM && styles.disabledControl,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="remove" size={22} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel="Recenter map"
            style={({ pressed }) => [
              styles.mapControlButton,
              { backgroundColor: colors.background, borderColor: colors.border },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="locate-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <Pressable
          onPress={onPopular}
          accessibilityRole="button"
          style={({ pressed }) => [styles.popularButton, pressed && styles.pressed]}
        >
          <Ionicons name="flame-outline" size={17} color="#FFFFFF" />
          <Text style={styles.popularButtonText}>Popular</Text>
        </Pressable>

        <View
          style={[
            styles.mapAttribution,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={styles.mapAttributionText}>OpenStreetMap</Text>
        </View>

        {visibleMarkers.map(({ event, position }) => (
          <Pressable
            key={event.id}
            onPress={() => onSelect(event)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${event.title}`}
            style={({ pressed }) => [
              styles.marker,
              {
                left: position.left,
                top: position.top,
                backgroundColor:
                  selectedEvent?.id === event.id ? colors.primary : colors.background,
                borderColor:
                  selectedEvent?.id === event.id ? colors.background : colors.primary,
              },
              selectedEvent?.id === event.id && styles.markerActive,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.markerDot,
                selectedEvent?.id === event.id && styles.markerDotActive,
              ]}
            >
              <Ionicons
                name={event.paymentModel === 'Paid' ? 'ticket-outline' : 'sparkles-outline'}
                size={13}
                color={selectedEvent?.id === event.id ? theme.colors.primary : '#FFFFFF'}
              />
            </View>

            <Text
              style={[
                styles.markerText,
                selectedEvent?.id === event.id && styles.markerTextActive,
              ]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
          </Pressable>
        ))}

        {loading ? (
          <View style={styles.emptyMap}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyMap}>
            <Ionicons name="search-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No events found</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Try another date, time, or tag.
            </Text>
          </View>
        ) : visibleMarkers.length === 0 ? (
          <View style={styles.emptyMap}>
            <Ionicons name="location-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No map coordinates</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              These events exist, but they do not have latitude and longitude yet.
            </Text>
          </View>
        ) : null}
      </View>

      {selectedEvent ? (
        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.previewHeader}>
            <TagPills tags={selectedEvent.tags} />
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close event preview"
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <EventPreviewCard event={selectedEvent} onPress={() => onOpen(selectedEvent)} />

          <View style={styles.locationReference}>
            <Ionicons name="navigate-outline" size={16} color={colors.primary} />
            <Text style={styles.locationReferenceText}>{selectedEvent.coordinateLabel}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ListView({
  events,
  onOpen,
  loading,
}: {
  events: EventItem[];
  onOpen: (event: EventItem) => void;
  loading: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading events...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-clear-outline" size={28} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No events found</Text>
          <Text style={styles.emptyText}>Try another date, time, or tag.</Text>
        </View>
      ) : (
        events.map((event) => (
          <EventPreviewCard key={event.id} event={event} onPress={() => onOpen(event)} />
        ))
      )}
    </ScrollView>
  );
}

function EventPreviewCard({
  event,
  onPress,
}: {
  event: EventItem;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="image-outline" size={28} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.cardBody}>
        <TagPills tags={event.tags} />
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          {formatCompactDate(event.startsAt)}
        </Text>
        <Text style={[styles.cardVenue, { color: colors.primary }]} numberOfLines={1}>
          {event.venue}
        </Text>
        <Text style={[styles.cardDescription, { color: colors.textMuted }]} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            {event.attendees}/{event.capacity} going
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
            {event.paymentModel === 'Paid' ? `${event.price} RON` : 'Free'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  const colors = useThemeColors();

  if (tags.length === 0) return null;

  return (
    <View style={styles.pillsWrap}>
      {tags.slice(0, 3).map((tag) => (
        <View key={tag} style={[styles.pill, { backgroundColor: '#EEF0FF' }]}>
          <Text style={[styles.pillText, { color: colors.primary }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xl,
    fontWeight: '800',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  filters: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  filterField: {
    flex: 1,
  },
  tagScroller: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  filterTag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  filterTagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterTagText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  filterTagTextActive: {
    color: '#FFFFFF',
  },
  mapWrap: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  regionControl: {
    position: 'absolute',
    left: theme.spacing.md,
    top: theme.spacing.md,
    zIndex: 5,
    flexDirection: 'row',
    padding: 4,
    borderRadius: theme.radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  regionButton: {
    minWidth: 84,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
  },
  regionText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  mapCanvas: {
    flex: 1,
    minHeight: 420,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#BFD9DF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  mapTile: {
    position: 'absolute',
    zIndex: 0,
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapTileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapSoftOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dragLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  mapControls: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
    zIndex: 6,
    alignItems: 'center',
    gap: 7,
  },
  mapControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  disabledControl: {
    opacity: 0.5,
  },
  zoomBadge: {
    minWidth: 34,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.82)',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.xs,
    fontWeight: '900',
  },
  mapAttribution: {
    position: 'absolute',
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    zIndex: 5,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  mapAttributionText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  marker: {
    position: 'absolute',
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 158,
    borderRadius: theme.radius.full,
    paddingLeft: 4,
    paddingRight: theme.spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  markerActive: {
    zIndex: 7,
    backgroundColor: theme.colors.primary,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.03 }],
  },
  markerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  markerDotActive: {
    backgroundColor: '#FFFFFF',
  },
  markerText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
  markerTextActive: {
    color: '#FFFFFF',
  },
  popularButton: {
    position: 'absolute',
    left: theme.spacing.md,
    top: 62,
    zIndex: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  popularButtonText: {
    color: '#FFFFFF',
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
  },
  previewCard: {
    position: 'absolute',
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
    bottom: theme.spacing.xl,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: '#FFFFFF',
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  locationReference: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  locationReferenceText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyMap: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    top: '38%',
    zIndex: 5,
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
  },
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  cardDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  cardVenue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  cardMeta: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  pill: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '800',
  },
});