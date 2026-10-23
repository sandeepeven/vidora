import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Chips, EmptyState } from '../components/Common';
import { SubscribeButton } from '../components/SubscribeButton';
import { CompactVideoRow } from '../components/VideoCard';
import type { RootStackParamList } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import { colorFor, handleFor } from '../utils/format';

type Sort = 'latest' | 'popular' | 'oldest';

export default function ChannelScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Channel'>) {
  const insets = useSafeAreaInsets();
  const { channelById, videos } = useLibrary();
  const { data } = useUserData();
  const [sort, setSort] = useState<Sort>('latest');
  const channel = channelById.get(route.params.id);

  const list = useMemo(() => {
    const vs = videos.filter((v) => v.channelId === route.params.id);
    if (sort === 'latest') return vs.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === 'oldest') return vs.sort((a, b) => a.createdAt - b.createdAt);
    return vs.sort((a, b) => (data.views[b.id] ?? 0) - (data.views[a.id] ?? 0));
  }, [videos, route.params.id, sort, data.views]);

  if (!channel) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <EmptyState icon="alert-circle-outline" title="Channel not found" action="Go back" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const totalViews = list.reduce((n, v) => n + (data.views[v.id] ?? 0), 0);

  return (
    <View style={styles.root}>
      <FlatList
        data={list}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <CompactVideoRow video={item} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View>
            <View style={[styles.banner, { backgroundColor: colorFor(channel.name), paddingTop: insets.top }]}>
              <Pressable hitSlop={10} onPress={() => navigation.goBack()} style={styles.back}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.head}>
              <Avatar name={channel.name} size={72} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.name} numberOfLines={2}>{channel.name}</Text>
                <Text style={styles.meta}>{handleFor(channel.name)}</Text>
                <Text style={styles.meta}>{list.length} videos · {totalViews} views</Text>
              </View>
            </View>
            <Text style={styles.path} numberOfLines={1}>{channel.folderPath}</Text>
            <View style={styles.subWrap}>
              <SubscribeButton channelId={channel.id} channelName={channel.name} />
            </View>
            <View style={styles.tabs}>
              <Text style={styles.tabOn}>Videos</Text>
            </View>
            <Chips
              items={[{ key: 'latest', label: 'Latest' }, { key: 'popular', label: 'Popular' }, { key: 'oldest', label: 'Oldest' }]}
              value={sort}
              onChange={setSort}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  banner: { height: 130, opacity: 0.85 },
  back: { padding: 12 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16 },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  meta: { color: colors.sub, fontSize: 13, marginTop: 2 },
  path: { color: colors.faint, fontSize: 12, paddingHorizontal: 16, marginTop: 10 },
  subWrap: { paddingHorizontal: 16, marginTop: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface3 },
  tabOn: { color: colors.text, fontWeight: '600', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: colors.text },
});
