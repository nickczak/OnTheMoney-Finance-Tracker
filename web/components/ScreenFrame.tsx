import { StyleSheet, View, type ViewProps } from 'react-native';

import { CONTENT_MAX_WIDTH, useResponsiveLayout } from '@/constants/responsive';

/**
 * Centers screen content in a fixed-width column on desktop so the phone-first
 * UI doesn't stretch edge-to-edge on wide monitors. Phones get the full width.
 * Wrap a screen's content in this, or use the `content`/`contentWide` style
 * pair directly on a list's contentContainerStyle.
 */
export default function ScreenFrame({ style, children, ...props }: ViewProps) {
  const { isDesktop } = useResponsiveLayout();
  return (
    <View style={[styles.frame, isDesktop && styles.wide, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  wide: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
});
