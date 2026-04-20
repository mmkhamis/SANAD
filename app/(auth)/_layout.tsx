import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout(): React.ReactElement {
  return (
<Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
