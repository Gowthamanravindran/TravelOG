import { Body, Empty, Screen } from '@/ui/kit';

export default function NearbyTab() {
  return (
    <Screen edges={[]}>
      <Empty
        icon="📍"
        title="Nearby is coming"
        body="Food, sights, events and essentials around you, plus the map with today's route. Arrives with the maps update."
      />
      <Body small muted>
        Your plan, tickets and expenses already work offline.
      </Body>
    </Screen>
  );
}
