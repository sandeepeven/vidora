import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNav } from '../navigation/types';
import { colors } from '../theme';
import { useToast } from './Toast';

export function Logo() {
  return (
    <View style={styles.logo}>
      <View style={styles.mark}>
        <Ionicons name="play" size={13} color="#fff" style={{ marginLeft: 2 }} />
      </View>
      <Text style={styles.word}>LowTube</Text>
    </View>
  );
}

export function AppHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const toast = useToast();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {title ? <Text style={styles.title}>{title}</Text> : <Logo />}
        <View style={styles.actions}>
          <IconBtn name="tv-outline" onPress={() => toast('Casting needs a network — this app is fully offline')} />
          <IconBtn name="notifications-outline" onPress={() => toast('No new notifications')} />
          <IconBtn name="search-outline" onPress={() => nav.navigate('Search')} />
        </View>
      </View>
    </View>
  );
}

export function IconBtn({
  name,
  onPress,
  size = 23,
  color = colors.text,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  size?: number;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.icon, pressed && { backgroundColor: colors.surface2 }]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg },
  bar: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  icon: { padding: 8, borderRadius: 20 },
  logo: { flexDirection: 'row', alignItems: 'center' },
  mark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  word: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.6 },
});
