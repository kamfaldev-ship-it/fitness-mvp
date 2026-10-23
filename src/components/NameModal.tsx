import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { font, useTheme } from '../theme';
import { Button } from './ui';

// Small "type a name" dialog (Alert.prompt only exists on iOS and cannot be styled)
export function NameModal({ visible, title, initial = '', confirmLabel = 'Enregistrer', onSubmit, onCancel }: {
  visible: boolean;
  title: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);
  const ok = value.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 20, gap: 14 }}>
          <Text accessibilityRole="header" style={{ color: c.ink, fontFamily: font.display, fontSize: 28 }}>
            {title}
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            selectTextOnFocus
            placeholder="Nom de la séance"
            placeholderTextColor={c.muted}
            returnKeyType="done"
            onSubmitEditing={() => ok && onSubmit(value.trim())}
            accessibilityLabel="Nom"
            style={{ backgroundColor: c.bg, color: c.ink, borderRadius: 12, paddingHorizontal: 14, minHeight: 50, fontFamily: font.body, fontSize: 17 }}
          />
          <Button title={confirmLabel} onPress={() => ok && onSubmit(value.trim())} style={{ opacity: ok ? 1 : 0.4 }} />
          <Pressable onPress={onCancel} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
            <Text style={{ color: c.muted, fontFamily: font.semibold, fontSize: 16 }}>Annuler</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
