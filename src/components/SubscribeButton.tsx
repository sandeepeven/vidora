import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useUserData } from '../state/UserDataContext';
import { colors } from '../theme';
import { useToast } from './Toast';

/** Dummy subscribe: toggles a local flag only — no notifications or feed sync. */
export function SubscribeButton({ channelId, channelName, compact }: { channelId: string; channelName: string; compact?: boolean }) {
  const { data, toggleSubscribe } = useUserData();
  const toast = useToast();
  const subscribed = data.subscriptions.includes(channelId);

  const onPress = () => {
    if (subscribed) {
      Alert.alert('', `Unsubscribe from ${channelName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unsubscribe', onPress: () => { toggleSubscribe(channelId); toast('Subscription removed'); } },
      ]);
    } else {
      toggleSubscribe(channelId);
      toast('Subscription added');
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.compact,
        subscribed ? styles.on : styles.off,
        pressed && { opacity: 0.8 },
      ]}
    >
      {subscribed ? <Ionicons name="notifications-outline" size={16} color={colors.text} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.text, subscribed ? styles.onText : styles.offText]}>{subscribed ? 'Subscribed' : 'Subscribe'}</Text>
      {subscribed ? <Ionicons name="chevron-down" size={14} color={colors.text} style={{ marginLeft: 2 }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 14, height: 36 },
  compact: { height: 32, paddingHorizontal: 12 },
  off: { backgroundColor: colors.text },
  on: { backgroundColor: colors.surface2 },
  text: { fontSize: 14, fontWeight: '600' },
  offText: { color: colors.bg },
  onText: { color: colors.text },
});
