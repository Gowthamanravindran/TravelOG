import { Stack } from 'expo-router';

export default function TripLayout() {
  return (
    // Forms slide up like sheets; everything else slides in from the right (Plan 28).
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen
        name="edit"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="item"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="expense"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      {/* Full height so a long, filled-in form scrolls (Plan 32). */}
      <Stack.Screen
        name="booking"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="poll"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="settle"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="check-in"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="studio/[projectId]" options={{ animation: 'fade' }} />
      <Stack.Screen name="studio/export" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
