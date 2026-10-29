import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  FlatList,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type GestureResponderHandlers,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { CommentsSheet } from '../components/CommentsSheet';
import { SpeedHold } from '../components/SpeedHold';
import { SubscribeButton } from '../components/SubscribeButton';
import { useToast } from '../components/Toast';
import { CompactVideoRow } from '../components/VideoCard';
import { useNav } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { usePlayer } from '../state/PlayerContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';
import { compactNumber, formatDate, formatDuration, formatViews, timeAgo } from '../utils/format';
import { LOCAL_BUFFER } from '../utils/player';
import { shareVideo } from '../utils/share';

const MINI_H = 64;
const MINI_W = Math.round((MINI_H * 16) / 9);
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

/** Animated styles for each part of the player, driven by the overlay's minimize progress. */
type Frame = {
  row: object;
  videoBox: object;
  mini: object;
  miniProgress: object;
  details: object;
  panHandlers: GestureResponderHandlers;
};

/**
 * The watch page lives above the navigator instead of inside it, so the video keeps
 * playing when it's dragged down into the miniplayer and the user browses elsewhere.
 * `progress` runs from 0 (full page) to 1 (miniplayer docked above the tab bar).
 */
export default function WatchOverlay({ bottomOffset, hideMini }: { bottomOffset: number; hideMini: boolean }) {
  const { videoId, minimized, expand, minimize, close } = usePlayer();
  const hidden = hideMini && minimized;
  const { byId } = useLibrary();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const progress = useRef(new Animated.Value(1)).current;
  // Extra downward drag on the miniplayer, which dismisses it.
  const drop = useRef(new Animated.Value(0)).current;
  const video = videoId ? byId.get(videoId) : undefined;
  const range = Math.max(1, size.h - bottomOffset - MINI_H);

  const animateTo = useCallback(
    (to: number) => Animated.spring(progress, { toValue: to, useNativeDriver: false, bounciness: 0, speed: 14 }).start(),
    [progress],
  );

  // Slide up from the bottom on open, then follow minimize/expand requests from anywhere in the app.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!videoId) {
      wasOpen.current = false;
      return;
    }
    if (!wasOpen.current) {
      wasOpen.current = true;
      progress.setValue(1);
      drop.setValue(0);
    }
    animateTo(minimized ? 1 : 0);
  }, [videoId, minimized, animateTo, progress, drop]);

  useEffect(() => {
    if (videoId && !video) close();
  }, [videoId, video, close]);

  // Android back shrinks the player rather than leaving the screen underneath.
  useEffect(() => {
    if (!videoId || minimized) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      minimize();
      return true;
    });
    return () => sub.remove();
  }, [videoId, minimized, minimize]);

  const live = useRef({ minimized, range, expand, minimize, close });
  live.current = { minimized, range, expand, minimize, close };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Capture only clear vertical drags so taps still reach the player controls.
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderGrant: () => progress.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const l = live.current;
          if (l.minimized && g.dy > 0) drop.setValue(g.dy);
          else progress.setValue(clamp((l.minimized ? 1 : 0) + g.dy / l.range));
        },
        onPanResponderRelease: (_, g) => {
          const l = live.current;
          if (l.minimized) {
            if (g.dy > 30 || (g.dy > 0 && g.vy > 0.6)) {
              Animated.timing(drop, { toValue: MINI_H * 1.5, duration: 160, useNativeDriver: false }).start(() => l.close());
              return;
            }
            Animated.spring(drop, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
            if (g.dy < -l.range * 0.15 || g.vy < -0.6) {
              l.expand();
              animateTo(0);
            } else animateTo(1);
          } else if (g.dy > l.range * 0.25 || (g.dy > 0 && g.vy > 0.6)) {
            l.minimize();
            animateTo(1);
          } else animateTo(0);
        },
        onPanResponderTerminate: () => {
          Animated.spring(drop, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start();
          animateTo(live.current.minimized ? 1 : 0);
        },
      }),
    [progress, drop, animateTo],
  );

  const { w: W, h: H } = size;
  const videoH = Math.min((W * 9) / 16, H - insets.top);
  const lerp = (a: number, b: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const frame: Frame = {
    row: { flexDirection: 'row', paddingTop: lerp(insets.top, 0) },
    videoBox: { width: lerp(W, MINI_W), height: lerp(videoH, MINI_H), backgroundColor: '#000' },
    mini: { flex: 1, height: MINI_H, opacity: progress.interpolate({ inputRange: [0.6, 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
    miniProgress: { opacity: progress.interpolate({ inputRange: [0.9, 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
    details: {
      position: 'absolute',
      top: insets.top + videoH,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: progress.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }),
    },
    panHandlers: pan.panHandlers,
  };

  return (
    <View
      style={[StyleSheet.absoluteFill, hidden && styles.hidden]}
      pointerEvents={hidden ? 'none' : 'box-none'}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {video && H > 0 ? (
        <Animated.View
          style={[
            styles.sheet,
            {
              height: lerp(H, MINI_H),
              opacity: drop.interpolate({ inputRange: [0, MINI_H * 1.5], outputRange: [1, 0], extrapolate: 'clamp' }),
              transform: [{ translateY: Animated.add(lerp(0, range), drop) }],
            },
          ]}
        >
          <View style={{ height: H }}>
            <Watch key={video.id} video={video} minimized={minimized} suspended={hidden} frame={frame} />
          </View>
          {minimized ? <View style={styles.miniBorder} pointerEvents="none" /> : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Watch({ video, minimized, suspended, frame }: { video: Video; minimized: boolean; suspended: boolean; frame: Frame }) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const toast = useToast();
  const playerCtx = usePlayer();
  const { videos, channelById } = useLibrary();
  const ud = useUserData();
  const { data } = ud;
  const [showDesc, setShowDesc] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const viewRef = useRef<VideoView>(null);
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
    p.timeUpdateEventInterval = 0.5;
    p.bufferOptions = LOCAL_BUFFER;
    p.play();
  });

  // Shorts has its own audio, so the miniplayer steps aside while that tab is open.
  useEffect(() => {
    if (suspended) player.pause();
  }, [suspended, player]);

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
        if (autoplayRef.current && next) playerCtx.open(next.id, false);
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
        <Pressable
          style={styles.channelLeft}
          onPress={() => {
            playerCtx.minimize();
            nav.push('Channel', { id: video.channelId });
          }}
        >
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
    <View style={styles.root}>
      <Animated.View style={frame.row} {...frame.panHandlers}>
        <Animated.View style={frame.videoBox}>
          <VideoView
            ref={viewRef}
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen
            allowsPictureInPicture
          />
          <PlayerControls
            player={player}
            duration={video.duration}
            minimized={minimized}
            onMinimize={playerCtx.minimize}
            onExpand={playerCtx.expand}
            viewRef={viewRef}
          />
        </Animated.View>
        <Animated.View style={frame.mini} pointerEvents={minimized ? 'auto' : 'none'}>
          <Pressable style={styles.miniBar} onPress={playerCtx.expand}>
            <View style={styles.miniText}>
              <Text style={styles.miniTitle} numberOfLines={1}>{video.title}</Text>
              <Text style={styles.miniChannel} numberOfLines={1}>{video.channelName}</Text>
            </View>
            <PlayPause player={player} size={26} style={styles.miniBtn} />
            <Pressable hitSlop={8} style={styles.miniBtn} onPress={playerCtx.close}>
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.miniProgress, frame.miniProgress]} pointerEvents="none">
          <TimeBar player={player} duration={video.duration} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={frame.details} pointerEvents={minimized ? 'none' : 'auto'}>
        <FlatList
          data={upNext}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => <CompactVideoRow video={item} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          initialNumToRender={6}
        />
      </Animated.View>
      <CommentsSheet videoId={video.id} visible={showComments} onClose={() => setShowComments(false)} />
    </View>
  );
}

/** Current playback position, refreshed on the player's timeUpdate events. */
function useCurrentTime(player: VideoPlayer) {
  const [time, setTime] = useState(player.currentTime);
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => setTime(currentTime));
    return () => sub.remove();
  }, [player]);
  return time;
}

function PlayPause({ player, size, style }: { player: VideoPlayer; size: number; style?: object }) {
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  return (
    <Pressable hitSlop={8} style={style} onPress={() => (isPlaying ? player.pause() : player.play())}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={size} color={colors.text} />
    </Pressable>
  );
}

/** Thin progress line along the bottom of the miniplayer. */
function TimeBar({ player, duration }: { player: VideoPlayer; duration: number }) {
  const time = useCurrentTime(player);
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${duration ? clamp(time / duration) * 100 : 0}%` }]} />
    </View>
  );
}

function PlayerControls({
  player,
  duration,
  minimized,
  onMinimize,
  onExpand,
  viewRef,
}: {
  player: VideoPlayer;
  duration: number;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
  viewRef: React.RefObject<VideoView | null>;
}) {
  const time = useCurrentTime(player);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const [visible, setVisible] = useState(true);
  const [poke, setPoke] = useState(0);
  const total = player.duration || duration;

  // Auto-hide like YouTube; any interaction restarts the countdown.
  useEffect(() => {
    if (!visible || !isPlaying || minimized) return;
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, [visible, isPlaying, minimized, poke]);

  if (minimized) return <Pressable style={StyleSheet.absoluteFill} onPress={onExpand} />;

  const act = (fn: () => void) => () => {
    fn();
    setPoke((n) => n + 1);
  };
  const seekBy = (d: number) => {
    player.currentTime = clamp(player.currentTime + d, 0, total || Infinity);
  };

  return (
    <SpeedHold player={player} onTap={() => setVisible((v) => !v)}>
      {visible ? (
        <View style={[StyleSheet.absoluteFill, styles.scrim]}>
          <View style={styles.ctrlTop}>
            <Pressable hitSlop={10} onPress={onMinimize}>
              <Ionicons name="chevron-down" size={26} color="#fff" />
            </Pressable>
            <Pressable hitSlop={10} onPress={act(() => viewRef.current?.startPictureInPicture())}>
              <Ionicons name="albums-outline" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.ctrlCenter}>
            <Pressable hitSlop={10} style={styles.ctrlRound} onPress={act(() => seekBy(-10))}>
              <Ionicons name="play-back" size={24} color="#fff" />
            </Pressable>
            <Pressable hitSlop={10} style={[styles.ctrlRound, styles.ctrlPlay]} onPress={act(() => (isPlaying ? player.pause() : player.play()))}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={36} color="#fff" />
            </Pressable>
            <Pressable hitSlop={10} style={styles.ctrlRound} onPress={act(() => seekBy(10))}>
              <Ionicons name="play-forward" size={24} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.ctrlBottom}>
            <Text style={styles.ctrlTime}>
              {formatDuration(time)} / {formatDuration(total)}
            </Text>
            <Pressable hitSlop={10} onPress={act(() => viewRef.current?.enterFullscreen())}>
              <Ionicons name="expand" size={20} color="#fff" />
            </Pressable>
          </View>
          <SeekBar
            value={total ? time / total : 0}
            onScrub={() => setPoke((n) => n + 1)}
            onSeek={(f) => {
              player.currentTime = f * total;
            }}
          />
        </View>
      ) : null}
    </SpeedHold>
  );
}

function SeekBar({ value, onSeek, onScrub }: { value: number; onSeek: (fraction: number) => void; onScrub: () => void }) {
  const [width, setWidth] = useState(1);
  const [scrub, setScrub] = useState<number | null>(null);
  const start = useRef(0);
  const latest = useRef({ width, onSeek, onScrub, scrub });
  latest.current = { width, onSeek, onScrub, scrub };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Keep the drag even when it drifts vertically, so it isn't read as a minimize swipe.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          start.current = e.nativeEvent.locationX;
          setScrub(clamp(start.current / latest.current.width));
          latest.current.onScrub();
        },
        onPanResponderMove: (_, g) => {
          setScrub(clamp((start.current + g.dx) / latest.current.width));
          latest.current.onScrub();
        },
        onPanResponderRelease: (_, g) => {
          latest.current.onSeek(clamp((start.current + g.dx) / latest.current.width));
          setScrub(null);
        },
        onPanResponderTerminate: () => setScrub(null),
      }),
    [],
  );

  const shown = clamp(scrub ?? value);
  return (
    <View style={styles.seek} onLayout={(e) => setWidth(e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${shown * 100}%` }]} />
      </View>
      <View style={[styles.thumb, { left: `${shown * 100}%` }, scrub != null && styles.thumbActive]} />
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
  hidden: { opacity: 0 },
  sheet: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden', backgroundColor: colors.bg },
  miniBorder: { position: 'absolute', left: 0, right: 0, top: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  root: { flex: 1, backgroundColor: colors.bg },
  miniBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, backgroundColor: colors.surface },
  miniText: { flex: 1, marginRight: 4 },
  miniTitle: { color: colors.text, fontSize: 14, fontWeight: '500' },
  miniChannel: { color: colors.sub, fontSize: 12, marginTop: 2 },
  miniBtn: { paddingHorizontal: 10, height: MINI_H, justifyContent: 'center' },
  miniProgress: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'space-between' },
  ctrlTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  ctrlCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 36 },
  ctrlRound: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  ctrlPlay: { width: 60, height: 60, borderRadius: 30 },
  ctrlBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 6 },
  ctrlTime: { color: '#fff', fontSize: 12, fontWeight: '500' },
  seek: { height: 16, justifyContent: 'flex-end', marginBottom: -1 },
  track: { height: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  fill: { height: 3, backgroundColor: colors.accent },
  thumb: { position: 'absolute', bottom: -4, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: colors.accent },
  thumbActive: { width: 18, height: 18, marginLeft: -9, bottom: -7, borderRadius: 9 },
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

