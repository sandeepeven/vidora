import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNav } from '../navigation/types';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';
import { shareVideo } from '../utils/share';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

const MenuCtx = createContext<(v: Video) => void>(() => undefined);
export const useVideoMenu = () => useContext(MenuCtx);

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** The "⋮" sheet shown for any video card. */
export function VideoMenuProvider({ children }: { children: React.ReactNode }) {
  const [video, setVideo] = useState<Video | null>(null);
  const nav = useNav();
  const toast = useToast();
  const { data, toggleWatchLater, removeHistory, setReaction } = useUserData();
  const open = useCallback((v: Video) => setVideo(v), []);
  const close = () => setVideo(null);

  const items: { icon: IconName; label: string; run: () => void; show?: boolean }[] = video
    ? [
        {
          icon: data.watchLater.includes(video.id) ? 'time' : 'time-outline',
          label: data.watchLater.includes(video.id) ? 'Remove from Watch later' : 'Save to Watch later',
          run: () => toast(toggleWatchLater(video.id) ? 'Saved to Watch later' : 'Removed from Watch later'),
        },
        {
          icon: 'share-social-outline',
          label: 'Share',
          run: () => shareVideo(video).then((ok) => !ok && toast("Couldn't share this file")),
        },
        { icon: 'person-circle-outline', label: 'Go to channel', run: () => nav.navigate('Channel', { id: video.channelId }) },
        {
          icon: 'trash-outline',
          label: 'Remove from watch history',
          show: data.history.some((h) => h.id === video.id),
          run: () => { removeHistory(video.id); toast('Removed from history'); },
        },
        {
          icon: 'remove-circle-outline',
          label: 'Not interested',
          run: () => { setReaction(video.id, 'dislike'); toast("Got it — we'll show this less"); },
        },
      ]
    : [];

  return (
    <MenuCtx.Provider value={open}>
      {children}
      <Sheet visible={!!video} onClose={close}>
        {items
          .filter((i) => i.show !== false)
          .map((i) => (
            <Pressable
              key={i.label}
              onPress={() => { close(); i.run(); }}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface2 }]}
            >
              <Ionicons name={i.icon} size={22} color={colors.text} />
              <Text style={styles.label}>{i.label}</Text>
            </Pressable>
          ))}
        <View style={{ height: 6 }} />
      </Sheet>
    </MenuCtx.Provider>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  label: { color: colors.text, fontSize: 15, marginLeft: 18 },
});
