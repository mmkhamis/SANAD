import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';

interface AppScreenProps {
  children: React.ReactNode;
  /**
   * Background color applied to the SafeAreaView.
   * Defaults to transparent so the parent can set it.
   */
  backgroundColor?: string;
  /**
   * Premium hero backplate (radial purple + blue washes over near-black).
   * 'hero' in dark mode paints the Claude Design backdrop underneath content.
   * Default: 'hero' in dark mode, 'none' in light mode.
   */
  backplate?: 'none' | 'hero';
  /**
   * Wrap content in a ScrollView.
   * Default: false — fixed full-screen layout.
   */
  scroll?: boolean;
  /**
   * Disable the KeyboardAvoidingView wrapper.
   * Useful for screens using FlashList / FlatList which handle this internally.
   * Default: false
   */
  noKeyboard?: boolean;
  /**
   * Override the responsive horizontal padding.
   * Defaults to the breakpoint-aware hPad from useResponsive.
   */
  horizontalPadding?: number;
  /** Extra styles for the inner content container */
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Which safe-area edges to honor.
   * Default: ['top', 'left', 'right', 'bottom']
   * Pass ['top', 'left', 'right'] for screens with a custom bottom tab bar.
   */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * AppScreen — the standard screen wrapper for the SANAD app.
 *
 * Responsibilities:
 * - SafeAreaView on all 4 edges by default
 * - Horizontally centers content and caps width at MAX_CONTENT_WIDTH (600px)
 *   so layouts degrade gracefully on large screens / tablets
 * - Applies breakpoint-aware horizontal padding via useResponsive
 * - Optionally wraps in ScrollView + KeyboardAvoidingView
 *
 * Usage (non-scrolling screen):
 * ```tsx
 * <AppScreen backgroundColor={colors.background}>
 *   <Text>Content</Text>
 * </AppScreen>
 * ```
 *
 * Usage (scrolling form):
 * ```tsx
 * <AppScreen scroll backgroundColor={colors.background}>
 *   <TextInput ... />
 * </AppScreen>
 * ```
 *
 * Usage (FlashList / custom scroll — skip both wrappers):
 * ```tsx
 * <AppScreen noKeyboard backgroundColor={colors.background}>
 *   <FlashList ... />
 * </AppScreen>
 * ```
 */
export function AppScreen({
  children,
  backgroundColor,
  backplate,
  scroll = false,
  noKeyboard = false,
  horizontalPadding,
  contentStyle,
  edges = ['top', 'left', 'right', 'bottom'],
}: AppScreenProps): React.ReactElement {
  const { hPad, hMargin } = useResponsive();
  const colors = useThemeColors();
  const pH = horizontalPadding ?? hPad;
  const plate: 'none' | 'hero' = backplate ?? (colors.isDark ? 'hero' : 'none');

  const innerStyle: ViewStyle = {
    flex: 1,
    marginHorizontal: hMargin,
    paddingHorizontal: pH,
  };

  const content = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={[innerStyle, { flexGrow: 1 }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[innerStyle, contentStyle]}>{children}</View>
  );

  const wrapped = noKeyboard ? content : (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {content}
    </KeyboardAvoidingView>
  );

  const backplateNode = plate === 'hero' && colors.isDark ? (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background }} />
      <LinearGradient
        colors={[colors.gradientBg[0], colors.gradientBg[1], colors.gradientBg[2]] as [string, string, string]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={colors.heroWashPrimary as unknown as [string, string]}
        start={{ x: 0.2, y: -0.1 }}
        end={{ x: 0.7, y: 0.6 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }}
      />
      <LinearGradient
        colors={colors.heroWashSecondary as unknown as [string, string]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0.4, y: 0.4 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' }}
      />
    </View>
  ) : null;

  return (
    <SafeAreaView
      edges={edges}
      style={[
        { flex: 1 },
        backgroundColor ? { backgroundColor } : undefined,
        plate === 'hero' && !backgroundColor ? { backgroundColor: colors.background } : undefined,
      ]}
    >
      {backplateNode}
      {wrapped}
    </SafeAreaView>
  );
}
