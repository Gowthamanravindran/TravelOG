import { databaseFile } from '@/data/open';

describe('database file', () => {
  it('keeps Expo Go test data apart and unencrypted', () => {
    expect(databaseFile(true)).toEqual({ name: 'travelog-expo-go.db', encrypted: false });
    expect(databaseFile(false)).toEqual({ name: 'travelog.db', encrypted: true });
  });
});
