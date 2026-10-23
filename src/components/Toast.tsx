import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { stableContext } from '../stableContext';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '../theme';

type ToastInput = { message: string; actionLabel?: string; onAction?: () => void };
const Ctx = stableContext<(t: ToastInput) => void>('fitness.toast', () => {});
export const useToast = () => useContext(Ctx);

const DURATION = 5000;

// Single toast at a time, auto-dismissed. A new toast replaces the current one.
// It drops in from the top edge and leaves upward: the same direction it came from.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const c = useTheme();

  const hide = useCallback(() => setToast(null), []);

  const show = useCallback(
    (t: ToastInput) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ ...t, key: Date.now() });
      timer.current = setTimeout(hide, DURATION);
    },
    [hide],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.key}
          entering={SlideInUp.springify().damping(16)}
          exiting={FadeOutUp.duration(180)}
          accessibilityLiveRegion="polite"
          style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 52 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.ink, borderRadius: 14, paddingLeft: 16, paddingRight: 6, minHeight: 52 }}>
            <Text style={{ flex: 1, color: c.bg, fontFamily: font.medium, fontSize: 15 }} accessibilityRole="alert">
              {toast.message}
            </Text>
            {toast.actionLabel && (
              <Pressable
                onPress={() => {
                  if (timer.current) clearTimeout(timer.current);
                  toast.onAction?.();
                  hide();
                }}
                accessibilityRole="button"
                style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}
              >
                <Text style={{ color: c.isDark ? '#1F5FBF' : '#9DC0FF', fontFamily: font.semibold, fontSize: 15 }}>{toast.actionLabel}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}
