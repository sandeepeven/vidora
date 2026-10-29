import { Ionicons } from '@expo/vector-icons';
import type { VideoPlayer } from 'expo-video';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

const HOLD_MS = 300;
/** Fraction of the width on each side that counts as an edge. */
const EDGE = 0.3;
const MOVE_SLOP = 10;
/** How far to pull down while holding before 2x locks on. */
const LOCK_PULL = 70;
const FAST = 2;

type Mode = 'off' | 'held' | 'locked';

type Props = {
  player: VideoPlayer;
  /** A plain tap that didn't turn into a hold. */
  onTap: () => void;
  /** Pulling down while holding keeps 2x on after release; holding again turns it off. */
  lockable?: boolean;
  /** Switching this off drops back to 1x, e.g. when a short scrolls away. */
  enabled?: boolean;
  /** True while a finger is holding 2x, so parents can pause competing gestures. */
  onHoldChange?: (holding: boolean) => void;
  badgeTop?: number;
  children?: React.ReactNode;
};

/** Touch layer over a video: hold either edge to play at 2x, like YouTube. */
export function SpeedHold({ player, onTap, lockable = false, enabled = true, onHoldChange, badgeTop = 12, children }: Props) {
  const [mode, setMode] = useState<Mode>('off');
  const width = useRef(1);
  const modeRef = useRef<Mode>('off');
  const startMode = useRef<Mode>('off');
  const moved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef({ player, onTap, lockable, onHoldChange });
  live.current = { player, onTap, lockable, onHoldChange };

  const apply = (m: Mode) => {
    const prev = modeRef.current;
    if (prev === m) return;
    modeRef.current = m;
    setMode(m);
    try {
      live.current.player.playbackRate = m === 'off' ? 1 : FAST;
    } catch {
      // Player already released (item unmounted).
    }
    if (m === 'held') live.current.onHoldChange?.(true);
    else if (prev === 'held') live.current.onHoldChange?.(false);
  };

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Hold on to the finger while 2x is held, so a drift isn't read as a scroll or minimize.
        onPanResponderTerminationRequest: () => modeRef.current !== 'held',
        onPanResponderGrant: (e) => {
          moved.current = false;
          startMode.current = modeRef.current;
          const x = e.nativeEvent.locationX;
          const onEdge = x < width.current * EDGE || x > width.current * (1 - EDGE);
          // Off: hold an edge for 2x. Locked: hold anywhere to drop back to 1x.
          const next: Mode | null = modeRef.current === 'locked' ? 'off' : onEdge && modeRef.current === 'off' ? 'held' : null;
          if (next) {
            timer.current = setTimeout(() => {
              timer.current = null;
              apply(next);
            }, HOLD_MS);
          }
        },
        onPanResponderMove: (_, g) => {
          if (modeRef.current === 'held') {
            if (live.current.lockable && g.dy > LOCK_PULL) apply('locked');
            return;
          }
          if (Math.abs(g.dx) > MOVE_SLOP || Math.abs(g.dy) > MOVE_SLOP) {
            moved.current = true;
            clearTimer();
          }
        },
        onPanResponderRelease: () => {
          clearTimer();
          const m = modeRef.current;
          if (m === 'held') return apply('off');
          // This gesture locked or unlocked 2x; it isn't a tap.
          if (m !== startMode.current) return;
          if (moved.current) return;
          live.current.onTap();
        },
        onPanResponderTerminate: () => {
          clearTimer();
          if (modeRef.current === 'held') apply('off');
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!enabled) apply('off');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(
    () => () => {
      clearTimer();
      if (modeRef.current !== 'off') {
        try {
          live.current.player.playbackRate = 1;
        } catch {
          // Player already released.
        }
        if (modeRef.current === 'held') live.current.onHoldChange?.(false);
      }
    },
    [],
  );

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => (width.current = e.nativeEvent.layout.width || 1)} {...pan.panHandlers}>
      {children}
      {mode !== 'off' ? (
        <View style={[styles.badgeWrap, { top: badgeTop }]} pointerEvents="none">
          <View style={styles.badge}>
            <Text style={styles.badgeText}>2x</Text>
            <Ionicons name={mode === 'locked' ? 'lock-closed' : 'play-forward'} size={14} color="#fff" />
          </View>
          {lockable ? <Text style={styles.hint}>{mode === 'held' ? 'Pull down to lock' : 'Hold to unlock'}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  hint: {
    color: '#fff',
    fontSize: 12,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});
