import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, calm, Destination, kindLabel, Lot, Option, Scenario, Turn, Zone } from '../api';
import { AREAS } from '../areas';
import CupoMap from '../components/CupoMap';
import Icon from '../components/Icon';
import { useLive } from '../useLive';
import { isYes, listen, say, stopSpeaking } from '../voice';
import { C, FONT, GRAD, GRAD_MIC, probColor, riskColor, shadow, wazeUrl } from '../theme';

export default function DriverScreen({ top = 0 }: { top?: number }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [dests, setDests] = useState<Destination[]>([]);
  const [dest, setDest] = useState(0); // id del destino
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [active, setActive] = useState<Scenario | null>(null);
  const [reserved, setReserved] = useState<string | null>(null);
  const [eta, setEta] = useState(10);
  const [rain, setRain] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [picked, setPicked] = useState<Option | null>(null);
  const [agentPick, setAgentPick] = useState<Option | null>(null);
  const [agentAlt, setAgentAlt] = useState<Option | null>(null);
  const [filter, setFilter] = useState<'todas' | 'zona' | 'parqueadero'>('todas');
  const [error, setError] = useState<string | null>(null);

  // Agente de voz
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [heard, setHeard] = useState('');
  const [reply, setReply] = useState('');
  const [mode, setMode] = useState('');
  const [typed, setTyped] = useState('');
  const history = useRef<Turn[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const refresh = useCallback(async () => {
    try {
      const [z, l, o] = await Promise.all([api.zones(), api.lots(), api.recommendations(dest, eta, rain)]);
      setZones(z); setLots(l); setOptions(o); setError(null);
    } catch {
      setError('No me pude conectar al backend. Revisa EXPO_PUBLIC_API_URL y que el servidor esté corriendo.');
    }
  }, [dest, eta, rain]);

  useEffect(() => {
    api.destinations().then(setDests).catch(() => {});
    api.scenarios().then(setScenarios).catch(() => {});
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const { connected, events } = useLive(() => { refresh(); });

  useEffect(() => {
    if (!listening) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [listening]);

  const best = picked ?? options[0];
  const goTo = (o: Option) => Linking.openURL(wazeUrl(o.lat, o.lng));

  const ask = async (text: string, rainNow: boolean = rain) => {
    if (!text.trim()) return;
    setHeard(text);
    if (isYes(text) && agentPick) { say('Listo, te llevo.'); goTo(agentPick); return; }
    setThinking(true); setReply(''); setAgentPick(null); setAgentAlt(null); setReserved(null);
    try {
      const r = await api.agent(text, history.current, rainNow);
      history.current = [...history.current, { role: 'user' as const, text }, { role: 'assistant' as const, text: r.reply }].slice(-8);
      setReply(r.reply);
      setMode(r.mode);
      if (r.destination) setDest(r.destination.id);
      setAgentPick(r.suggestion);
      setAgentAlt(r.alternative ?? null);
      if (r.suggestion) setPicked(r.suggestion);
      say(r.reply);
    } catch (e) {
      setReply('Uy, no pude responder. ' + (e as Error).message);
    } finally {
      setThinking(false);
    }
  };

  const toggleMic = async () => {
    if (listening) { stopRef.current?.(); return; }
    stopSpeaking();
    setHeard('');
    try {
      stopRef.current = await listen({
        onPartial: setHeard,
        onFinal: ask,
        onEnd: () => setListening(false),
        onError: (m) => { setListening(false); setReply('No te escuché bien (' + m + '). Intenta de nuevo o escríbelo.'); },
      });
      setListening(true);
    } catch (e) {
      setReply((e as Error).message);
    }
  };

  const send = () => { ask(typed); setTyped(''); };
  const d = dests.find((x) => x.id === dest);
  const area = d?.area ?? 'laureles';

  const clearAgent = () => { setPicked(null); setAgentPick(null); setAgentAlt(null); setReserved(null); setReply(''); setHeard(''); history.current = []; };
  const playScenario = async (sc: Scenario) => {
    stopSpeaking();
    clearAgent();
    try { await api.applyScenario(sc.id); } catch { return; }
    setActive(sc); setRain(sc.rain); setEta(sc.eta); setDest(sc.destination);
    ask(sc.say, sc.rain);
  };
  const exitScenario = async () => { await api.resetScenario().catch(() => {}); setActive(null); setRain(false); clearAgent(); refresh(); };
  const reserve = async (o: Option) => {
    try {
      const r = await api.reserve(+o.id.replace('parqueadero-', ''));
      const t = new Date(r.until).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
      setReserved(t);
      say(`Listo, te aparté el cupo hasta las ${t}.`);
    } catch (e) { setReserved(null); setReply((e as Error).message); }
  };
  const calmPct = calm(agentPick, agentAlt);
  const ring = { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }) };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {/* ---------- Mapa a pantalla completa ---------- */}
      <View style={{ height: 360 + top * 0.4 }}>
        <CupoMap area={area} zones={zones.filter((z) => z.area === area)} lots={lots.filter((l) => l.area === area)} dest={d} best={best} />
        <View style={[s.live, { top: top + 6 }, shadow(4, 14, 0.12)]}>
          <View style={[s.liveDot, { backgroundColor: connected ? C.free : C.mute }]} />
          <Text style={s.liveT}>{connected ? 'En vivo' : 'Sin conexión'}</Text>
        </View>
        <View style={[s.legend, shadow(4, 14, 0.12)]}>
          <View style={[s.legendDot, { backgroundColor: C.free, borderColor: '#fff' }]} /><View style={[s.legendDot, { backgroundColor: C.occ, marginLeft: -4 }]} />
          <Text style={s.liveT}>Calle (pública)</Text>
          <Text style={s.legendP}>P</Text>
          <Text style={s.liveT}>Privado</Text>
        </View>
      </View>

      {/* ---------- Hoja inferior ---------- */}
      <View style={[s.sheet, shadow(-6, 30, 0.10)]}>
        <View style={s.handle} />

        {!reply && !heard && !thinking && (
          <>
            <Text style={s.h1}>¿A dónde vas hoy?</Text>
            <Text style={s.lead}>Dímelo por voz y te digo dónde hay cupo antes de llegar.</Text>
          </>
        )}

        {/* Conversación */}
        {!!heard && (
          <View style={s.userB}><Text style={s.userT}>{heard}</Text></View>
        )}
        {(thinking || !!reply) && (
          <View style={s.botRow}>
            <LinearGradient colors={GRAD_MIC} style={s.avatar}><Icon name="spark" size={16} color="#fff" /></LinearGradient>
            <View style={s.botB}>
              {thinking ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={C.blue} />
                  <Text style={s.botMute}>Buscando cupo cerca…</Text>
                </View>
              ) : (
                <>
                  <Text style={s.botT}>{reply}</Text>
                  {!!mode && <Text style={s.botMute}>{mode === 'ia' ? 'Cupo IA' : 'Modo demo · sin IA'}</Text>}
                </>
              )}
            </View>
          </View>
        )}

        {/* Recomendación */}
        {agentPick && (
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.pick, shadow(14, 30, 0.25)]}>
            <View style={s.pickTop}>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                <View style={s.pickBadge}><Icon name="spark" size={12} color="#fff" /><Text style={s.pickBadgeT}>Mejor opción</Text></View>
                <View style={s.pickBadge}><Icon name={agentPick.kind === 'zona' ? 'pin' : 'parking'} size={12} color="#fff" /><Text style={s.pickBadgeT}>{kindLabel(agentPick.kind)}</Text></View>
              </View>
              <Text style={s.pickPct}>{agentPick.probability}%</Text>
            </View>
            <Text style={s.pickName}>{agentPick.name}</Text>
            <Text style={s.pickSub}>{agentPick.detail}</Text>
            <View style={s.pickStats}>
              <View style={s.stat}><Icon name="walk" size={16} color="#fff" /><Text style={s.statT}>{agentPick.walkMinutes} min</Text></View>
              <View style={s.stat}><Icon name="shield" size={16} color="#fff" /><Text style={s.statT}>Riesgo {agentPick.riskLevel}</Text></View>
              <View style={s.stat}><Icon name="parking" size={16} color="#fff" /><Text style={s.statT}>{agentPick.freeNow} libres</Text></View>
            </View>
            {agentPick.reasons.length > 0 && <Text style={s.pickWhy}>{agentPick.reasons.join(' · ')}</Text>}
            <View style={s.calm}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.calmT}>{calmPct >= 90 ? 'Tranquilo' : calmPct >= 70 ? 'Bastante seguro' : 'Ojo, está apretado'}</Text>
                <Text style={s.calmT}>{calmPct}% de que parqueas{agentAlt ? ' con tu plan B' : ''}</Text>
              </View>
              <View style={s.calmBar}><View style={[s.calmFill, { width: `${calmPct}%`, backgroundColor: calmPct >= 90 ? '#6EE7B7' : calmPct >= 70 ? '#FDE68A' : '#FCA5A5' }]} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <Pressable style={[s.go, { flex: 1, marginTop: 0 }]} onPress={() => goTo(agentPick)}>
                <Icon name="nav" size={18} color={C.blue} />
                <Text style={s.goT}>Llevarme</Text>
              </Pressable>
              {agentPick.kind === 'parqueadero' && (
                <Pressable style={[s.reserve, reserved && { backgroundColor: 'rgba(110,231,183,0.25)', borderColor: '#6EE7B7' }]} onPress={() => !reserved && reserve(agentPick)}>
                  <Icon name={reserved ? 'check' : 'clock'} size={18} color="#fff" />
                  <Text style={s.reserveT}>{reserved ? `Apartado hasta ${reserved}` : 'Apartar 15 min'}</Text>
                </Pressable>
              )}
            </View>
          </LinearGradient>
        )}
        {agentAlt && (
          <Pressable onPress={() => setPicked(agentAlt)} style={[s.alt, shadow(4, 16, 0.06)]}>
            <View style={[s.altIcon, { backgroundColor: agentAlt.kind === 'zona' ? '#ECFDF5' : '#EEF2FF' }]}>
              <Icon name={agentAlt.kind === 'zona' ? 'pin' : 'parking'} size={20} color={agentAlt.kind === 'zona' ? C.free : C.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.altK}>Si prefieres {agentAlt.kind === 'zona' ? 'en la calle (pública)' : 'parqueadero privado'}</Text>
              <Text style={s.optName} numberOfLines={1}>{agentAlt.name}</Text>
              <Text style={s.optSub}>{agentAlt.probability}% prob. · {agentAlt.walkMinutes} min caminando · riesgo {agentAlt.riskLevel}</Text>
            </View>
            <Pressable onPress={() => goTo(agentAlt)} style={s.altGo} accessibilityLabel="Llevarme a la alternativa"><Icon name="nav" size={18} color="#fff" /></Pressable>
          </Pressable>
        )}

        {/* Compositor: texto + micrófono */}
        <View style={s.composer}>
          <View style={[s.inputPill, shadow(4, 16, 0.06)]}>
            <TextInput
              style={s.input}
              placeholder={listening ? 'Te escucho…' : 'Pregúntale a Cupo…'}
              placeholderTextColor="#9AA3B2"
              value={typed}
              onChangeText={setTyped}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            {!!typed && (
              <Pressable style={s.sendB} onPress={send} accessibilityLabel="Enviar"><Icon name="send" size={18} color="#fff" /></Pressable>
            )}
          </View>
          <Pressable onPress={toggleMic} accessibilityLabel={listening ? 'Dejar de escuchar' : 'Hablar con Cupo'}>
            <View style={s.micWrap}>
              <Animated.View style={[s.micRing, ring]} />
              <LinearGradient colors={listening ? ['#EF4444', '#F97316'] : GRAD_MIC} style={[s.mic, shadow(10, 24, 0.3)]}>
                <Icon name={listening ? 'stop' : 'mic'} size={26} color="#fff" />
              </LinearGradient>
            </View>
          </Pressable>
        </View>
        {!reply && !thinking && <Text style={s.hint}>Ej.: "Voy para la UPB, llego en 15 minutos y va a llover"</Text>}

        {error && <Text style={s.error}>{error}</Text>}

        {/* Casos de demo */}
        {active ? (
          <View style={s.caseOn}>
            <View style={{ flex: 1 }}>
              <Text style={s.caseOnK}>Caso de demo · {active.when}</Text>
              <Text style={s.caseOnT}>{active.lesson}</Text>
            </View>
            <Pressable onPress={exitScenario} style={s.caseExit}><Text style={s.caseExitT}>Salir</Text></Pressable>
          </View>
        ) : null}
        <Text style={s.h2}>Prueba un caso</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
          {scenarios.map((sc) => (
            <Pressable key={sc.id} onPress={() => playScenario(sc)} style={[s.case, active?.id === sc.id && { borderColor: C.blue, borderWidth: 2 }]}>
              <Text style={s.caseWhen}>{sc.when} · {AREAS.find((a) => a.id === sc.area)?.name}</Text>
              <Text style={s.caseTitle}>{sc.title}</Text>
              <Text style={s.caseSay} numberOfLines={2}>“{sc.say}”</Text>
              {sc.rain && <View style={s.caseRain}><Icon name="rain" size={14} color="#0369A1" /><Text style={s.caseRainT}>Lluvia</Text></View>}
            </Pressable>
          ))}
        </ScrollView>

        {/* Filtros */}
        <Text style={s.h2}>Zona</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {AREAS.map((a) => (
            <Pressable key={a.id} onPress={() => { const first = dests.find((x) => x.area === a.id); if (first) { setDest(first.id); clearAgent(); } }} style={[s.chip, a.id === area && s.chipOn]}>
              <Text style={[s.chipT, a.id === area && { color: '#fff' }]}>{a.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={s.h2}>Destino</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {dests.filter((x) => x.area === area).map((x) => (
            <Pressable key={x.id} onPress={() => { setDest(x.id); clearAgent(); }} style={[s.chip, x.id === dest && s.chipOn]}>
              <Icon name="pin" size={15} color={x.id === dest ? '#fff' : C.mute} />
              <Text style={[s.chipT, x.id === dest && { color: '#fff' }]}>{x.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.filters}>
          <View style={s.pill}>
            <Icon name="clock" size={16} color={C.mute} />
            <Pressable style={s.stepB} onPress={() => setEta(Math.max(0, eta - 5))}><Icon name="minus" size={16} /></Pressable>
            <Text style={s.pillT}>{eta} min</Text>
            <Pressable style={s.stepB} onPress={() => setEta(Math.min(45, eta + 5))}><Icon name="plus" size={16} /></Pressable>
          </View>
          <Pressable onPress={() => { setRain(!rain); setPicked(null); }} style={[s.pill, rain && { backgroundColor: '#E0F2FE', borderColor: C.blue2 }]}>
            <Icon name="rain" size={18} color={rain ? '#0369A1' : C.mute} />
            <Text style={[s.pillT, rain && { color: '#0369A1' }]}>{rain ? 'Aguacero' : 'Sin lluvia'}</Text>
          </Pressable>
        </View>

        {/* Opciones */}
        <Text style={s.h2}>Opciones cerca</Text>
        <View style={s.seg}>
          {([['todas', 'Todas'], ['zona', 'En la calle'], ['parqueadero', 'Privados']] as const).map(([k, t]) => (
            <Pressable key={k} onPress={() => setFilter(k)} style={[s.segB, filter === k && s.segOn]}>
              {k === 'zona' && <View style={[s.legendDot, { backgroundColor: C.free }]} />}
              {k === 'parqueadero' && <Text style={[s.legendP, filter === k && { backgroundColor: '#fff', color: C.ink }]}>P</Text>}
              <Text style={[s.segT, filter === k && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        {options.filter((o) => filter === 'todas' || o.kind === filter).slice(0, 5).map((o) => {
          const on = o.id === best?.id;
          return (
            <Pressable key={o.id} onPress={() => setPicked(o)} style={[s.opt, on && { borderColor: C.blue, backgroundColor: '#F5F8FF' }]}>
              <View style={[s.ring, { borderColor: probColor(o.probability) }]}>
                <Text style={[s.ringT, { color: probColor(o.probability) }]}>{o.probability}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.optName} numberOfLines={1}>{o.name}</Text>
                <Text style={s.optSub} numberOfLines={1}>{o.kind === 'parqueadero' ? 'Privado' : 'Pública · calle'} · {o.walkMinutes} min · {o.freeNow} libres</Text>
              </View>
              <View style={[s.risk, { backgroundColor: riskColor(o.riskLevel) + '1A' }]}>
                <View style={[s.riskDot, { backgroundColor: riskColor(o.riskLevel) }]} />
                <Text style={[s.riskT, { color: riskColor(o.riskLevel) }]}>{o.riskLevel}</Text>
              </View>
            </Pressable>
          );
        })}

        {/* En vivo */}
        {events.length > 0 && (
          <View style={s.feed}>
            <Text style={s.feedH}>Actividad en vivo</Text>
            {events.slice(0, 4).map((e, i) => (
              <View key={i} style={s.feedRow}>
                <Text style={s.feedTime}>{new Date(e.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={s.feedT} numberOfLines={2}>{e.message}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={s.note}>Datos de ejemplo. La predicción es una fórmula simple, todavía no un modelo entrenado.</Text>
      </View>
    </ScrollView>
  );
}

const T = { fontFamily: FONT, color: C.ink };
const s = StyleSheet.create({
  live: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingHorizontal: 10, height: 28 },
  legend: { position: 'absolute', left: 14, bottom: 40, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 999, paddingHorizontal: 10, height: 28 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveT: { ...T, fontSize: 12, fontWeight: '700' },

  sheet: { marginTop: -28, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D5DBE5', marginBottom: 14 },
  h1: { ...T, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  lead: { ...T, color: C.mute, fontSize: 15, marginTop: 4 },
  h2: { ...T, fontSize: 17, fontWeight: '800', marginTop: 24, marginBottom: 10, letterSpacing: -0.2 },

  userB: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.ink, borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  userT: { fontFamily: FONT, color: '#fff', fontSize: 15 },
  botRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 12 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  botB: { flex: 1, backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: C.line },
  botT: { ...T, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  botMute: { ...T, color: C.mute, fontSize: 12, marginTop: 6 },

  pick: { borderRadius: 24, padding: 18, marginBottom: 14 },
  pickTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pickBadgeT: { fontFamily: FONT, color: '#fff', fontSize: 12, fontWeight: '700' },
  pickPct: { fontFamily: FONT, color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  pickName: { fontFamily: FONT, color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  pickSub: { fontFamily: FONT, color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
  pickStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  statT: { fontFamily: FONT, color: '#fff', fontSize: 13, fontWeight: '600' },
  pickWhy: { fontFamily: FONT, color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 10 },
  go: { marginTop: 16, backgroundColor: '#fff', borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  goT: { fontFamily: FONT, color: C.blue, fontSize: 16, fontWeight: '800' },

  alt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 20, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.line },
  altIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  altK: { ...T, color: C.mute, fontSize: 12, fontWeight: '700' },
  altGo: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 999, padding: 4, marginBottom: 12 },
  segB: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 38, borderRadius: 999 },
  segOn: { backgroundColor: C.ink },
  segT: { ...T, fontWeight: '700', fontSize: 13, color: C.mute },
  legendDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
  legendP: { fontFamily: FONT, fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: C.ink, borderRadius: 6, paddingHorizontal: 4, overflow: 'hidden' },
  calm: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 10 },
  calmT: { fontFamily: FONT, color: '#fff', fontSize: 12, fontWeight: '700' },
  calmBar: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 8, overflow: 'hidden' },
  calmFill: { height: 7, borderRadius: 4 },
  reserve: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  reserveT: { fontFamily: FONT, color: '#fff', fontWeight: '800', fontSize: 13 },
  case: { width: 220, backgroundColor: C.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: C.line },
  caseWhen: { ...T, color: C.mute, fontSize: 11, fontWeight: '700' },
  caseTitle: { ...T, fontSize: 16, fontWeight: '800', marginTop: 4 },
  caseSay: { ...T, color: C.mute, fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  caseRain: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#E0F2FE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  caseRainT: { fontFamily: FONT, color: '#0369A1', fontSize: 11, fontWeight: '700' },
  caseOn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF4FF', borderRadius: 16, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#C7D7FE' },
  caseOnK: { ...T, color: C.blue, fontSize: 12, fontWeight: '800' },
  caseOnT: { ...T, fontSize: 14, fontWeight: '600', marginTop: 2 },
  caseExit: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 14, height: 34, justifyContent: 'center' },
  caseExitT: { fontFamily: FONT, color: '#fff', fontWeight: '700', fontSize: 13 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  inputPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingLeft: 18, paddingRight: 6, height: 56 },
  input: { ...T, flex: 1, fontSize: 16, height: '100%' },
  sendB: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  micWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: C.occ },
  mic: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  hint: { ...T, color: C.mute, fontSize: 13, marginTop: 10 },
  error: { ...T, color: C.occ, marginTop: 12 },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 14, height: 42, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipT: { ...T, fontWeight: '700', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: C.line },
  pillT: { ...T, fontWeight: '700', fontSize: 14, minWidth: 48, textAlign: 'center' },
  stepB: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },

  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 18, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  ring: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  ringT: { fontFamily: FONT, fontSize: 14, fontWeight: '800' },
  optName: { ...T, fontWeight: '700', fontSize: 15 },
  optSub: { ...T, color: C.mute, fontSize: 13, marginTop: 2 },
  risk: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskT: { fontFamily: FONT, fontSize: 12, fontWeight: '700' },

  feed: { backgroundColor: C.card, borderRadius: 18, padding: 14, marginTop: 14 },
  feedH: { ...T, fontWeight: '800', fontSize: 14, marginBottom: 6 },
  feedRow: { flexDirection: 'row', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.soft },
  feedTime: { ...T, fontSize: 12, fontWeight: '700', color: C.mute, width: 44 },
  feedT: { ...T, fontSize: 13, flex: 1 },
  note: { ...T, color: C.mute, fontSize: 12, marginTop: 14, textAlign: 'center' },
});
