import { useLocalSearchParams } from 'expo-router';

import { Placeholder } from '../../../src/ui/Placeholder';

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Placeholder
      title={`Event Details — ${id}`}
      owner="P2 · Events + Map"
      description="Event detail view with registration / ticket purchase entry. Spec: [Events] See Event Details."
    />
  );
}
