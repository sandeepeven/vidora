import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNav } from '../navigation/types';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';
import { formatViews, timeAgo } from '../utils/format';
import { Avatar } from './Avatar';
import { Thumbnail } from './Thumbnail';
import { useVideoMenu } from './VideoMenu';

/** Full-width home-feed card. */
export const VideoCard = memo(function VideoCard({ video }: { video: Video }) {
  const nav = useNav();
  const menu = useVideoMenu();
  const { data } = useUserData();
  const pos = data.positions[video.id] ?? 0;

  return (
    <Pressable onPress={() => nav.push('Watch', { id: video.id })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <Thumbnail video={video} style={styles.thumb} progress={video.duration ? pos / video.duration : 0} />
      <View style={styles.row}>
        <Pressable hitSlop={6} onPress={() => nav.push('Channel', { id: video.channelId })}>
          <Avatar name={video.channelName} size={36} />
        </Pressable>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {video.channelName} · {formatViews(data.views[video.id] ?? 0)} · {timeAgo(video.createdAt)}
          </Text>
        </View>
        <Pressable hitSlop={12} onPress={() => menu(video)} style={styles.more}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.text} />
        </Pressable>
      </View>
    </Pressable>
  );
});

/** Thumbnail-left row used in Up next, search, channel and playlists. */
export const CompactVideoRow = memo(function CompactVideoRow({
  video,
  onPress,
  replace,
}: {
  video: Video;
  onPress?: () => void;
  replace?: boolean;
}) {
  const nav = useNav();
  const menu = useVideoMenu();
  const { data } = useUserData();
  const pos = data.positions[video.id] ?? 0;
  const go = onPress ?? (() => (replace ? nav.replace('Watch', { id: video.id }) : nav.push('Watch', { id: video.id })));

  return (
    <Pressable onPress={go} style={({ pressed }) => [styles.compact, pressed && { backgroundColor: colors.surface }]}>
      <Thumbnail video={video} style={styles.compactThumb} radius={8} progress={video.duration ? pos / video.duration : 0} />
      <View style={styles.compactText}>
        <Text style={styles.compactTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.compactMeta} numberOfLines={1}>{video.channelName}</Text>
        <Text style={styles.compactMeta} numberOfLines={1}>
          {formatViews(data.views[video.id] ?? 0)} · {timeAgo(video.createdAt)}
        </Text>
      </View>
      <Pressable hitSlop={12} onPress={() => menu(video)} style={styles.more}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.text} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 20 },
  thumb: { width: '100%', aspectRatio: 16 / 9 },
  row: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10 },
  text: { flex: 1, marginLeft: 12 },
  title: { color: colors.text, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  meta: { color: colors.sub, fontSize: 12, marginTop: 4 },
  more: { paddingLeft: 8, paddingTop: 2 },
  compact: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6 },
  compactThumb: { width: 168, aspectRatio: 16 / 9 },
  compactText: { flex: 1, marginLeft: 10 },
  compactTitle: { color: colors.text, fontSize: 14, fontWeight: '500', lineHeight: 19, marginBottom: 4 },
  compactMeta: { color: colors.sub, fontSize: 12, marginTop: 1 },
});
