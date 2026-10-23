import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorFor } from '../utils/format';

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) }]}>
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#fff', fontWeight: '600' },
});
