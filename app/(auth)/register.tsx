import { Redirect } from 'expo-router';
import React from 'react';

// Registration is handled inside the unified login screen (Create Account tab).
export default function RegisterScreen(): React.ReactElement {
  return <Redirect href="/(auth)/login" />;
}
