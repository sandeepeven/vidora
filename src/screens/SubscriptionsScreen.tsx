import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Avatar } from '../components/Avatar';
import { EmptyState, SectionHeader } from '../components/Common';
import { SubscribeButton } from '../components/SubscribeButton';
import { VideoCard } from '../components/VideoCard';
import { useNav } from '../navigation/types';
import { useLibrary } from '../state/LibraryContext';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';

export default function SubscriptionsScreen() {
  const { videos, channels } = useLibrary();
  const { data } = useUserData();
  const nav = useNav();
  const [selected, setSelected] = useState<string | null>(null);

  const subbed = useMemo(() => channels.filter((c) => data.subscriptions.includes(c.id)), [channels, data.subscriptions]);
  const feed = useMemo(() => {
    const ids = new Set(selected ? [selected] : subbed.map((c) => c.id));
    return videos.filter((v) => ids.has(v.channelId));
  }, [videos, subbed, selected]);

  if (!subbed.length) {
    return (
      <View style={styles.root}>
        <AppHeader />
        <FlatList
          data={channels}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            <>
              <EmptyState
                icon="albums-outline"
                title="Don't miss new videos"
                body="Each folder on your phone is a channel. Subscribe to see its videos here."
              />
              <SectionHeader title="Channels on this device" />
            </>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.channelRow} onPress={() => nav.push('Channel', { id: item.id })}>
              <Avatar name={item.name} size={44} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.channelName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.channelMeta}>{item.videoCount} videos</Text>
              </View>
              <SubscribeButton channelId={item.id} channelName={item.name} compact />
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader />
      <FlatList
        data={feed}
        keyExtractor={(v) => v.id}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatars}>
              {subbed.map((c) => {
                const on = selected === c.id;
                return (
                  <Pressable key={c.id} style={[styles.avatarItem, selected && !on && { opacity: 0.4 }]} onPress={() => setSelected(on ? null : c.id)}>
                    <Avatar name={c.name} size={56} />
                    <Text style={styles.avatarLabel} numberOfLines={1}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.divider} />
          </View>
        }
        renderItem={({ item }) => <VideoCard video={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  channelRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  channelName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  channelMeta: { color: colors.sub, fontSize: 12, marginTop: 2 },
  avatars: { paddingHorizontal: 8, paddingVertical: 10 },
  avatarItem: { width: 76, alignItems: 'center' },
  avatarLabel: { color: colors.sub, fontSize: 11, marginTop: 6, maxWidth: 70 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.surface3, marginBottom: 12 },
});
