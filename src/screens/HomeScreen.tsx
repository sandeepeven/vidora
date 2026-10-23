import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Chips, EmptyState } from '../components/Common';
import { Thumbnail } from '../components/Thumbnail';
import { VideoCard } from '../components/VideoCard';
import { useNav } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import { isShort, type Video } from '../types';
import { formatViews } from '../utils/format';

type Row = { kind: 'video'; video: Video } | { kind: 'shorts'; items: Video[] };

export default function HomeScreen() {
  const { videos, channels, refresh, refreshing } = useLibrary();
  const { data } = useUserData();
  const [chip, setChip] = useState('all');

  const chips = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: 'new', label: 'New to you' },
      { key: 'watched', label: 'Watched' },
      { key: 'long', label: 'Long videos' },
      ...channels.slice(0, 12).map((c) => ({ key: c.id, label: c.name })),
    ],
    [channels],
  );

  const rows = useMemo<Row[]>(() => {
    const watched = new Set(data.history.map((h) => h.id));
    const hidden = (v: Video) => data.reactions[v.id] === 'dislike' && chip === 'all';
    const longForm = videos.filter((v) => !isShort(v) && !hidden(v));
    let list: Video[];
    switch (chip) {
      case 'all': list = longForm; break;
      case 'new': list = longForm.filter((v) => !watched.has(v.id)); break;
      case 'watched': list = data.history.map((h) => videos.find((v) => v.id === h.id)).filter(Boolean) as Video[]; break;
      case 'long': list = videos.filter((v) => v.duration >= 600).sort((a, b) => b.duration - a.duration); break;
      default: list = videos.filter((v) => v.channelId === chip);
    }
    const out: Row[] = list.map((v) => ({ kind: 'video', video: v }));
    const shorts = videos.filter(isShort).slice(0, 12);
    if (chip === 'all' && shorts.length) out.splice(Math.min(2, out.length), 0, { kind: 'shorts', items: shorts });
    return out;
  }, [videos, chip, data.history, data.reactions]);

  return (
    <View style={styles.root}>
      <AppHeader />
      <FlatList
        data={rows}
        keyExtractor={(r, i) => (r.kind === 'video' ? r.video.id : 'shorts-' + i)}
        ListHeaderComponent={
          <View style={{ backgroundColor: colors.bg }}>
            <Chips items={chips} value={chip} onChange={setChip} />
          </View>
        }
        stickyHeaderIndices={[0]}
        renderItem={({ item }) => (item.kind === 'video' ? <VideoCard video={item.video} /> : <ShortsShelf items={item.items} />)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.text} colors={[colors.accent]} progressBackgroundColor={colors.surface2} />}
        ListEmptyComponent={
          videos.length ? (
            <EmptyState icon="filter-outline" title="Nothing here yet" body="Try a different filter." />
          ) : (
            <EmptyState
              icon="videocam-off-outline"
              title="No videos on this device"
              body="Copy some videos to your phone (Movies, Download, DCIM…) and pull down to rescan."
              action="Rescan"
              onAction={refresh}
            />
          )
        }
        initialNumToRender={4}
        windowSize={7}
      />
    </View>
  );
}

function ShortsShelf({ items }: { items: Video[] }) {
  const nav = useNav();
  const { data } = useUserData();
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHead}>
        <Ionicons name="flash" size={20} color={colors.accent} />
        <Text style={styles.shelfTitle}>Shorts</Text>
      </View>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(v) => v.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.push('Watch', { id: item.id })} style={styles.short}>
            <Thumbnail video={item} style={styles.shortThumb} radius={10} showDuration={false} />
            <Text style={styles.shortTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.shortMeta}>{formatViews(data.views[item.id] ?? 0)}</Text>
          </Pressable>
        )}
      />
      <View style={styles.shelfDivider} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shelf: { marginBottom: 16 },
  shelfHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  shelfTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  short: { width: 150 },
  shortThumb: { width: 150, height: 260 },
  shortTitle: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 6 },
  shortMeta: { color: colors.sub, fontSize: 12, marginTop: 2 },
  shelfDivider: { height: 4, backgroundColor: colors.surface, marginTop: 16 },
});
