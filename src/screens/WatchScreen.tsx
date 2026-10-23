import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { CommentsSheet } from '../components/CommentsSheet';
import { EmptyState } from '../components/Common';
import { SubscribeButton } from '../components/SubscribeButton';
import { useToast } from '../components/Toast';
import { CompactVideoRow } from '../components/VideoCard';
import { useNav, type RootStackParamList } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';
import { compactNumber, formatDate, formatDuration, formatViews, timeAgo } from '../utils/format';
import { shareVideo } from '../utils/share';

type Props = NativeStackScreenProps<RootStackParamList, 'Watch'>;

export default function WatchScreen({ route, navigation }: Props) {
  const { byId } = useLibrary();
  const insets = useSafeAreaInsets();
  const video = byId.get(route.params.id);
  if (!video) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <EmptyState icon="alert-circle-outline" title="Video not found" body="It may have been moved or deleted." action="Go back" onAction={() => navigation.goBack()} />
      </View>
    );
  }
  return <Watch key={video.id} video={video} />;
}

function Watch({ video }: { video: Video }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const toast = useToast();
  const { videos, channelById } = useLibrary();
  const ud = useUserData();
  const { data } = ud;
  const [showDesc, setShowDesc] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const upNext = useMemo(() => {
    const others = videos.filter((v) => v.id !== video.id);
    const same = others.filter((v) => v.channelId === video.channelId);
    const rest = others.filter((v) => v.channelId !== video.channelId);
    return [...same, ...rest].slice(0, 40);
  }, [videos, video.id, video.channelId]);

  // ---- player ----
  const startAt = useRef(data.positions[video.id] ?? 0).current;
  const posRef = useRef(startAt);
  const seeked = useRef(false);
  const nextRef = useRef<Video | undefined>(upNext[0]);
  nextRef.current = upNext[0];
  const autoplayRef = useRef(data.autoplay);
  autoplayRef.current = data.autoplay;

  const player = useVideoPlayer({ uri: video.uri }, (p) => {
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  useEffect(() => {
    ud.addView(video.id);
    ud.addHistory(video.id);
    const subs = [
      player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay' && !seeked.current) {
          seeked.current = true;
          if (startAt > 3 && startAt < video.duration - 5) {
            player.currentTime = startAt;
            toast(`Resumed from ${formatDuration(startAt)}`);
          }
        }
        if (status === 'error') toast("Can't play this file format");
      }),
      player.addListener('timeUpdate', ({ currentTime }) => {
        posRef.current = currentTime;
      }),
      player.addListener('playToEnd', () => {
        posRef.current = 0;
        ud.savePosition(video.id, 0, video.duration);
        const next = nextRef.current;
        if (autoplayRef.current && next) nav.replace('Watch', { id: next.id });
      }),
    ];
    const saver = setInterval(() => ud.savePosition(video.id, posRef.current, video.duration), 10_000);
    return () => {
      subs.forEach((s) => s.remove());
      clearInterval(saver);
      ud.savePosition(video.id, posRef.current, video.duration);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  // ---- reactions ----
  const reaction = data.reactions[video.id];
  const like = () => {
    ud.setReaction(video.id, reaction === 'like' ? null : 'like');
    if (reaction !== 'like') toast('Added to Liked videos');
  };
  const dislike = () => {
    ud.setReaction(video.id, reaction === 'dislike' ? null : 'dislike');
    if (reaction !== 'dislike') toast('You dislike this video');
  };
  const saved = data.watchLater.includes(video.id);
  const comments = data.comments[video.id] ?? [];
  const latestComment = comments.find((c) => !c.parentId);
  const channel = channelById.get(video.channelId);

  const header = (
    <View>
      <Pressable onPress={() => setShowDesc((s) => !s)} style={styles.info}>
        <Text style={styles.title}>{video.title}</Text>
        <Text style={styles.meta}>
          {formatViews(data.views[video.id] ?? 0)}  {timeAgo(video.createdAt)}  <Text style={styles.more}>{showDesc ? 'less' : '...more'}</Text>
        </Text>
      </Pressable>

      {showDesc ? (
        <View style={styles.desc}>
          <DescRow icon="document-outline" label="File" value={video.filename} />
          <DescRow icon="folder-outline" label="Folder" value={video.folderPath} />
          <DescRow icon="time-outline" label="Length" value={formatDuration(video.duration)} />
          {video.width ? <DescRow icon="resize-outline" label="Resolution" value={`${video.width} × ${video.height}`} /> : null}
          <DescRow icon="calendar-outline" label="Added" value={formatDate(video.createdAt)} />
          <DescRow icon="cloud-offline-outline" label="Status" value="Stored on this device — plays offline" />
        </View>
      ) : null}

      <View style={styles.channelRow}>
        <Pressable style={styles.channelLeft} onPress={() => nav.push('Channel', { id: video.channelId })}>
          <Avatar name={video.channelName} size={36} />
          <Text style={styles.channelName} numberOfLines={1}>{video.channelName}</Text>
          <Text style={styles.subs}>{channel ? `${channel.videoCount} videos` : ''}</Text>
        </Pressable>
        <SubscribeButton channelId={video.channelId} channelName={video.channelName} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        <View style={styles.pill}>
          <Pressable style={styles.pillHalf} onPress={like}>
            <Ionicons name={reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={colors.text} />
            <Text style={styles.pillText}>{reaction === 'like' ? compactNumber(1) : 'Like'}</Text>
          </Pressable>
          <View style={styles.pillDivider} />
          <Pressable style={styles.pillHalf} onPress={dislike}>
            <Ionicons name={reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={colors.text} />
          </Pressable>
        </View>
        <Pill icon="share-social-outline" label="Share" onPress={() => shareVideo(video).then((ok) => !ok && toast("Couldn't share this file"))} />
        <Pill
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          label={saved ? 'Saved' : 'Save'}
          onPress={() => toast(ud.toggleWatchLater(video.id) ? 'Saved to Watch later' : 'Removed from Watch later')}
        />
        <Pill icon="checkmark-circle" label="Downloaded" onPress={() => toast('Already on your device')} />
        <Pill icon="cut-outline" label="Clip" onPress={() => toast('Clipping is not available offline')} />
      </ScrollView>

      <Pressable style={styles.commentsCard} onPress={() => setShowComments(true)}>
        <Text style={styles.commentsTitle}>
          Comments <Text style={styles.commentsCount}>{comments.length || ''}</Text>
        </Text>
        <View style={styles.commentsPreview}>
          {latestComment ? (
            <>
              <Avatar name={latestComment.author} size={24} />
              <Text style={styles.commentsText} numberOfLines={2}>{latestComment.text}</Text>
            </>
          ) : (
            <>
              <Avatar name={data.profileName} size={24} />
              <View style={styles.fakeInput}>
                <Text style={styles.fakeInputText}>Add a comment...</Text>
              </View>
            </>
          )}
        </View>
      </Pressable>

      <View style={styles.upNextHead}>
        <Text style={styles.upNextTitle}>Up next</Text>
        <View style={styles.autoplay}>
          <Text style={styles.autoplayText}>Autoplay</Text>
          <Switch
            value={data.autoplay}
            onValueChange={ud.setAutoplay}
            trackColor={{ false: colors.surface3, true: colors.text }}
            thumbColor={data.autoplay ? colors.bg : colors.sub}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.playerBox}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls
          allowsFullscreen
          allowsPictureInPicture
        />
        <Pressable style={styles.collapse} hitSlop={10} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-down" size={24} color="#fff" />
        </Pressable>
      </View>
      <FlatList
        data={upNext}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <CompactVideoRow video={item} replace />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        initialNumToRender={6}
      />
      <CommentsSheet videoId={video.id} visible={showComments} onClose={() => setShowComments(false)} />
    </View>
  );
}

function Pill({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, styles.pillSolo, pressed && { backgroundColor: colors.surface3 }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

function DescRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.descRow}>
      <Ionicons name={icon} size={16} color={colors.sub} />
      <Text style={styles.descLabel}>{label}</Text>
      <Text style={styles.descValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  playerBox: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  collapse: { position: 'absolute', top: 8, left: 8, padding: 4, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)' },
  info: { paddingHorizontal: 12, paddingTop: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  meta: { color: colors.sub, fontSize: 12, marginTop: 6 },
  more: { color: colors.text, fontWeight: '600' },
  desc: { marginHorizontal: 12, marginTop: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 8 },
  descRow: { flexDirection: 'row', alignItems: 'flex-start' },
  descLabel: { color: colors.sub, width: 82, marginLeft: 8, fontSize: 13 },
  descValue: { color: colors.text, flex: 1, fontSize: 13 },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14 },
  channelLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  channelName: { color: colors.text, fontSize: 15, fontWeight: '600', marginLeft: 10, flexShrink: 1 },
  subs: { color: colors.sub, fontSize: 12, marginLeft: 8 },
  pills: { paddingHorizontal: 12, paddingVertical: 14, gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: 18, height: 36 },
  pillSolo: { paddingHorizontal: 14, gap: 6 },
  pillHalf: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 36, gap: 6 },
  pillDivider: { width: 1, height: 22, backgroundColor: colors.surface3 },
  pillText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  commentsCard: { marginHorizontal: 12, backgroundColor: colors.surface, borderRadius: 12, padding: 12 },
  commentsTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  commentsCount: { color: colors.sub, fontWeight: '400' },
  commentsPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  commentsText: { color: colors.text, flex: 1, fontSize: 13 },
  fakeInput: { flex: 1, backgroundColor: colors.surface2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  fakeInputText: { color: colors.faint, fontSize: 13 },
  upNextHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 4 },
  upNextTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  autoplay: { flexDirection: 'row', alignItems: 'center' },
  autoplayText: { color: colors.sub, fontSize: 13, marginRight: 4 },
});

