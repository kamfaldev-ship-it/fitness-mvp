import * as Notifications from 'expo-notifications';

// In the foreground the screen already shows the countdown and vibrates,
// so the system banner is only wanted when the app is in the background.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// Fixed id: scheduling again replaces the pending notification
const REST_ID = 'rest-timer';

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function scheduleRestEnd(seconds: number) {
  try {
    if (!(await ensurePermission())) return;
    await Notifications.scheduleNotificationAsync({
      identifier: REST_ID,
      content: { title: 'Repos terminé', body: 'C’est reparti : prochaine série.', sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    // notifications are a bonus: the in-app timer keeps working without them
  }
}

export const cancelRestEnd = () => Notifications.cancelScheduledNotificationAsync(REST_ID).catch(() => {});
