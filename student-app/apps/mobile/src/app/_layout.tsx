import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../state/store';
import { colors } from '../theme';
export default function RootLayout() {
  const { hydrate, ready } = useAppStore();
  const [loaded, error] = useFonts({ NotoRegular: NotoSansKR_400Regular, NotoMedium: NotoSansKR_500Medium, NotoBold: NotoSansKR_700Bold });
  useEffect(() => { void hydrate(); }, [hydrate]);
  if (!ready || (!loaded && !error)) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 16 }}>
    <ActivityIndicator color={colors.blue} /><Text style={{ color: colors.muted }}>교수 AI를 준비하고 있어요</Text></View>;
  return <SafeAreaProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }} /></SafeAreaProvider>;
}
