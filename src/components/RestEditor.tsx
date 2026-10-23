import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { MAX_REST, parseRest } from '../restRules';
import { fmtDuration } from '../stats';
import { font, tabular, useTheme } from '../theme';
import { Button, Chip } from './ui';

const QUICK = [15, 30, 45, 60, 90, 120, 180, 240];

export type RestScope = { key: string; label: string };

// Exact rest picker: type minutes / seconds, nudge by 5 s, or tap a shortcut.
// `scopes` lets the caller say where the value applies (this set, the exercise, the whole workout...).
export function RestEditor({ visible, title, initial, scopes, onSubmit, onCancel }: {
  visible: boolean;
  title: string;
  initial: number;
  scopes?: RestScope[];
  onSubmit: (seconds: number, scope: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [min, setMin] = useState('0');
  const [sec, setSec] = useState('0');
  const [scope, setScope] = useState(scopes?.[0]?.key ?? '');

  const setTotal = (n: number) => {
    const t = Math.min(MAX_REST, Math.max(0, n));
    setMin(String(Math.floor(t / 60)));
    setSec(String(t % 60));
  };
  const total = parseRest(min, sec);

  useEffect(() => {
    if (visible) {
      setTotal(initial);
      setScope(scopes?.[0]?.key ?? '');
    }
    // reset only when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const digits = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 3);
  const box = { backgroundColor: c.bg, color: c.ink, borderRadius: 12, minHeight: 56, minWidth: 84, textAlign: 'center' as const, fontFamily: font.display, fontSize: 36, fontVariant: tabular };
  const nudge = { minHeight: 48, minWidth: 72, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center' as const, justifyContent: 'center' as const };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 14 }}>
            <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: font.display, fontSize: 28 }}>
              {title}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <View style={{ alignItems: 'center' }}>
                <TextInput value={min} onChangeText={(v) => setMin(digits(v))} keyboardType="number-pad" selectTextOnFocus style={box} maxFontSizeMultiplier={1.3} accessibilityLabel="Minutes" />
                <Text style={{ color: c.muted, fontFamily: font.medium, fontSize: 13, marginTop: 4 }}>min</Text>
              </View>
              <Text style={{ color: c.muted, fontFamily: font.display, fontSize: 36, marginBottom: 18 }}>:</Text>
              <View style={{ alignItems: 'center' }}>
                <TextInput value={sec} onChangeText={(v) => setSec(digits(v))} keyboardType="number-pad" selectTextOnFocus style={box} maxFontSizeMultiplier={1.3} accessibilityLabel="Secondes" />
                <Text style={{ color: c.muted, fontFamily: font.medium, fontSize: 13, marginTop: 4 }}>s</Text>
              </View>
            </View>

            <Text accessibilityLiveRegion="polite" style={{ color: c.ink, fontFamily: font.semibold, fontSize: 16, textAlign: 'center' }}>
              {total === 0 ? 'Aucun repos' : `Repos de ${fmtDuration(total)}`}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
              <Pressable style={nudge} onPress={() => setTotal(total - 5)} accessibilityRole="button" accessibilityLabel="Retirer 5 secondes">
                <Text style={{ color: c.ink, fontFamily: font.semibold, fontSize: 17 }}>− 5 s</Text>
              </Pressable>
              <Pressable style={nudge} onPress={() => setTotal(total + 5)} accessibilityRole="button" accessibilityLabel="Ajouter 5 secondes">
                <Text style={{ color: c.ink, fontFamily: font.semibold, fontSize: 17 }}>+ 5 s</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              <Chip label="Aucun" active={total === 0} onPress={() => setTotal(0)} />
              {QUICK.map((q) => (
                <Chip key={q} label={fmtDuration(q)} active={total === q} onPress={() => setTotal(q)} />
              ))}
            </View>

            {scopes && scopes.length > 1 && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: c.muted, fontFamily: font.medium, fontSize: 14 }}>Appliquer à</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {scopes.map((sc) => (
                    <Chip key={sc.key} label={sc.label} active={scope === sc.key} onPress={() => setScope(sc.key)} />
                  ))}
                </View>
              </View>
            )}

            <Button title="Valider" onPress={() => onSubmit(total, scope)} />
            <Pressable onPress={onCancel} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
              <Text style={{ color: c.muted, fontFamily: font.semibold, fontSize: 16 }}>Annuler</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
