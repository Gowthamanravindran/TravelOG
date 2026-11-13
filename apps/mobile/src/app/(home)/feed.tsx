import { Body, Empty, H1, Screen } from '@/ui/kit';

export default function FeedScreen() {
  return (
    <Screen>
      <H1>Feed</H1>
      <Empty
        icon="feed"
        art="map"
        artFamily="sea"
        title="Your friends' trips will show up here"
        body="Shared itineraries and memory collages from people you travel with. Arrives with sign-in."
      />
      <Body small muted>
        Coming soon
      </Body>
    </Screen>
  );
}
