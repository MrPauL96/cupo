import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { C, FONT } from '../theme';
import type { MapProps } from './mapTypes';

/**
 * Vista previa web: react-native-maps no funciona en navegador, así que dibujamos Laureles en SVG
 * con las calles principales trazadas sobre coordenadas reales (Google Maps). En el celular se usa el mapa real.
 */
import { areaOf, LL } from '../areas';

export default function CupoMap({ area, zones, lots, dest, best }: MapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const A = areaOf(area);
  const CENTER = A.center;
  const k = size.w / A.span; // px por grado
  const AV = A.streets.filter((s) => s.w);
  const ST = A.streets.filter((s) => !s.w);
  const xy = ([lat, lng]: LL) => [(lng - CENTER[1]) * k + size.w / 2, (CENTER[0] - lat) * k + size.h / 2] as const;
  const pts = (l: LL[]) => l.map((p) => xy(p).join(',')).join(' ');
  const blob = (ll: LL, rx: number, ry: number, fill: string, key: string) => {
    const [x, y] = xy(ll);
    return <Rect key={key} x={x - rx} y={y - ry} width={rx * 2} height={ry * 2} rx={Math.min(rx, ry)} fill={fill} />;
  };
  const label = (t: string, ll: LL, rot = 0, key?: string, size2 = 10, color = '#8A94A6') => {
    const [x, y] = xy(ll);
    return (
      <SvgText key={key ?? t} x={x} y={y} fontSize={size2} fontWeight="700" fill={color} textAnchor="middle"
        transform={rot ? `rotate(${rot} ${x} ${y})` : undefined} fontFamily={FONT}>{t}</SvgText>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EAEEF3' }]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          {/* Zonas verdes y referencias */}
          {A.greens.map((g, i) => blob(g.at, g.rx * k, g.ry * k, g.color ?? '#CFE8C6', 'g' + i))}

          {/* Calles */}
          {ST.map((s, i) => <Polyline key={'s' + i} points={pts(s.pts)} fill="none" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />)}
          {AV.map((s, i) => <Polyline key={'ao' + i} points={pts(s.pts)} fill="none" stroke="#D9DFE8" strokeWidth={(s.w ?? 6) + 3} strokeLinecap="round" strokeLinejoin="round" />)}
          {AV.map((s, i) => <Polyline key={'a' + i} points={pts(s.pts)} fill="none" stroke="#FFFFFF" strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />)}

          {/* Nombres */}
          {A.streets.map((s, i) => s.name && s.label ? label(s.name, s.label, s.rot, 'n' + i) : null)}
          {A.greens.map((g, i) => g.label ? label(g.label, [g.at[0] - g.ry * 0.25, g.at[1]], 0, 'gl' + i, 10, g.color ? '#5B6B9A' : '#4C8A3F') : null)}

          {/* Cupos en la calle */}
          {zones.flatMap((z) => z.spots.map((p) => {
            const [x, y] = xy([p.lat, p.lng]);
            return <Circle key={`${z.id}-${p.index}`} cx={x} cy={y} r={4.6} fill={p.occupied ? C.occ : C.free} stroke="#fff" strokeWidth={1.6} />;
          }))}

          {/* Opción elegida */}
          {best && (() => { const [x, y] = xy([best.lat, best.lng]); return (
            <G>
              <Circle cx={x} cy={y} r={26} fill="rgba(29,78,216,0.14)" stroke={C.blue} strokeWidth={2.5} />
            </G>
          ); })()}

          {/* Parqueaderos privados */}
          {lots.map((l) => {
            const [x, y] = xy([l.lat, l.lng]);
            const full = l.free === 0;
            return (
              <G key={'l' + l.id}>
                <Rect x={x - 22} y={y - 11} width={44} height={22} rx={11} fill={full ? '#6B7280' : C.ink} />
                <SvgText x={x} y={y + 4} fontSize={11} fontWeight="800" fill="#fff" textAnchor="middle" fontFamily={FONT}>{`P · ${l.free}`}</SvgText>
              </G>
            );
          })}

          {/* Destino */}
          {dest && (() => { const [x, y] = xy([dest.lat, dest.lng]); return (
            <G>
              <Path d={`M${x} ${y} l-9 -16 a10.5 10.5 0 1 1 18 0 z`} fill={C.ink} />
              <Circle cx={x} cy={y - 21} r={4} fill="#fff" />
            </G>
          ); })()}
        </Svg>
      )}
    </View>
  );
}
