import { Body, Card, Empty, H1, Screen, Strong } from '@/ui/kit';

const IDEAS = [
  ['🏖️', 'Goa long weekend', 'Beaches, cafés, a sunset cruise'],
  ['🏔️', 'Spiti road trip', '8 days via Kinnaur'],
  ['🌸', 'Japan in Sakura season', 'Tokyo → Kyoto → Osaka, 10 days'],
] as const;

export default function ExploreScreen() {
  return (
    <Screen>
      <H1>Explore</H1>
      <Empty
        icon="🧭"
        title="Ready-made trips are on the way"
        body="Templates you can copy into your own trip, and plans from real travellers."
      />
      {IDEAS.map(([icon, title, body]) => (
        <Card key={title}>
          <Strong>
            {icon} {title}
          </Strong>
          <Body muted small>
            {body} · coming soon
          </Body>
        </Card>
      ))}
    </Screen>
  );
}
