import { getLocalProfile, listTrips } from '@travelog/db';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { useQuery } from '@/data/provider';
import { Between, Body, Button, Card, H1, Screen, Strong } from '@/ui/kit';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useQuery((db) => getLocalProfile(db));
  const trips = useQuery((db) => listTrips(db));
  const done = trips.filter((t) => t.state === 'completed' || t.state === 'archived').length;

  return (
    <Screen>
      <H1>Profile</H1>
      <Card>
        <Strong style={{ fontSize: 20 }}>{profile?.displayName}</Strong>
        <Body muted small>
          Home currency {profile?.homeCurrency}
          {profile?.upiId ? ` · UPI ${profile.upiId}` : ''}
        </Body>
        <Button label="Edit" variant="ghost" small onPress={() => router.push('/welcome')} />
      </Card>
      <Card>
        <Between>
          <Body>Trips</Body>
          <Strong>{trips.length}</Strong>
        </Between>
        <Between>
          <Body>Completed</Body>
          <Strong>{done}</Strong>
        </Between>
      </Card>
      <Card>
        <Strong>Account and sync</Strong>
        <Body muted small>
          Sign-in, backup and sharing trips with friends arrive in a later update. Until then
          everything is saved on this phone only.
        </Body>
      </Card>
      <Body small muted>
        TravelOG {Constants.expoConfig?.version ?? ''}
      </Body>
    </Screen>
  );
}
