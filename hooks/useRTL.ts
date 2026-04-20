import { useLanguageStore } from '../store/language-store';

/**
 * Reactive RTL helpers derived from the active language.
 *
 * Usage:
 *   const { isRTL, textAlign, rowDir } = useRTL();
 *
 *   // Right-align text in Arabic:
 *   <Text style={{ textAlign }}>...</Text>
 *
 *   // Flip icon+text rows in Arabic (icon moves to trailing side):
 *   <View style={{ flexDirection: rowDir }}>
 *     <Icon /><Text>label</Text>
 *   </View>
 */
export function useRTL() {
  const isRTL = useLanguageStore((s) => s.isRTL);
  return {
    isRTL,
    textAlign: (isRTL ? 'right' : 'left') as 'right' | 'left',
    rowDir: (isRTL ? 'row-reverse' : 'row') as 'row-reverse' | 'row',
  };
}
