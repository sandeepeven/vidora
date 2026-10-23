import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../components/Common';
import { Thumbnail } from '../components/Thumbnail';
import { CompactVideoRow } from '../components/VideoCard';
import type { PlaylistKind, RootStackParamList } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';

const TITLES: Record<PlaylistKind, string> = {
  history: 'History',
  watchLater: 'Watch later',
  liked: 'Liked videos',
  all: 'Downloads',
};

export default function PlaylistScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Playlist'>) {
  const insets = useSafeAreaInsets();
  const { kind } = route.params;
  const { byId, videos } = useLibrary();
  const { data } = useUserData();

  const list = useMemo<Video[]>(() => {
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter(Boolean) as Video[];
    switch (kind) {
      case 'history': return pick(data.history.map((h) => h.id));
      case 'watchLater': return pick(data.watchLater);
      case 'liked': return pick(Object.keys(data.reactions).filter((id) => data.reactions[id] === 'like'));
      default: return videos;
    }
  }, [kind, byId, videos, data.history, data.watchLater, data.reactions]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <CompactVideoRow video={item} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View style={styles.head}>
            {list[0] ? <Thumbnail video={list[0]} style={styles.cover} radius={12} showDuration={false} /> : null}
            <Text style={styles.title}>{TITLES[kind]}</Text>
            <Text style={styles.meta}>{data.profileName} · {list.length} videos · Offline</Text>
            {list.length ? (
              <Pressable style={styles.play} onPress={() => navigation.push('Watch', { id: list[0].id })}>
                <Ionicons name="play" size={18} color={colors.bg} />
                <Text style={styles.playText}>Play all</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="list-outline" title="This list is empty" body="Videos you add will show up here." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 8 },
  head: { paddingHorizontal: 16, paddingBottom: 12 },
  cover: { width: '100%', aspectRatio: 16 / 9, marginBottom: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  meta: { color: colors.sub, fontSize: 13, marginTop: 4 },
  play: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
    borderRadius: 20,
    height: 40,
    gap: 6,
  },
  playText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
});
