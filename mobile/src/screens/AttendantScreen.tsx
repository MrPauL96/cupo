import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, money, Zone } from '../api';
import Icon from '../components/Icon';
import { useLive } from '../useLive';
import { C, FONT, GRAD, shadow } from '../theme';

const dur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`);

/** App del auxiliar de la Alcaldía: marca cupos al cobrar. Cada cambio llega al instante a los conductores. */
export default function AttendantScreen({ top = 0 }: { top?: number }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [zid, setZid] = useState(1);
  const [sel, setSel] = useState<number | null>(null);
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => api.zones().then(setZones).catch(() => {}), []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  useLive(() => { refresh(); });

  const z = zones.find((x) => x.id === zid);
  const spot = z && sel !== null ? z.spots[sel] : undefined;
  const anomaly = z?.spots.find((p) => p.anomaly);
  const occ = z ? z.total - z.free : 0;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try { const msg = await fn(); setToast(msg); setSel(null); setPlate(''); await refresh(); }
    catch (e) { setToast((e as Error).message); }
    finally { setBusy(false); }
  };
  const occupy = () => run(async () => { const r = await api.occupy(zid, sel!, plate); return `Cobro iniciado · ${r.plate}`; });
  const release = () => run(async () => { const r = await api.release(zid, sel!); return `Cupo liberado · cobrar ${money(r.fee)}`; });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: top + 8, paddingHorizontal: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Cobro de zona</Text>
        <Text style={s.lead}>Auxiliar · turno tarde</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
          {zones.map((x) => (
            <Pressable key={x.id} onPress={() => { setZid(x.id); setSel(null); }} style={[s.chip, x.id === zid && s.chipOn]}>
              <Text style={[s.chipT, x.id === zid && { color: '#fff' }]}>{x.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {z && (
          <>
            {/* Resumen */}
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, shadow(14, 30, 0.22)]}>
              <Text style={s.heroK}>Tu cuadra</Text>
              <Text style={s.heroName}>{z.name}</Text>
              <View style={s.heroRow}>
                <View><Text style={s.heroBig}>{occ}<Text style={s.heroSmall}> / {z.total}</Text></Text><Text style={s.heroLbl}>ocupados</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={s.heroBig}>{z.free}</Text><Text style={s.heroLbl}>libres</Text></View>
              </View>
              <View style={s.bar}><View style={[s.barFill, { width: `${(occ / z.total) * 100}%` }]} /></View>
            </LinearGradient>

            {anomaly && !spot && (
              <Pressable onPress={() => setSel(anomaly.index)} style={s.alert}>
                <View style={s.alertDot}><Text style={{ color: '#fff', fontWeight: '800' }}>!</Text></View>
                <Text style={s.alertT}>El cupo {anomaly.index + 1} lleva {dur(anomaly.minutes)} ocupado. En esta cuadra lo normal es menos de 2 h. ¿Se te olvidó liberarlo?</Text>
              </Pressable>
            )}

            {/* Cupos */}
            <View style={s.grid}>
              {z.spots.map((p) => {
                const on = sel === p.index;
                const tone = !p.occupied ? C.free : p.anomaly ? C.warn : C.occ;
                return (
                  <Pressable
                    key={p.index}
                    onPress={() => setSel(on ? null : p.index)}
                    style={[s.spot, !p.occupied && s.spotFree, p.occupied && shadow(4, 12, 0.06), on && { borderColor: C.ink, borderWidth: 2 }]}
                    accessibilityLabel={`Cupo ${p.index + 1} ${p.occupied ? 'ocupado' : 'libre'}`}
                  >
                    <View style={s.spotTop}>
                      <Text style={s.spotN}>{p.index + 1}</Text>
                      <View style={[s.dot, { backgroundColor: tone }]} />
                    </View>
                    {p.occupied ? (
                      <>
                        <Text style={s.plate}>{p.plate}</Text>
                        <Text style={[s.spotSub, p.anomaly && { color: C.warn, fontWeight: '700' }]}>{dur(p.minutes)}</Text>
                      </>
                    ) : (
                      <Text style={[s.spotSub, { color: C.free, fontWeight: '700', marginTop: 10 }]}>Libre</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.note}>Cada cupo que marcas aparece al instante en el mapa de los conductores.</Text>
          </>
        )}
      </ScrollView>

      {/* Hoja de acción */}
      {spot && (
        <View style={[s.action, shadow(-8, 30, 0.18)]}>
          <View style={s.handle} />
          {!spot.occupied ? (
            <>
              <Text style={s.aTitle}>Cupo {spot.index + 1} · llega un carro</Text>
              <TextInput style={s.input} placeholder="ABC123" placeholderTextColor="#A7B0BF" autoCapitalize="characters"
                maxLength={7} value={plate} onChangeText={setPlate} onSubmitEditing={occupy} autoFocus />
              <Pressable onPress={occupy} disabled={busy}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}><Icon name="car" size={20} color="#fff" /><Text style={s.btnT}>Iniciar cobro</Text></LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.aTitle}>Cupo {spot.index + 1} · {spot.plate}</Text>
              <View style={s.aRow}>
                <View style={s.aStat}><Text style={s.aK}>Tiempo</Text><Text style={s.aV}>{dur(spot.minutes)}</Text></View>
                <View style={s.aStat}><Text style={s.aK}>Cobro estimado</Text><Text style={s.aV}>{money(spot.estimatedFee)}</Text></View>
              </View>
              {spot.anomaly && <Text style={s.warnT}>Tiempo inusual: confirma que el carro sigue ahí.</Text>}
              <Pressable onPress={release} disabled={busy}>
                <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}><Icon name="check" size={20} color="#fff" /><Text style={s.btnT}>Liberar y cobrar</Text></LinearGradient>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => setSel(null)} style={s.cancel}><Text style={s.cancelT}>Cancelar</Text></Pressable>
        </View>
      )}

      {toast && (
        <View style={[s.toast, { top: top + 6 }, shadow(8, 24, 0.2)]}><Text style={s.toastT}>{toast}</Text></View>
      )}
    </View>
  );
}

const T = { fontFamily: FONT, color: C.ink };
const s = StyleSheet.create({
  h1: { ...T, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  lead: { ...T, color: C.mute, fontSize: 15, marginTop: 2 },
  chip: { backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, height: 40, justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipT: { ...T, fontWeight: '700', fontSize: 14 },

  hero: { borderRadius: 24, padding: 18 },
  heroK: { fontFamily: FONT, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  heroName: { fontFamily: FONT, color: '#fff', fontSize: 19, fontWeight: '800', marginTop: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
  heroBig: { fontFamily: FONT, color: '#fff', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  heroSmall: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  heroLbl: { fontFamily: FONT, color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: '#fff' },

  alert: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FFF7E6', borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#FDE1A7' },
  alertDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.warn, alignItems: 'center', justifyContent: 'center' },
  alertT: { ...T, flex: 1, fontSize: 13, color: '#8A5300', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  spot: { width: '22.6%', minHeight: 92, backgroundColor: C.card, borderRadius: 18, padding: 10, borderWidth: 2, borderColor: 'transparent' },
  spotFree: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderStyle: 'dashed' },
  spotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotN: { ...T, fontSize: 18, fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  plate: { ...T, fontSize: 12, fontWeight: '800', marginTop: 10, letterSpacing: 0.5 },
  spotSub: { ...T, fontSize: 11, color: C.mute, marginTop: 2 },
  note: { ...T, color: C.mute, fontSize: 12, marginTop: 16, textAlign: 'center' },

  action: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, paddingBottom: 28, gap: 12 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D5DBE5' },
  aTitle: { ...T, fontSize: 20, fontWeight: '800' },
  aRow: { flexDirection: 'row', gap: 10 },
  aStat: { flex: 1, backgroundColor: C.soft, borderRadius: 16, padding: 12 },
  aK: { ...T, color: C.mute, fontSize: 12 },
  aV: { ...T, fontSize: 20, fontWeight: '800', marginTop: 2 },
  warnT: { ...T, color: C.warn, fontWeight: '700' },
  input: { ...T, backgroundColor: C.soft, borderRadius: 16, height: 58, paddingHorizontal: 16, fontSize: 24, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  btn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnT: { fontFamily: FONT, color: '#fff', fontWeight: '800', fontSize: 16 },
  cancel: { alignItems: 'center', paddingVertical: 4 },
  cancelT: { ...T, color: C.mute, fontWeight: '700' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  toastT: { fontFamily: FONT, color: '#fff', fontWeight: '700' },
});
