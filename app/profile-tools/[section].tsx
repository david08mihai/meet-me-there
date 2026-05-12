import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../src/contexts/AuthContext';
import { getLocalProfileEdit, saveLocalProfileEdit } from '../../src/lib/localProfile';
import {
	EventItem,
	deleteEvent,
	getActivityStats,
	getCreatedEvents,
	getReviewedEvents,
} from '../../src/lib/mockEvents';
import { EventCard, Stars } from '../../src/ui/EventCard';
import { Input } from '../../src/ui/Input';
import { ScreenHeader } from '../../src/ui/ScreenHeader';
import { theme } from '../../src/ui/theme';

type SectionKey =
	| 'edit-profile'
	| 'created-events'
	| 'reviews'
	| 'stats'
	| 'achievements'
	| 'about'
	| 'privacy';

const titles: Record<SectionKey, string> = {
	'edit-profile': 'Edit Profile',
	'created-events': 'My Created Events',
	reviews: 'Reviews Received',
	stats: 'Activity Stats',
	achievements: 'Achievements',
	about: 'About',
	privacy: 'Privacy Policy',
};

const firstParam = (value: string | string[] | undefined) =>
	Array.isArray(value) ? value[0] : value;

export default function ProfileToolScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ section?: string }>();
	const section = (firstParam(params.section) ?? 'about') as SectionKey;
	const title = titles[section] ?? 'Profile';

	return (
		<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
			<ScreenHeader title={title} onBack={() => router.back()} />
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{section === 'edit-profile' ? <EditProfile /> : null}
				{section === 'created-events' ? <CreatedEvents /> : null}
				{section === 'reviews' ? <Reviews /> : null}
				{section === 'stats' ? <Stats /> : null}
				{section === 'achievements' ? <Achievements /> : null}
				{section === 'about' ? <About /> : null}
				{section === 'privacy' ? <Privacy /> : null}
			</ScrollView>
		</SafeAreaView>
	);
}

function EditProfile() {
	const { user } = useAuth();
	const [displayName, setDisplayName] = useState(
		(user?.user_metadata?.display_name as string | undefined) ??
			(user?.user_metadata?.full_name as string | undefined) ??
			(user?.user_metadata?.business_name as string | undefined) ??
			'',
	);
	const [location, setLocation] = useState('');
	const [bio, setBio] = useState('');

	useEffect(() => {
		let active = true;

		getLocalProfileEdit().then((profile) => {
			if (!active || !profile) return;
			setDisplayName(profile.displayName);
			setLocation(profile.location);
			setBio(profile.bio);
		});

		return () => {
			active = false;
		};
	}, []);

	const handleSave = async () => {
		await saveLocalProfileEdit({ displayName, location, bio });
		Alert.alert('Profile saved', 'Your local profile details were saved.');
	};

	return (
		<View style={styles.formCard}>
			<Field label="Display Name">
				<Input value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
			</Field>
			<Field label="Location">
				<Input value={location} onChangeText={setLocation} placeholder="Bucharest, Romania" />
			</Field>
			<Field label="Short Bio">
				<Input
					value={bio}
					onChangeText={setBio}
					placeholder="Tell people what kind of events you enjoy"
					multiline
					textAlignVertical="top"
					style={styles.textArea}
				/>
			</Field>
			<PrimaryAction label="Save Profile" icon="save-outline" onPress={handleSave} />
		</View>
	);
}

