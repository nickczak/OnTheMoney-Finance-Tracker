import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import type { NetWorthHistoryPoint } from '@/types/NetWorth';

type Props = {
  data: NetWorthHistoryPoint[];
  height?: number;
  onSelect?: (point: NetWorthHistoryPoint | null) => void;
};

export default function NetWorthChart({ data, height = 180, onSelect }: Props) {
  const [styleWidth, setStyleWidth] = useState(340);
  const [selected, setSelected] = useState<number>(-1);
  const padLeft = 12;
  const padRight = 56;
  const padY = 16;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setStyleWidth(width);
  };

  if (data.length < 2) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Text style={styles.empty}>Not enough data to chart yet.</Text>
      </View>
    );
  }

  const values = data.map((d) => d.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const gain = values[values.length - 1] >= values[0];
  const lineColor = gain ? '#00ff88' : '#ff0055';

  const plotWidth = styleWidth - padLeft - padRight;
  const plotHeight = height - padY * 2;

  const x = (i: number) => padLeft + (i / (data.length - 1)) * plotWidth;
  const y = (v: number) => padY + plotHeight - ((v - min) / range) * plotHeight;

  const points = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(d.netWorth).toFixed(2)}`);
  const path = points.join(' ');

  const gridFractions = [0, 0.25, 0.5, 0.75, 1];
  const gridLines = gridFractions.map((f) => ({
    y: padY + plotHeight * f,
    value: max - range * f,
  }));

  const handlePress = (e: GestureResponderEvent) => {
    const { locationX } = e.nativeEvent;
    // Convert screen x back to a plot index (0..data.length-1), clamped.
    const frac = (locationX - padLeft) / plotWidth;
    const index = Math.round(frac * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, index));
    setSelected(clamped);
    if (onSelect) onSelect(data[clamped]);
  };

  const handleRelease = () => {
    setSelected(-1);
    if (onSelect) onSelect(null);
  };

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onResponderMove={handlePress}
      onResponderRelease={handleRelease}>
      <Svg width={styleWidth} height={height}>
        {gridLines.map((gl, i) => (
          <SvgText
            key={i}
            x={styleWidth - padRight + 6}
            y={gl.y + 4}
            fill="#98989d"
            fontSize={11}
            fontFamily={serif}>
            ${gl.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </SvgText>
        ))}
        <Path
          d={path}
          stroke={lineColor}
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {selected >= 0 ? (
          <Circle
            cx={x(selected)}
            cy={y(data[selected].netWorth)}
            r={5}
            fill={lineColor}
            stroke="#000"
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    userSelect: 'none',
    // @ts-expect-error web-only property
    WebkitUserSelect: 'none',
  },
  empty: {
    fontFamily: serif,
    fontSize: 14,
    color: '#98989d',
    fontStyle: 'italic',
  },
});
