import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Logo } from '../components/AppHeader';
import { useLibrary } from '../state/LibraryContext';
import { colors } from '../theme';

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <Logo />
      <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      <Text style={styles.body}>Finding videos on your phone…</Text>
    </View>
  );
}

export default function PermissionScreen() {
  const { requestAccess, canAskAgain } = useLibrary();
  return (
    <View style={styles.root}>
      <Ionicons name="film-outline" size={72} color={colors.faint} />
      <Text style={styles.title}>Allow access to your videos</Text>
      <Text style={styles.body}>
        LowTube plays the videos already stored on your phone — no internet needed. Nothing is uploaded anywhere.
      </Text>
      <Pressable style={styles.btn} onPress={canAskAgain ? requestAccess : () => Linking.openSettings()}>
        <Text style={styles.btnText}>{canAskAgain ? 'Allow access' : 'Open settings'}</Text>
      </Pressable>
      {!canAskAgain ? <Text style={styles.hint}>Permissions → Photos and videos → Allow</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 20, textAlign: 'center' },
  body: { color: colors.sub, fontSize: 14, marginTop: 10, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 24, backgroundColor: colors.text, borderRadius: 20, paddingHorizontal: 24, height: 40, justifyContent: 'center' },
  btnText: { color: colors.bg, fontWeight: '700' },
  hint: { color: colors.faint, fontSize: 12, marginTop: 12 },
});
