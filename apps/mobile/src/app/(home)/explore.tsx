import type { IconName } from '@/ui/icon';
import { Body, Card, Empty, H1, Screen, Strong, WithIcon } from '@/ui/kit';

const IDEAS = [
  ['beach', 'Goa long weekend', 'Beaches, cafés, a sunset cruise'],
  ['mountain', 'Spiti road trip', '8 days via Kinnaur'],
  ['flower', 'Japan in Sakura season', 'Tokyo → Kyoto → Osaka, 10 days'],
] as const satisfies readonly (readonly [IconName, string, string])[];

export default function ExploreScreen() {
  return (
    <Screen>
      <H1>Explore</H1>
      <Empty
        icon="explore"
        title="Ready-made trips are on the way"
        body="Templates you can copy into your own trip, and plans from real travellers."
      />
      {IDEAS.map(([icon, title, body]) => (
        <Card key={title}>
          <WithIcon icon={icon}>
            <Strong>{title}</Strong>
          </WithIcon>
          <Body muted small>
            {body} · coming soon
          </Body>
        </Card>
      ))}
    </Screen>
  );
}
