import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const ToastCtx = createContext<(msg: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback(
    (m: string) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      }, 2200);
    },
    [anim],
  );

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            bottom: insets.bottom + 70,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={styles.text}>{msg}</Text>
      </Animated.View>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: colors.surface3,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
  },
  text: { color: colors.text, fontSize: 14 },
});
