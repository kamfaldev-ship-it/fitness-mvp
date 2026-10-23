import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type MenuItem = { label: string; destructive?: boolean; onPress: () => void };

// Native action sheet on iOS. Android falls back to an Alert, which only fits two choices.
export function showMenu(title: string, items: MenuItem[], message?: string) {
  if (Platform.OS === 'ios') {
    const destructiveButtonIndex = items.findIndex((i) => i.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      { title, message, options: [...items.map((i) => i.label), 'Annuler'], cancelButtonIndex: items.length, destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined },
      (i) => {
        if (i < items.length) items[i].onPress();
      },
    );
  } else {
    Alert.alert(title, message, [...items.slice(0, 2).map((i) => ({ text: i.label, style: i.destructive ? ('destructive' as const) : ('default' as const), onPress: i.onPress })), { text: 'Annuler', style: 'cancel' as const }]);
  }
}
