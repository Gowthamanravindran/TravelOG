import { Stack } from 'expo-router';

export default function TripLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" options={{ presentation: 'modal' }} />
      <Stack.Screen name="item" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expense" options={{ presentation: 'modal' }} />
      <Stack.Screen name="booking" options={{ presentation: 'modal' }} />
      <Stack.Screen name="poll" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settle" options={{ presentation: 'modal' }} />
      <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="studio/[projectId]" options={{ animation: 'fade' }} />
      <Stack.Screen name="studio/export" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
