import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EventItem,
  formatEventSchedule,
  formatShortDate,
} from '../lib/mockEvents';
import { theme, useThemeColors } from './theme';

type EventCardProps = {
  event: EventItem;
  onPress?: () => void;
  variant?: 'default' | 'compact' | 'past';
};

export function TagPills({ tags, limit }: { tags: string[]; limit?: number }) {
  const colors = useThemeColors();
  const visible = typeof limit === 'number' ? tags.slice(0, limit) : tags;
  return (
    <View style={styles.tagRow}>
      {visible.map((tag) => (
        <View key={tag} style={[styles.tagPill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }, (_, index) => (
        <Ionicons
          key={index}
          name={index < value ? 'star' : 'star-outline'}
          size={14}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

export function EventCard({ event, onPress, variant = 'default' }: EventCardProps) {
  const colors = useThemeColors();
  const isPast = variant === 'past';
  const isCompact = variant === 'compact';

  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCompact && styles.compactCard,
      ]}
    >
      <Image
        source={{ uri: event.imageUrl }}
        style={[styles.image, isCompact && styles.compactImage]}
      />

      <View style={styles.body}>
        {isPast ? (
          <Text style={[styles.shortDate, { color: colors.primary }]}>{formatShortDate(event.startsAt)}</Text>
        ) : (
          <TagPills tags={event.tags} limit={isCompact ? 2 : 3} />
        )}

        <Text style={[styles.title, { color: colors.text }, isCompact && styles.compactTitle]} numberOfLines={2}>
          {event.title}
        </Text>

        {!isPast ? (
          <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={isCompact ? 2 : 3}>
            {event.shortDescription}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
            {formatEventSchedule(event, !isCompact)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>

        {isPast && event.review ? (
          <View style={[styles.reviewBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.reviewLabel, { color: colors.text }]}>My Review</Text>
            <Stars value={event.review.rating} />
            <Text style={[styles.reviewText, { color: colors.textMuted }]}>{event.review.text}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${event.title}`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  compactCard: {
    flexDirection: 'row',
    borderRadius: theme.radius.lg,
  },
  image: {
    width: '100%',
    height: 156,
  },
  compactImage: {
    width: 116,
    height: 172,
  },
  body: {
    flex: 1,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tagPill: {
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700',
  },
  shortDate: {
    fontSize: theme.fontSize.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800',
  },
  compactTitle: {
    fontSize: theme.fontSize.md,
  },
  description: {
    fontSize: theme.fontSize.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
  },
  reviewBox: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.xs,
  },
  reviewLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: theme.fontSize.sm,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.82,
  },
});
