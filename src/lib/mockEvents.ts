export type OrganizerType = 'personal' | 'business';
export type PaymentModel = 'Free' | 'Paid';
export type BookingView = 'upcoming' | 'past';
export type DateFilter = 'all' | 'today' | 'this-week' | 'weekend';
export type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

export type Organizer = {
  type: OrganizerType;
  name: string;
  avatarUrl: string;
  trustScore?: number;
  rating?: number;
};

export type Review = {
  rating: number;
  text: string;
};

export type EventItem = {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  tags: string[];
  startsAt: string;
  endsAt: string;
  venue: string;
  address: string;
  coordinateLabel: string;
  latitude: number;
  longitude: number;
  capacity: number;
  attendees: number;
  price: number;
  paymentModel: PaymentModel;
  imageUrl: string;
  organizer: Organizer;
  participantNames: string[];
  isPopular: boolean;
  isBooked: boolean;
  createdByCurrentUser?: boolean;
  review?: Review;
};

export type ChatMessage = {
  id: string;
  eventId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  sentAt: string;
  isCurrentUser?: boolean;
  isOrganizer?: boolean;
  isDeleted?: boolean;
  isReported?: boolean;
  attachmentLabel?: string;
};

export type LocationSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
};

export const CATEGORY_TAGS = [
  'Outdoors',
  'Music',
  'Sport',
  'Restaurant',
  'Workshop',
  'Creative',
  'Social',
  'Culinary',
  'Coffee',
  'Wellness',
] as const;

export const LOCATION_SUGGESTIONS: readonly LocationSuggestion[] = [
  { label: 'Piata Unirii, Bucharest', latitude: 44.4275, longitude: 26.1039 },
  { label: 'Herastrau Park, Bucharest', latitude: 44.4759, longitude: 26.0823 },
  { label: 'Cluj Arena, Cluj-Napoca', latitude: 46.7686, longitude: 23.5728 },
  { label: 'Piata Sfatului, Brasov', latitude: 45.6427, longitude: 25.5887 },
  { label: 'Palatul Culturii, Iasi', latitude: 47.1579, longitude: 27.5869 },
  { label: 'Piata Victoriei, Timisoara', latitude: 45.7537, longitude: 21.2257 },
] as const;

export const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
  { value: 'weekend', label: 'Weekend' },
] as const;

export const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
] as const;

const EVENTS_KEY = 'meet-me-there:events-v3';
const CHAT_KEY = 'meet-me-there:chat-v3';

const image = (seed: string) => `https://picsum.photos/seed/${seed}/1200/675`;
const avatar = (seed: string) => `https://i.pravatar.cc/160?img=${seed}`;

function readStorage<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is a development convenience. The in-memory store still works.
  }
}

