import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/Common';
import { CompactVideoRow } from '../components/VideoCard';
import { useNav } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const { videos } = useLibrary();
  const { data, addSearch, removeSearch } = useUserData();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');

  const term = (submitted || q).trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    const words = term.split(/\s+/);
    return videos.filter((v) => {
      const hay = `${v.title} ${v.channelName} ${v.filename}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [videos, term]);

  const suggestions = q.trim()
    ? data.searches.filter((s) => s.toLowerCase().includes(q.trim().toLowerCase()))
    : data.searches;

  const submit = (text = q) => {
    const t = text.trim();
    if (!t) return;
    setQ(t);
    setSubmitted(t);
    addSearch(t);
  };

  const showResults = !!submitted;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable hitSlop={10} onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.inputWrap}>
          <TextInput
            value={q}
            onChangeText={(t) => { setQ(t); setSubmitted(''); }}
            onSubmitEditing={() => submit()}
            placeholder="Search your videos"
            placeholderTextColor={colors.faint}
            style={styles.input}
            autoFocus
            returnKeyType="search"
          />
          {q ? (
            <Pressable hitSlop={8} onPress={() => { setQ(''); setSubmitted(''); }}>
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showResults ? (
        <FlatList
          data={results}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => <CompactVideoRow video={item} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="search-outline" title="No results found" body="Try different keywords or check the file name." />}
        />
      ) : (
        <FlatList
          data={q.trim() ? [...suggestions.map((s) => ({ kind: 'recent' as const, text: s })), ...results.slice(0, 8).map((v) => ({ kind: 'live' as const, text: v.title }))] : suggestions.map((s) => ({ kind: 'recent' as const, text: s }))}
          keyExtractor={(i, idx) => i.kind + i.text + idx}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.sugg, pressed && { backgroundColor: colors.surface }]} onPress={() => submit(item.text)}>
              <Ionicons name={item.kind === 'recent' ? 'time-outline' : 'search-outline'} size={20} color={colors.text} />
              <Text style={styles.suggText} numberOfLines={1}>{item.text}</Text>
              {item.kind === 'recent' ? (
                <Pressable hitSlop={8} onPress={() => removeSearch(item.text)}>
                  <Ionicons name="close" size={18} color={colors.sub} />
                </Pressable>
              ) : (
                <Pressable hitSlop={8} onPress={() => setQ(item.text)}>
                  <Ionicons name="arrow-up-outline" size={18} color={colors.sub} style={{ transform: [{ rotate: '-45deg' }] }} />
                </Pressable>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 56 },
  back: { padding: 6 },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    marginLeft: 6,
  },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 0 },
  sugg: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  suggText: { flex: 1, color: colors.text, fontSize: 15 },
});
