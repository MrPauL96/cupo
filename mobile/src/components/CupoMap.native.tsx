import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { C } from '../theme';
import type { MapProps } from './mapTypes';
import SchematicMap from './CupoMap.schematic';
import { areaOf } from '../areas';

const LAURELES = { latitude: 6.2438, longitude: -75.5928, latitudeDelta: 0.014, longitudeDelta: 0.014 };

/** Mapa real (Google Maps en Android, Apple Maps en iPhone). */
/**
 * EXPO_PUBLIC_MAP=esquema → mapa dibujado (no necesita API key de Google Maps; útil para un APK rápido).
 * Sin esa variable → mapa real de Google Maps (Android) o Apple Maps (iPhone).
 */
export default function CupoMap(props: MapProps) {
  return process.env.EXPO_PUBLIC_MAP === 'esquema' ? <SchematicMap {...props} /> : <RealMap {...props} />;
}

function RealMap({ area, zones, lots, dest, best }: MapProps) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    const a = areaOf(area);
    map.current?.animateToRegion({ latitude: a.center[0], longitude: a.center[1], latitudeDelta: a.span, longitudeDelta: a.span }, 600);
  }, [area]);
  useEffect(() => {
    if (best) map.current?.animateToRegion({ latitude: best.lat, longitude: best.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 600);
  }, [best?.id]);

  return (
    <MapView ref={map} style={StyleSheet.absoluteFill} initialRegion={LAURELES} showsUserLocation>
      {zones.flatMap((z) => z.spots.map((p) => (
        <Marker key={`${z.id}-${p.index}`} coordinate={{ latitude: p.lat, longitude: p.lng }} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[s.dot, { backgroundColor: p.occupied ? C.occ : C.free }]} />
        </Marker>
      )))}
      {lots.map((l) => (
        <Marker key={'l' + l.id} coordinate={{ latitude: l.lat, longitude: l.lng }} title={l.name} tracksViewChanges={false}>
          <View style={s.lot}><Text style={s.lotT}>P · {l.free}</Text></View>
        </Marker>
      ))}
      {dest && <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} title={dest.name} pinColor={C.ink} />}
      {best && (
        <Circle center={{ latitude: best.lat, longitude: best.lng }} radius={70}
          strokeColor={C.blue} strokeWidth={3} fillColor="rgba(29,78,216,0.14)" />
      )}
    </MapView>
  );
}

const s = StyleSheet.create({
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  lot: { backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  lotT: { color: '#fff', fontWeight: '700' },
});