function futureDate(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function pastDate(daysAgo: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function coordinateLabel(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function romanianEvent(input: Omit<EventItem, 'coordinateLabel' | 'isBooked'>): EventItem {
  return {
    ...input,
    coordinateLabel: coordinateLabel(input.latitude, input.longitude),
    isBooked: false,
  };
}

const defaultEvents: EventItem[] = [
  romanianEvent({
    id: 'jazz-night-bucharest',
    title: 'Jazz Night in the Garden',
    shortDescription: 'A soulful live jazz evening in Herastrau Park.',
    description:
      'Experience a relaxed garden concert with local jazz musicians, warm lights, and a friendly crowd. Bring a light jacket and arrive early for the best seats.',
    tags: ['Music', 'Outdoors', 'Social'],
    startsAt: futureDate(3, 19, 30),
    endsAt: futureDate(3, 22, 30),
    venue: 'Herastrau Park, Bucharest',
    address: 'Herastrau Park, Bucharest',
    latitude: 44.4759,
    longitude: 26.0823,
    capacity: 60,
    attendees: 45,
    price: 25,
    paymentModel: 'Paid',
    imageUrl: image('bucharest-jazz-garden'),
    organizer: {
      type: 'personal',
      name: 'Elena Popescu',
      avatarUrl: avatar('32'),
      trustScore: 98,
    },
    participantNames: ['Marcus', 'Elena', 'Leo', 'Ana', 'Mara'],
    isPopular: true,
  }),
  romanianEvent({
    id: 'pottery-workshop-brasov',
    title: 'Pottery Workshop',
    shortDescription: 'Shape, glaze, and fire a handmade ceramic cup.',
    description:
      'A beginner-friendly pottery session hosted near the old city center. Tools and materials are included, and the host helps everyone finish a small object.',
    tags: ['Workshop', 'Creative', 'Social'],
    startsAt: futureDate(5, 10, 0),
    endsAt: futureDate(5, 12, 30),
    venue: 'Piata Sfatului, Brasov',
    address: 'Piata Sfatului, Brasov',
    latitude: 45.6427,
    longitude: 25.5887,
    capacity: 18,
    attendees: 12,
    price: 0,
    paymentModel: 'Free',
    imageUrl: image('brasov-pottery-workshop'),
    organizer: {
      type: 'business',
      name: 'Artisans Hub',
      avatarUrl: avatar('45'),
      rating: 4.8,
    },
    participantNames: ['Sofia', 'Mihai', 'Irina', 'Tudor'],
    isPopular: true,
  }),
  romanianEvent({
    id: 'coffee-tasting-cluj',
    title: 'Coffee Tasting Experience',
    shortDescription: 'Taste single-origin brews with a local barista.',
    description:
      'Explore espresso, filter coffee, and cold brew with a guided tasting. The session covers aroma, origin, processing, and practical brewing tips.',
    tags: ['Coffee', 'Culinary', 'Social'],
    startsAt: futureDate(11, 9, 0),
    endsAt: futureDate(11, 10, 45),
    venue: 'Cluj Arena, Cluj-Napoca',
    address: 'Cluj Arena, Cluj-Napoca',
    latitude: 46.7686,
    longitude: 23.5728,
    capacity: 24,
    attendees: 16,
    price: 15,
    paymentModel: 'Paid',
    imageUrl: image('cluj-coffee-tasting'),
    organizer: {
      type: 'business',
      name: 'Brew Bar Collective',
      avatarUrl: avatar('12'),
      rating: 4.9,
    },
    participantNames: ['Alex', 'Ioana', 'Radu'],
    isPopular: false,
  }),
  romanianEvent({
    id: 'garden-party-iasi',
    title: 'Garden Party',
    shortDescription: 'Open-air social evening with music and snacks.',
    description:
      'A casual outdoor meetup for people who want to unwind after work. Expect light music, lawn games, and plenty of room to meet new people.',
    tags: ['Outdoors', 'Social', 'Restaurant'],
    startsAt: futureDate(8, 18, 0),
    endsAt: futureDate(8, 21, 0),
    venue: 'Palatul Culturii, Iasi',
    address: 'Palatul Culturii, Iasi',
    latitude: 47.1579,
    longitude: 27.5869,
    capacity: 80,
    attendees: 54,
    price: 0,
    paymentModel: 'Free',
    imageUrl: image('iasi-garden-party'),
    organizer: {
      type: 'personal',
      name: 'Marcus Ionescu',
      avatarUrl: avatar('18'),
      trustScore: 91,
    },
    participantNames: ['Daria', 'Leo', 'Mara', 'Vlad'],
    isPopular: true,
  }),
  romanianEvent({
    id: 'morning-yoga-timisoara',
    title: 'Morning Yoga in the Park',
    shortDescription: 'A gentle outdoor flow for all levels.',
    description:
      'Start the day with a calm yoga session focused on mobility, breathing, and recovery. Bring your own mat and water bottle.',
    tags: ['Sport', 'Wellness', 'Outdoors'],
    startsAt: futureDate(1, 8, 0),
    endsAt: futureDate(1, 9, 15),
    venue: 'Piata Victoriei, Timisoara',
    address: 'Piata Victoriei, Timisoara',
    latitude: 45.7537,
    longitude: 21.2257,
    capacity: 35,
    attendees: 19,
    price: 0,
    paymentModel: 'Free',
    imageUrl: image('timisoara-morning-yoga'),
    organizer: {
      type: 'personal',
      name: 'Ana Marinescu',
      avatarUrl: avatar('26'),
      trustScore: 94,
    },
    participantNames: ['Bianca', 'Mara', 'Teo'],
    isPopular: false,
  }),
  romanianEvent({
    id: 'past-wine-bucharest',
    title: 'Wine Tasting',
    shortDescription: 'A guided evening with regional wines.',
    description:
      'A curated tasting hosted by a sommelier, with pairing notes and a relaxed group conversation.',
    tags: ['Culinary', 'Social'],
    startsAt: pastDate(77, 18, 30),
    endsAt: pastDate(77, 20, 30),
    venue: 'Piata Unirii, Bucharest',
    address: 'Piata Unirii, Bucharest',
    latitude: 44.4275,
    longitude: 26.1039,
    capacity: 30,
    attendees: 27,
    price: 35,
    paymentModel: 'Paid',
    imageUrl: image('bucharest-wine-tasting'),
    organizer: {
      type: 'business',
      name: 'Old Town Cellars',
      avatarUrl: avatar('37'),
      rating: 4.9,
    },
    participantNames: ['Mara', 'Paul', 'Diana'],
    isPopular: false,
    review: {
      rating: 4,
      text: 'Excellent wines and a very warm host.',
    },
  }),
];

const defaultChatMessages: Record<string, ChatMessage[]> = {
  'jazz-night-bucharest': [
    {
      id: 'msg-1',
      eventId: 'jazz-night-bucharest',
      senderName: 'Marcus',
      senderAvatar: avatar('18'),
      text: 'Is anyone here yet?',
      sentAt: new Date().toISOString(),
    },
    {
      id: 'msg-2',
      eventId: 'jazz-night-bucharest',
      senderName: 'Elena',
      senderAvatar: avatar('32'),
      text: 'I am setting up near the park entrance.',
      sentAt: new Date().toISOString(),
      isOrganizer: true,
    },
  ],
};

let events: EventItem[] = readStorage<EventItem[]>(EVENTS_KEY) ?? defaultEvents;
let chatMessages: Record<string, ChatMessage[]> =
  readStorage<Record<string, ChatMessage[]>>(CHAT_KEY) ?? defaultChatMessages;

function persistEvents() {
  writeStorage(EVENTS_KEY, events);
}

function persistChat() {
  writeStorage(CHAT_KEY, chatMessages);
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export function getLocationSuggestion(label: string) {
  return LOCATION_SUGGESTIONS.find((location) => location.label === label) ?? null;
}

export function getEvents() {
  return [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
}

export function getUpcomingEvents() {
  const now = Date.now();
  return getEvents().filter((event) => new Date(event.startsAt).getTime() >= now);
}

export function getBookedEvents(view: BookingView) {
  const now = Date.now();
  return getEvents().filter((event) => {
    const startsAt = new Date(event.startsAt).getTime();
    if (!event.isBooked) return false;
    return view === 'upcoming' ? startsAt >= now : startsAt < now;
  });
}

export function getCreatedEvents() {
  return getEvents().filter((event) => event.createdByCurrentUser);
}

export function getReviewedEvents() {
  return getEvents().filter((event) => Boolean(event.review));
}

export function getActivityStats() {
  const createdEvents = getCreatedEvents();
  const bookedEvents = getBookedEvents('upcoming');
  const pastEvents = getBookedEvents('past');
  return {
    created: createdEvents.length,
    upcomingBookings: bookedEvents.length,
    attended: pastEvents.length,
    reviews: getReviewedEvents().length,
  };
}

export function getEventById(id: string | undefined) {
  return events.find((event) => event.id === id) ?? null;
}

export function getVisibleEvents(filters: {
  date: DateFilter;
  time: TimeFilter;
  tags: string[];
}) {
  const now = new Date();
  return getUpcomingEvents().filter((event) => {
    const startsAt = new Date(event.startsAt);

    if (filters.date === 'today' && !sameDay(startsAt, now)) return false;
    if (filters.date === 'this-week') {
      const sevenDays = new Date(now);
      sevenDays.setDate(sevenDays.getDate() + 7);
      if (startsAt > sevenDays) return false;
    }
    if (filters.date === 'weekend') {
      const day = startsAt.getDay();
      if (day !== 0 && day !== 6) return false;
    }

    const hour = startsAt.getHours();
    if (filters.time === 'morning' && hour >= 12) return false;
    if (filters.time === 'afternoon' && (hour < 12 || hour >= 17)) return false;
    if (filters.time === 'evening' && hour < 17) return false;

    if (filters.tags.length > 0) {
      const hasEveryTag = filters.tags.every((tag) => event.tags.includes(tag));
      if (!hasEveryTag) return false;
    }

    return true;
  });
}

export function createEvent(input: {
  title: string;
  description: string;
  tags: string[];
  startsAt: Date;
  endsAt: Date;
  venue: string;
  imageUrl: string | null;
  capacity: number;
  paymentModel: PaymentModel;
  price: number;
}) {
  const idBase = input.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `${idBase || 'event'}-${Date.now()}`;
  const suggestion = getLocationSuggestion(input.venue);
  const latitude = suggestion?.latitude ?? 44.4275;
  const longitude = suggestion?.longitude ?? 26.1039;

  const event: EventItem = {
    id,
    title: input.title.trim(),
    shortDescription: input.description.trim().slice(0, 120),
    description: input.description.trim(),
    tags: input.tags,
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
    venue: input.venue,
    address: input.venue,
    coordinateLabel: coordinateLabel(latitude, longitude),
    latitude,
    longitude,
    capacity: input.capacity,
    attendees: 1,
    price: input.paymentModel === 'Paid' ? input.price : 0,
    paymentModel: input.paymentModel,
    imageUrl: input.imageUrl ?? image(`created-${id}`),
    organizer: {
      type: 'personal',
      name: 'You',
      avatarUrl: avatar('41'),
      trustScore: 86,
    },
    participantNames: ['You'],
    isPopular: false,
    isBooked: true,
    createdByCurrentUser: true,
  };

  events = [event, ...events];
  chatMessages[id] = [];
  persistEvents();
  persistChat();
  return event;
}

export function joinEvent(id: string) {
  const event = getEventById(id);
  if (!event || event.isBooked) return event;
  event.isBooked = true;
  event.attendees = Math.min(event.attendees + 1, event.capacity);
  if (!event.participantNames.includes('You')) event.participantNames.unshift('You');
  persistEvents();
  return event;
}

export function cancelAttendance(id: string) {
  const event = getEventById(id);
  if (!event || !event.isBooked) return event;
  event.isBooked = false;
  event.attendees = Math.max(event.attendees - 1, 0);
  event.participantNames = event.participantNames.filter((name) => name !== 'You');
  persistEvents();
  return event;
}

export function deleteEvent(id: string) {
  events = events.filter((event) => event.id !== id);
  delete chatMessages[id];
  persistEvents();
  persistChat();
}

export function clearUserActivity() {
  events = defaultEvents;
  chatMessages = defaultChatMessages;
  persistEvents();
  persistChat();
}

export function getChatMessages(eventId: string) {
  return [...(chatMessages[eventId] ?? [])];
}

export function sendChatMessage(input: {
  eventId: string;
  text: string;
  attachmentLabel?: string;
}) {
  const message: ChatMessage = {
    id: `msg-${Date.now()}`,
    eventId: input.eventId,
    senderName: 'You',
    senderAvatar: avatar('41'),
    text: input.text,
    sentAt: new Date().toISOString(),
    isCurrentUser: true,
    attachmentLabel: input.attachmentLabel,
  };
  chatMessages[input.eventId] = [...(chatMessages[input.eventId] ?? []), message];
  persistChat();
  return message;
}

export function receiveMockReply(eventId: string) {
  const event = getEventById(eventId);
  const message: ChatMessage = {
    id: `reply-${Date.now()}`,
    eventId,
    senderName: event?.organizer.name ?? 'Organizer',
    senderAvatar: event?.organizer.avatarUrl ?? avatar('32'),
    text: 'Thanks for the update. See you there.',
    sentAt: new Date().toISOString(),
    isOrganizer: true,
  };
  chatMessages[eventId] = [...(chatMessages[eventId] ?? []), message];
  persistChat();
  return message;
}

export function markMessageDeleted(eventId: string, messageId: string) {
  const messages = chatMessages[eventId] ?? [];
  chatMessages[eventId] = messages.map((message) =>
    message.id === messageId ? { ...message, isDeleted: true, text: '' } : message,
  );
  persistChat();
}

export function reportMessage(eventId: string, messageId: string) {
  const messages = chatMessages[eventId] ?? [];
  chatMessages[eventId] = messages.map((message) =>
    message.id === messageId ? { ...message, isReported: true } : message,
  );
  persistChat();
}

export function formatEventDate(event: EventItem) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(event.startsAt));
}

export function formatEventTime(event: EventItem) {
  const start = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.startsAt));
  const end = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(event.endsAt));
  return `${start} - ${end}`;
}

export function formatEventSchedule(event: EventItem, includeEnd = true) {
  return includeEnd
    ? `${formatEventDate(event)} • ${formatEventTime(event)}`
    : `${formatEventDate(event)} • ${new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(event.startsAt))}`;
}

export function formatMonthGroup(dateValue: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateValue));
}

export function formatShortDate(dateValue: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateValue));
}
