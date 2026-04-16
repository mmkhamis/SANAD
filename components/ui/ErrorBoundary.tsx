import React, { Component } from 'react';
import { View, Text, Pressable } from 'react-native';

import { COLORS } from '../../constants/colors';
import { STRINGS } from '../../constants/strings';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: COLORS.background,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: COLORS.textPrimary,
              marginBottom: 8,
            }}
          >
            {STRINGS.ERROR_GENERIC}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textSecondary,
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            {this.state.error?.message}
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: COLORS.primary,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.textInverse, fontWeight: '600' }}>
              {STRINGS.RETRY}
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
