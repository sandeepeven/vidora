import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { CommentsSheet } from '../components/CommentsSheet';
import { EmptyState } from '../components/Common';
import { SubscribeButton } from '../components/SubscribeButton';
import { useToast } from '../components/Toast';
import { useVideoMenu } from '../components/VideoMenu';
import { useNav } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import { isShort, type Video } from '../types';
import { compactNumber } from '../utils/format';
import { shareVideo } from '../utils/share';

export default function ShortsScreen() {
  const { videos } = useLibrary();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const shorts = useMemo(() => videos.filter(isShort), [videos]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActive(first.index);
  }).current;

  if (!shorts.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <EmptyState
          icon="flash-outline"
          title="No Shorts yet"
          body="Videos that are 60 seconds or shorter, or recorded in portrait, show up here."
        />
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 ? (
        <FlatList
          data={shorts}
          keyExtractor={(v) => v.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          renderItem={({ item, index }) => (
            <ShortItem
              video={item}
              height={height}
              active={focused && index === active}
              onComments={() => setCommentsFor(item.id)}
            />
          )}
        />
      ) : null}
      <View style={[styles.topBar, { top: insets.top + 6 }]} pointerEvents="box-none">
        <Text style={styles.topTitle}>Shorts</Text>
      </View>
      {commentsFor ? <CommentsSheet videoId={commentsFor} visible onClose={() => setCommentsFor(null)} /> : null}
    </View>
  );
}

function ShortItem({
  video,
  height,
  active,
  onComments,
}: {
  video: Video;
  height: number;
  active: boolean;
  onComments: () => void;
}) {
  const ud = useUserData();
  const toast = useToast();
  const menu = useVideoMenu();
  const nav = useNav();
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer({ uri: video.uri }, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (active && !paused) player.play();
    else player.pause();
  }, [active, paused, player]);

  useEffect(() => {
    if (!active) {
      setPaused(false);
      return;
    }
    ud.addView(video.id);
    ud.addHistory(video.id);
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      if (video.duration) setProgress(currentTime / video.duration);
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const reaction = ud.data.reactions[video.id];
  const commentCount = (ud.data.comments[video.id] ?? []).length;
  const toggle = useCallback(() => setPaused((p) => !p), []);

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={video.height > video.width ? 'cover' : 'contain'}
        nativeControls={false}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={toggle}>
        {paused ? (
          <View style={styles.pauseIcon}>
            <Ionicons name="play" size={44} color="#fff" />
          </View>
        ) : null}
      </Pressable>

      <View style={[styles.side, { bottom: 24 }]}>
        <SideBtn
          icon={reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
          label={reaction === 'like' ? '1' : 'Like'}
          onPress={() => ud.setReaction(video.id, reaction === 'like' ? null : 'like')}
        />
        <SideBtn
          icon={reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
          label="Dislike"
          onPress={() => ud.setReaction(video.id, reaction === 'dislike' ? null : 'dislike')}
        />
        <SideBtn icon="chatbubble-ellipses-outline" label={commentCount ? compactNumber(commentCount) : '0'} onPress={onComments} />
        <SideBtn icon="arrow-redo-outline" label="Share" onPress={() => shareVideo(video).then((ok) => !ok && toast("Couldn't share this file"))} />
        <SideBtn icon="ellipsis-horizontal" label="" onPress={() => menu(video)} />
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.channelRow}>
          <Pressable style={styles.channelLeft} onPress={() => nav.push('Channel', { id: video.channelId })}>
            <Avatar name={video.channelName} size={32} />
            <Text style={styles.channel} numberOfLines={1}>{video.channelName}</Text>
          </Pressable>
          <SubscribeButton channelId={video.channelId} channelName={video.channelName} compact />
        </View>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
    </View>
  );
}

function SideBtn({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.sideBtn} hitSlop={6}>
      <View style={styles.sideCircle}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      {label ? <Text style={styles.sideLabel}>{label}</Text> : null}
    </Pressable>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: { position: 'absolute', left: 16 },
  topTitle: { color: '#fff', fontSize: 20, fontWeight: '700', ...shadow },
  pauseIcon: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: { position: 'absolute', right: 8, alignItems: 'center', gap: 14 },
  sideBtn: { alignItems: 'center' },
  sideCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  sideLabel: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '600', ...shadow },
  bottom: { position: 'absolute', left: 12, right: 76, bottom: 20 },
  channelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  channelLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 10 },
  channel: { color: '#fff', fontWeight: '600', marginLeft: 8, flexShrink: 1, ...shadow },
  title: { color: '#fff', fontSize: 14, lineHeight: 19, ...shadow },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  fill: { height: 2, backgroundColor: colors.accent },
});
