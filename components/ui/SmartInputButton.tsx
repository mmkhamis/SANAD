import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';

interface SmartInputButtonProps {
  onPress: () => void;
  /** Diameter of the button (default 60) */
  size?: number;
}

/**
 * Floating "intelligent input" button with metallic shine and shadow.
 * Uses a sparkles icon to indicate smart/AI-powered input.
 */
export const SmartInputButton = React.memo(function SmartInputButton({
  onPress,
  size = 48,
}: SmartInputButtonProps): React.ReactElement {
  const colors = useThemeColors();
  const breatheOpacity = useSharedValue(0.5);
  const breatheDuration = 2500;
  const glowSize = size + 16;

  // Subtle breathing glow on the button itself
  React.useEffect(() => {
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breatheOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: breatheOpacity.value,
  }));

  return (
    <View style={{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer glow layer */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: '#8B5CF6',
            opacity: 0.2,
          },
          glowStyle,
        ]}
      />

      {/* Shadow layer */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'transparent',
          shadowColor: '#8B5CF6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 10,
          elevation: 8,
        }}
      />

      {/* Main button */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={[
            'rgba(139,92,246,0.95)',
            'rgba(109,72,226,0.95)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: size / 2,
          }}
        />

        {/* Metallic shine sweep */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: size / 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: -size * 0.3,
              width: size * 0.3,
              height: '100%',
            }}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        </Animated.View>

        {/* Icon */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
        </View>
      </Pressable>
    </View>
  );
});
