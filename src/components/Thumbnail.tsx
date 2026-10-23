import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getThumb, peekThumb } from '../data/thumbs';
import { colors } from '../theme';
import type { Video } from '../types';
import { formatDuration } from '../utils/format';

type Props = {
  video: Video;
  style?: StyleProp<ViewStyle>;
  /** 0..1 watched fraction, draws the red bar */
  progress?: number;
  showDuration?: boolean;
  radius?: number;
  fit?: 'cover' | 'contain';
};

export function Thumbnail({ video, style, progress = 0, showDuration = true, radius = 0, fit = 'cover' }: Props) {
  const [uri, setUri] = useState<string | null>(() => peekThumb(video.id));
  const retried = useRef(false);

  useEffect(() => {
    let alive = true;
    const cached = peekThumb(video.id);
    setUri(cached);
    if (!cached) getThumb(video).then((u) => alive && setUri(u));
    return () => {
      alive = false;
    };
  }, [video.id]);

  const onError = () => {
    if (retried.current) return setUri(null);
    retried.current = true;
    getThumb(video, true).then(setUri);
  };

  return (
    <View style={[styles.box, { borderRadius: radius }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode={fit} onError={onError} />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons name="film-outline" size={28} color={colors.faint} />
        </View>
      )}
      {showDuration && video.duration > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatDuration(video.duration)}</Text>
        </View>
      ) : null}
      {progress > 0.01 ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface2, overflow: 'hidden' },
  placeholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  fill: { height: 3, backgroundColor: colors.accent },
});
