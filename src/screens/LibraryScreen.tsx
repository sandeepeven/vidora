import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { SectionHeader } from '../components/Common';
import { Thumbnail } from '../components/Thumbnail';
import { useToast } from '../components/Toast';
import { clearThumbCache } from '../data/thumbs';
import { useNav, type PlaylistKind } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import type { Video } from '../types';
import { handleFor } from '../utils/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function LibraryScreen() {
  const nav = useNav();
  const toast = useToast();
  const { byId, videos, channels, refresh } = useLibrary();
  const ud = useUserData();
  const { data } = ud;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.profileName);

  const history = useMemo(() => data.history.map((h) => byId.get(h.id)).filter(Boolean).slice(0, 20) as Video[], [data.history, byId]);
  const likedCount = Object.values(data.reactions).filter((r) => r === 'like').length;
  const commentCount = Object.values(data.comments).reduce((n: number, l: unknown[]) => n + l.length, 0);

  const open = (kind: PlaylistKind) => nav.push('Playlist', { kind });

  const rows: { icon: IconName; label: string; sub?: string; onPress: () => void }[] = [
    { icon: 'time-outline', label: 'History', sub: `${data.history.length} videos`, onPress: () => open('history') },
    { icon: 'bookmark-outline', label: 'Watch later', sub: `${data.watchLater.length} videos`, onPress: () => open('watchLater') },
    { icon: 'thumbs-up-outline', label: 'Liked videos', sub: `${likedCount} videos`, onPress: () => open('liked') },
    { icon: 'download-outline', label: 'Downloads', sub: `${videos.length} videos · all offline`, onPress: () => open('all') },
  ];

  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.profile}>
          <Avatar name={data.profileName} size={72} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.name}>{data.profileName}</Text>
            <Text style={styles.handle}>{handleFor(data.profileName)} · {channels.length} channels on device</Text>
            <Pressable onPress={() => { setName(data.profileName); setEditing(true); }}>
              <Text style={styles.link}>Edit name  ›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat n={videos.length} label="Videos" />
          <Stat n={data.subscriptions.length} label="Subscriptions" />
          <Stat n={commentCount} label="Comments" />
        </View>

        <SectionHeader title="History" action={history.length ? 'View all' : undefined} onAction={() => open('history')} />
        {history.length ? (
          <FlatList
            horizontal
            data={history}
            keyExtractor={(v) => v.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 10 }}
            renderItem={({ item }) => (
              <Pressable style={{ width: 160 }} onPress={() => nav.push('Watch', { id: item.id })}>
                <Thumbnail
                  video={item}
                  style={{ width: 160, aspectRatio: 16 / 9 }}
                  radius={8}
                  progress={item.duration ? (data.positions[item.id] ?? 0) / item.duration : 0}
                />
                <Text style={styles.histTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.histMeta} numberOfLines={1}>{item.channelName}</Text>
              </Pressable>
            )}
          />
        ) : (
          <Text style={styles.muted}>Videos you watch will show up here.</Text>
        )}

        <View style={styles.list}>
          {rows.map((r) => (
            <Row key={r.label} icon={r.icon} label={r.label} sub={r.sub} onPress={r.onPress} />
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Ionicons name="play-forward-outline" size={22} color={colors.text} />
          <Text style={[styles.rowLabel, { flex: 1 }]}>Autoplay next video</Text>
          <Switch
            value={data.autoplay}
            onValueChange={ud.setAutoplay}
            trackColor={{ false: colors.surface3, true: colors.text }}
            thumbColor={data.autoplay ? colors.bg : colors.sub}
          />
        </View>
        <Row
          icon="refresh-outline"
          label="Rescan device for videos"
          onPress={async () => {
            await clearThumbCache();
            await refresh();
            toast('Library updated');
          }}
        />
        <Row
          icon="trash-outline"
          label="Clear watch history"
          onPress={() =>
            Alert.alert('Clear watch history?', 'Resume positions will also be cleared.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => { ud.clearHistory(); toast('Watch history cleared'); } },
            ])
          }
        />
        <Row
          icon="nuclear-outline"
          label="Reset all app data"
          sub="Likes, comments, subscriptions, history"
          onPress={() =>
            Alert.alert('Reset everything?', 'Your videos stay on the phone; only app data is removed.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => { ud.resetAll(); toast('App data reset'); } },
            ])
          }
        />
      </ScrollView>

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.dialogWrap}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={40}
              style={styles.dialogInput}
              placeholder="Name shown on comments"
              placeholderTextColor={colors.faint}
            />
            <View style={styles.dialogBtns}>
              <Pressable onPress={() => setEditing(false)} style={styles.dialogBtn}>
                <Text style={styles.dialogBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { ud.setProfileName(name); setEditing(false); }}
                style={styles.dialogBtn}
              >
                <Text style={[styles.dialogBtnText, { color: colors.link }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Row({ icon, label, sub, onPress }: { icon: IconName; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={22} color={colors.text} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  profile: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  name: { color: colors.text, fontSize: 24, fontWeight: '700' },
  handle: { color: colors.sub, fontSize: 13, marginTop: 2 },
  link: { color: colors.text, fontSize: 13, marginTop: 6, fontWeight: '500' },
  stats: { flexDirection: 'row', marginHorizontal: 12, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statN: { color: colors.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: colors.sub, fontSize: 12, marginTop: 2 },
  histTitle: { color: colors.text, fontSize: 13, fontWeight: '500', marginTop: 6 },
  histMeta: { color: colors.sub, fontSize: 12, marginTop: 2 },
  muted: { color: colors.sub, paddingHorizontal: 12 },
  list: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 18 },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowSub: { color: colors.sub, fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.surface3, marginVertical: 8 },
  dialogWrap: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 32 },
  dialog: { backgroundColor: colors.surface, borderRadius: 14, padding: 20 },
  dialogTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 12 },
  dialogInput: { color: colors.text, borderBottomWidth: 2, borderBottomColor: colors.link, paddingVertical: 6, fontSize: 16 },
  dialogBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 8 },
  dialogBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  dialogBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
});
