import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

/** Bottom sheet with a grab handle, used for menus and comments. */
export function Sheet({ visible, onClose, children, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }, style]}>
          <View style={styles.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface3,
    marginBottom: 8,
  },
});
