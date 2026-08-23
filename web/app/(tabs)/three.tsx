import { StyleSheet, Text } from 'react-native';

import { View } from '@/components/Themed';
import { serif } from '@/constants/Colors';
import { useResponsiveLayout } from '@/constants/responsive';

export default function TabStocksScreen() {
  const { scale } = useResponsiveLayout();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontSize: 28 * scale }]}>Stocks</Text>
      <Text style={[styles.comingSoon, { fontSize: 16 * scale }]}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: serif,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  comingSoon: {
    fontFamily: serif,
    color: '#98989d',
    fontStyle: 'italic',
  },
});