function CreatedEvents() {
	const [events, setEvents] = useState<EventItem[]>(() => getCreatedEvents());
	const router = useRouter();

	const handleDelete = (event: EventItem) => {
		Alert.alert('Delete Event', `Delete "${event.title}"?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: () => {
					deleteEvent(event.id);
					setEvents(getCreatedEvents());
				},
			},
		]);
	};

	if (events.length === 0) {
		return (
			<EmptyState
				icon="calendar-outline"
				title="No created events"
				text="Events you set up will appear here."
			/>
		);
	}

	return (
		<View style={styles.listStack}>
			{events.map((event) => (
				<View key={event.id} style={styles.eventWithActions}>
					<EventCard
						event={event}
						onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
					/>
					<Pressable
						onPress={() => handleDelete(event)}
						style={({ pressed }) => [styles.destructiveInline, pressed && styles.pressed]}
					>
						<Ionicons name="trash-outline" size={17} color={theme.colors.error} />
						<Text style={styles.destructiveInlineText}>Delete event</Text>
					</Pressable>
				</View>
			))}
		</View>
	);
}

function Reviews() {
	const reviewedEvents = getReviewedEvents();

	if (reviewedEvents.length === 0) {
		return (
			<EmptyState
				icon="star-outline"
				title="No reviews yet"
				text="Reviews from attended events will appear here."
			/>
		);
	}

	return (
		<View style={styles.listStack}>
			{reviewedEvents.map((event) => (
				<View key={event.id} style={styles.infoCard}>
					<Text style={styles.cardTitle}>{event.title}</Text>
					{event.review ? <Stars value={event.review.rating} /> : null}
					<Text style={styles.cardText}>{event.review?.text}</Text>
				</View>
			))}
		</View>
	);
}

function Stats() {
	const stats = getActivityStats();
	const rows = [
		{ label: 'Created Events', value: stats.created, icon: 'calendar-outline' },
		{ label: 'Upcoming Bookings', value: stats.upcomingBookings, icon: 'ticket-outline' },
		{ label: 'Attended Events', value: stats.attended, icon: 'checkmark-done-outline' },
		{ label: 'Reviews', value: stats.reviews, icon: 'star-outline' },
	] as const;

	return (
		<View style={styles.statsGrid}>
			{rows.map((row) => (
				<View key={row.label} style={styles.statCard}>
					<Ionicons name={row.icon} size={22} color={theme.colors.primary} />
					<Text style={styles.statValue}>{row.value}</Text>
					<Text style={styles.statLabel}>{row.label}</Text>
				</View>
			))}
		</View>
	);
}

function Achievements() {
	const stats = getActivityStats();
	const achievements = [
		{
			title: 'First Host',
			text: stats.created > 0 ? 'Unlocked by creating your first event.' : 'Create an event to unlock.',
			unlocked: stats.created > 0,
		},
		{
			title: 'Explorer',
			text:
				stats.upcomingBookings + stats.attended > 0
					? 'Unlocked by joining an event.'
					: 'Join an event to unlock.',
			unlocked: stats.upcomingBookings + stats.attended > 0,
		},
		{
			title: 'Community Voice',
			text: stats.reviews > 0 ? 'Unlocked by receiving a review.' : 'Reviews will unlock this badge.',
			unlocked: stats.reviews > 0,
		},
	];

	return (
		<View style={styles.listStack}>
			{achievements.map((achievement) => (
				<View
					key={achievement.title}
					style={[styles.infoCard, achievement.unlocked && styles.unlockedCard]}
				>
					<Ionicons
						name={achievement.unlocked ? 'ribbon' : 'ribbon-outline'}
						size={24}
						color={achievement.unlocked ? theme.colors.primary : theme.colors.textMuted}
					/>
					<Text style={styles.cardTitle}>{achievement.title}</Text>
					<Text style={styles.cardText}>{achievement.text}</Text>
				</View>
			))}
		</View>
	);
}

function About() {
	return (
		<View style={styles.infoCard}>
			<Text style={styles.cardTitle}>Meet Me There</Text>
			<Text style={styles.cardText}>
				Meet Me There helps people discover nearby events, join activities, chat with
				participants, and build trust through attendance and reviews.
			</Text>
			<Text style={styles.cardText}>
				This build includes local development accounts because the configured Supabase
				project is currently unreachable from DNS.
			</Text>
		</View>
	);
}

function Privacy() {
	return (
		<View style={styles.infoCard}>
			<Text style={styles.cardTitle}>Privacy Policy</Text>
			<Text style={styles.cardText}>
				Your profile details, locally created events, bookings, and chat messages stay in
				local browser storage in this development build.
			</Text>
			<Text style={styles.cardText}>
				When Supabase is configured correctly, authentication and profile records are sent
				through the Supabase project defined in the environment file.
			</Text>
		</View>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<View style={styles.field}>
			<Text style={styles.fieldLabel}>{label}</Text>
			{children}
		</View>
	);
}

function PrimaryAction({
	label,
	icon,
	onPress,
}: {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
		>
			<Ionicons name={icon} size={18} color="#FFFFFF" />
			<Text style={styles.primaryActionText}>{label}</Text>
		</Pressable>
	);
}

function EmptyState({
	icon,
	title,
	text,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	title: string;
	text: string;
}) {
	return (
		<View style={styles.emptyState}>
			<Ionicons name={icon} size={32} color={theme.colors.textMuted} />
			<Text style={styles.emptyTitle}>{title}</Text>
			<Text style={styles.emptyText}>{text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: theme.colors.surface,
	},
	content: {
		paddingHorizontal: theme.spacing.lg,
		paddingBottom: theme.spacing.xxl,
		gap: theme.spacing.lg,
	},
	listStack: {
		gap: theme.spacing.lg,
	},
	formCard: {
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		backgroundColor: '#FFFFFF',
		padding: theme.spacing.lg,
		gap: theme.spacing.md,
	},
	field: {
		gap: theme.spacing.xs,
	},
	fieldLabel: {
		color: theme.colors.text,
		fontSize: theme.fontSize.sm,
		fontWeight: '800',
	},
	textArea: {
		minHeight: 120,
		paddingTop: theme.spacing.md,
	},
	primaryAction: {
		height: 52,
		borderRadius: theme.radius.full,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: theme.spacing.sm,
		backgroundColor: theme.colors.primary,
		marginTop: theme.spacing.sm,
	},
	primaryActionText: {
		color: '#FFFFFF',
		fontSize: theme.fontSize.md,
		fontWeight: '900',
	},
	eventWithActions: {
		gap: theme.spacing.sm,
	},
	destructiveInline: {
		alignSelf: 'flex-end',
		flexDirection: 'row',
		alignItems: 'center',
		gap: theme.spacing.xs,
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.sm,
	},
	destructiveInlineText: {
		color: theme.colors.error,
		fontSize: theme.fontSize.sm,
		fontWeight: '800',
	},
	infoCard: {
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		backgroundColor: '#FFFFFF',
		padding: theme.spacing.lg,
		gap: theme.spacing.sm,
	},
	unlockedCard: {
		borderColor: theme.colors.primary,
		backgroundColor: '#EEF0FF',
	},
	cardTitle: {
		color: theme.colors.text,
		fontSize: theme.fontSize.lg,
		fontWeight: '900',
	},
	cardText: {
		color: theme.colors.textMuted,
		fontSize: theme.fontSize.md,
		lineHeight: 22,
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: theme.spacing.md,
	},
	statCard: {
		width: '47.5%',
		minHeight: 128,
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		borderColor: theme.colors.border,
		backgroundColor: '#FFFFFF',
		padding: theme.spacing.lg,
		justifyContent: 'center',
		gap: theme.spacing.xs,
	},
	statValue: {
		color: theme.colors.text,
		fontSize: 30,
		fontWeight: '900',
	},
	statLabel: {
		color: theme.colors.textMuted,
		fontSize: theme.fontSize.sm,
		fontWeight: '800',
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		gap: theme.spacing.sm,
		paddingVertical: theme.spacing.xxl,
	},
	emptyTitle: {
		color: theme.colors.text,
		fontSize: theme.fontSize.md,
		fontWeight: '900',
	},
	emptyText: {
		color: theme.colors.textMuted,
		fontSize: theme.fontSize.sm,
		textAlign: 'center',
	},
	pressed: {
		opacity: 0.75,
	},
});
