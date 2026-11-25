import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import DriverScreen from './src/screens/DriverScreen';
import AttendantScreen from './src/screens/AttendantScreen';
import { C, FONT, GRAD, shadow } from './src/theme';

type Tab = 'driver' | 'attendant';

// Versión web: fuente y marco de celular en pantallas grandes (en el celular ocupa toda la pantalla)
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('cupo-web')) {
  const font = document.createElement('link');
  font.rel = 'stylesheet';
  font.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(font);
  const st = document.createElement('style');
  st.id = 'cupo-web';
  st.textContent = `body{background:#F4F6FA}
@media(min-width:520px){body{display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 20%,#1D4ED8,#0B1220 70%)}
#root{flex:none!important;width:400px;height:min(860px,calc(100% - 32px))!important;border-radius:32px;overflow:hidden;border:10px solid #000;box-shadow:0 20px 60px rgba(0,0,0,.5)}}`;
  document.head.appendChild(st);
  document.title = 'Cupo · Encuentra dónde parquear';
}

function Shell() {
  const [tab, setTab] = useState<Tab>('driver');
  const insets = useSafeAreaInsets();
  const top = insets.top + 10;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      {tab === 'driver' ? <DriverScreen top={top + 52} /> : <AttendantScreen top={top + 52} />}

      {/* Barra flotante */}
      <View style={[s.bar, { top }]} pointerEvents="box-none">
        <View style={[s.brand, shadow(6, 20, 0.12)]}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.logo}>
            <Text style={s.logoT}>E</Text>
          </LinearGradient>
          <Text style={s.brandT}>Cupo</Text>
        </View>
        <View style={[s.seg, shadow(6, 20, 0.12)]}>
          {(['driver', 'attendant'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.segB, tab === t && s.segOn]}>
              <Text style={[s.segT, tab === t && { color: '#fff' }]}>{t === 'driver' ? 'Conductor' : 'Auxiliar'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  bar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingLeft: 5, paddingRight: 14, height: 44 },
  logo: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  logoT: { color: '#fff', fontWeight: '800', fontSize: 18, fontFamily: FONT },
  brandT: { fontWeight: '800', fontSize: 17, color: C.ink, fontFamily: FONT, letterSpacing: -0.3 },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, padding: 4, height: 44 },
  segB: { paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  segOn: { backgroundColor: C.ink },
  segT: { fontWeight: '700', fontSize: 13, color: C.mute, fontFamily: FONT },
});
