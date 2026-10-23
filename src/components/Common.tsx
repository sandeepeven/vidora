import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((c) => {
        const on = c.key === value;
        return (
          <Pressable key={c.key} onPress={() => onChange(c.key)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  onAction,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={64} color={colors.faint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? (
        <Pressable onPress={onAction} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} style={styles.sectionBtn}>
          <Text style={styles.sectionBtnText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: { backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 12, height: 32, justifyContent: 'center', maxWidth: 180 },
  chipOn: { backgroundColor: colors.text },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  chipTextOn: { color: colors.bg },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptyBody: { color: colors.sub, fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: colors.text, borderRadius: 18, paddingHorizontal: 18, height: 36, justifyContent: 'center' },
  emptyBtnText: { color: colors.bg, fontWeight: '600' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionBtn: { borderWidth: 1, borderColor: colors.surface3, borderRadius: 16, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  sectionBtnText: { color: colors.text, fontSize: 13, fontWeight: '500' },
});
