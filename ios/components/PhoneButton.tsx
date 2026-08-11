import { useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { palette } from '@/constants/Colors';

type Props = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

// NoPixel 3.0 phone button: on press a green circle expands from the center,
// fills the button, then fades out — the in-game confirm/save feedback.
export default function PhoneButton({ onPress, children, style, disabled }: Props) {
  const scale = useState(() => new Animated.Value(0))[0];
  const [size, setSize] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(Math.sqrt(width * width + height * height));
  };

  const handlePress = () => {
    scale.setValue(0);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      onLayout={handleLayout}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.circle,
          size > 0 && {
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            transform: [{ scale }],
          },
          {
            opacity: scale.interpolate({
              inputRange: [0, 0.25, 0.75, 1],
              outputRange: [0, 0.9, 0.6, 0],
            }),
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  circle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    backgroundColor: palette.green,
  },
});
