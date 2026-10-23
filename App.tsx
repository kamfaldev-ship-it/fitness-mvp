import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { POP } from './src/motion';
import CustomExerciseScreen from './src/screens/CustomExerciseScreen';
import ExerciseDetailScreen from './src/screens/ExerciseDetailScreen';
import ExercisesScreen from './src/screens/ExercisesScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import PlateCalcScreen from './src/screens/PlateCalcScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import TemplateEditScreen from './src/screens/TemplateEditScreen';
import TemplateScreen from './src/screens/TemplateScreen';
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen';
import WorkoutScreen from './src/screens/WorkoutScreen';
import { ToastProvider } from './src/components/Toast';
import { exercisesToWarm, warmCache } from './src/offline';
import { StoreProvider, useStore } from './src/store';
import { font, useTheme } from './src/theme';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// Tab icon that hops when its tab becomes the active one
function TabIcon({ on, off, focused, color }: { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; focused: boolean; color: string }) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const first = React.useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (focused) {
      scale.value = withSequence(withTiming(0.78, { duration: 80 }), withSpring(1, POP));
      y.value = withSequence(withTiming(-5, { duration: 110 }), withSpring(0, POP));
    }
  }, [focused, scale, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name={focused ? on : off} size={24} color={color} />
    </Animated.View>
  );
}

const tabIcon = (on: keyof typeof Ionicons.glyphMap, off: keyof typeof Ionicons.glyphMap) =>
  ({ focused, color }: { focused: boolean; color: string }) => <TabIcon on={on} off={off} focused={focused} color={color} />;

function Tabs() {
  const c = useTheme();
  return (
    <Tab.Navigator
      screenListeners={{ tabPress: () => void Haptics.selectionAsync().catch(() => {}) }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 12 },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
      }}
    >
      <Tab.Screen name="Accueil" component={HomeScreen} options={{ tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tab.Screen name="Exercices" component={ExercisesScreen} options={{ tabBarIcon: tabIcon('barbell', 'barbell-outline') }} />
      <Tab.Screen name="Séances" component={HistoryScreen} options={{ tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tab.Screen name="Progrès" component={ProgressScreen} options={{ tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }} />
    </Tab.Navigator>
  );
}

// Fetch the images the user is likely to need in the gym, once the data is loaded
function WarmCache() {
  const { history, favorites, templates } = useStore();
  useEffect(() => {
    warmCache(exercisesToWarm({ history, favorites, templates }));
    // only on launch: the list is small and expo-image skips what is already cached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  const c = useTheme();
  const [loaded] = useFonts({ Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold });
  if (!loaded) return null;

  const base = c.isDark ? DarkTheme : DefaultTheme;
  const header = {
    headerStyle: { backgroundColor: c.bg },
    headerShadowVisible: false,
    headerTintColor: c.primary,
    headerTitleStyle: { fontFamily: font.display, fontSize: 22, color: c.ink },
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <WarmCache />
        <ToastProvider>
        <NavigationContainer theme={{ ...base, colors: { ...base.colors, background: c.bg, card: c.bg, border: c.line, primary: c.primary, text: c.ink } }}>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={header}>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Picker" component={ExercisesScreen} options={{ title: 'Choisir un exercice', presentation: 'modal' }} />
            <Stack.Screen name="Workout" component={WorkoutScreen} options={{ title: 'Séance en cours' }} />
            <Stack.Screen name="CustomExercise" component={CustomExerciseScreen} options={{ title: 'Nouvel exercice', presentation: 'modal' }} />
            <Stack.Screen name="Summary" component={SummaryScreen} options={{ title: '', headerBackVisible: false, gestureEnabled: false }} />
            <Stack.Screen name="TemplateEdit" component={TemplateEditScreen} options={{ title: 'Modifier le modèle' }} />
            <Stack.Screen name="PlateCalc" component={PlateCalcScreen} options={{ title: 'Calculateur de disques' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Réglages' }} />
            <Stack.Screen name="Template" component={TemplateScreen} options={{ title: '' }} />
            <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ title: '' }} />
          </Stack.Navigator>
        </NavigationContainer>
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
