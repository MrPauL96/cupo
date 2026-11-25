import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'mic' | 'stop' | 'send' | 'nav' | 'rain' | 'pin' | 'walk' | 'shield' | 'spark' | 'car' | 'clock' | 'minus' | 'plus' | 'parking' | 'check';

/** Íconos de línea simples dibujados con SVG (sin fuentes ni imágenes). */
export default function Icon({ name, size = 20, color = '#0B1220', stroke = 2 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'mic' && (<><Rect x="9" y="3" width="6" height="11" rx="3" {...p} /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...p} /></>)}
      {name === 'stop' && <Rect x="7" y="7" width="10" height="10" rx="2" fill={color} />}
      {name === 'send' && <Path d="M12 19V5M5 12l7-7 7 7" {...p} />}
      {name === 'nav' && <Path d="M3 11l18-8-8 18-2-8-8-2z" {...p} />}
      {name === 'rain' && (<><Path d="M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5A3.5 3.5 0 0 1 17.5 15H7z" {...p} /><Path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2" {...p} /></>)}
      {name === 'pin' && (<><Path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" {...p} /><Circle cx="12" cy="10" r="2.5" {...p} /></>)}
      {name === 'walk' && (<><Circle cx="13" cy="4.5" r="1.8" {...p} /><Path d="M10 21l2-6 3 3v3M9 12l2-4 4 2 2 3M11 8l-3 2-1 3" {...p} /></>)}
      {name === 'shield' && <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" {...p} />}
      {name === 'spark' && <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" fill={color} />}
      {name === 'car' && (<><Path d="M5 16V11l2-5h10l2 5v5" {...p} /><Path d="M3 16h18v3H3zM7 19v2M17 19v2" {...p} /><Circle cx="7.5" cy="13" r="1" fill={color} /><Circle cx="16.5" cy="13" r="1" fill={color} /></>)}
      {name === 'clock' && (<><Circle cx="12" cy="12" r="9" {...p} /><Path d="M12 7v5l3 2" {...p} /></>)}
      {name === 'minus' && <Path d="M5 12h14" {...p} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'parking' && (<><Rect x="3" y="3" width="18" height="18" rx="5" {...p} /><Path d="M9 17V7h4a3 3 0 0 1 0 6H9" {...p} /></>)}
      {name === 'check' && <Path d="M5 12l5 5 9-10" {...p} />}
    </Svg>
  );
}
