// Zonas del piloto y el dibujo de sus calles para el mapa web (en el celular se usa el mapa real).
// Referencias tomadas de Google Maps; el trazado de calles secundarias es aproximado.
export type LL = [number, number];
export type Street = { name?: string; pts: LL[]; w?: number; label?: LL; rot?: number };
export type Area = {
  id: string;
  name: string;
  center: LL;
  span: number; // grados de longitud visibles a lo ancho
  streets: Street[];
  greens: { at: LL; rx: number; ry: number; label?: string; color?: string }[];
};

export const AREAS: Area[] = [
  {
    id: 'laureles', name: 'Laureles', center: [6.2437, -75.593], span: 0.0148,
    streets: [
      { name: 'Cra. 70', pts: [[6.2525, -75.5885], [6.2492, -75.5888], [6.2446, -75.5894], [6.24, -75.59], [6.235, -75.5906]], w: 9, label: [6.2505, -75.5884], rot: -90 },
      { name: 'Cl. 44 · San Juan', pts: [[6.2494, -75.601], [6.249, -75.585]], w: 9, label: [6.2497, -75.5995] },
      { name: 'Av. Nutibara', pts: [[6.2398, -75.5904], [6.2412, -75.5917], [6.2492, -75.599], [6.251, -75.6007]], w: 9, label: [6.2477, -75.598], rot: -42 },
      { name: 'Av. 33', pts: [[6.2386, -75.601], [6.2389, -75.5967], [6.2394, -75.59], [6.2398, -75.585]], w: 9, label: [6.2382, -75.5925] },
      { name: 'Cra. 76', pts: [[6.2525, -75.597], [6.235, -75.5966]], label: [6.2415, -75.5974], rot: -90 },
      { name: 'Cra. 80', pts: [[6.2525, -75.5997], [6.235, -75.599]], label: [6.242, -75.6001], rot: -90 },
      { name: 'Cra. 73', pts: [[6.2492, -75.5927], [6.24, -75.5932]], label: [6.2478, -75.5923], rot: -90 },
      { name: 'Cq. 1', pts: [[6.2446, -75.5894], [6.2433, -75.5899], [6.2421, -75.5907], [6.2412, -75.5917]], label: [6.2436, -75.5911], rot: 55 },
      { pts: [[6.247, -75.5868], [6.238, -75.5872]] },
      { pts: [[6.2468, -75.601], [6.2463, -75.585]] },
      { pts: [[6.2425, -75.601], [6.2419, -75.5925]] },
    ],
    greens: [
      { at: [6.2458, -75.5935], rx: 0.0006, ry: 0.00045, label: 'Primer Parque' },
      { at: [6.2447, -75.5969], rx: 0.0003, ry: 0.00028, label: 'Segundo Parque' },
      { at: [6.2418, -75.5889], rx: 0.0007, ry: 0.0005, label: 'UPB', color: '#DCE3F7' },
      { at: [6.2411, -75.5862], rx: 0.0005, ry: 0.0005, label: 'Unicentro', color: '#E1E1E8' },
    ],
  },
  {
    id: 'poblado', name: 'El Poblado', center: [6.2093, -75.568], span: 0.0105,
    streets: [
      { name: 'Av. El Poblado', pts: [[6.216, -75.571], [6.2106, -75.5705], [6.203, -75.5701]], w: 9, label: [6.2135, -75.5715], rot: -90 },
      { name: 'Cl. 10', pts: [[6.2112, -75.5735], [6.2106, -75.5705], [6.2091, -75.5667], [6.2082, -75.563]], w: 9, label: [6.2104, -75.5688], rot: -21 },
      { name: 'Cra. 37', pts: [[6.2135, -75.5665], [6.204, -75.5669]], label: [6.2122, -75.5662], rot: -90 },
      { name: 'Cra. 35', pts: [[6.2135, -75.5654], [6.204, -75.5658]], label: [6.2056, -75.5651], rot: -90 },
      { name: 'Cl. 9', pts: [[6.2097, -75.5735], [6.2093, -75.5705], [6.2079, -75.5667], [6.2071, -75.563]] },
      { name: 'Cl. 8', pts: [[6.2083, -75.5735], [6.2079, -75.5705], [6.2066, -75.5667], [6.2058, -75.563]], label: [6.2071, -75.5688], rot: -21 },
      { pts: [[6.2122, -75.5735], [6.2118, -75.5705], [6.2104, -75.5667], [6.2096, -75.563]] },
      { pts: [[6.2135, -75.5684], [6.204, -75.5686]] },
    ],
    greens: [
      { at: [6.2103, -75.5712], rx: 0.0004, ry: 0.00035, label: 'Parque de El Poblado' },
      { at: [6.209, -75.5679], rx: 0.00022, ry: 0.0002, label: 'Parque Lleras' },
    ],
  },
  {
    id: 'envigado', name: 'Envigado', center: [6.1703, -75.5875], span: 0.0085,
    streets: [
      { name: 'Cra. 43A', pts: [[6.176, -75.5886], [6.165, -75.5881]], w: 9, label: [6.1735, -75.5891], rot: -90 },
      { name: 'Cra. 42', pts: [[6.175, -75.5866], [6.166, -75.5863]], label: [6.1675, -75.5859], rot: -90 },
      { name: 'Cl. 37 Sur', pts: [[6.1711, -75.5915], [6.1711, -75.584]], label: [6.1715, -75.5905] },
      { name: 'Cl. 38 Sur', pts: [[6.17, -75.5915], [6.17, -75.584]], w: 7, label: [6.1696, -75.5905] },
      { name: 'Cl. 36 Sur', pts: [[6.1722, -75.5915], [6.1722, -75.584]], label: [6.1726, -75.5905] },
      { pts: [[6.1689, -75.5915], [6.1689, -75.584]] },
      { pts: [[6.175, -75.5904], [6.166, -75.59]] },
      { pts: [[6.175, -75.5848], [6.166, -75.5846]] },
    ],
    greens: [{ at: [6.1702, -75.5873], rx: 0.0004, ry: 0.0004, label: 'Parque de Envigado' }],
  },
  {
    id: 'itagui', name: 'Itagüí', center: [6.172, -75.6103], span: 0.0085,
    streets: [
      // Cuadrícula aproximada alrededor del Parque Obrero
      { pts: [[6.1722, -75.615], [6.1722, -75.6055]], w: 8 },
      { pts: [[6.1709, -75.615], [6.1709, -75.6055]] },
      { pts: [[6.1735, -75.615], [6.1735, -75.6055]] },
      { pts: [[6.1695, -75.615], [6.1695, -75.6055]] },
      { pts: [[6.1765, -75.6117], [6.1675, -75.6117]], w: 8 },
      { pts: [[6.1765, -75.6103], [6.1675, -75.6103]] },
      { pts: [[6.1765, -75.6089], [6.1675, -75.6089]] },
      { pts: [[6.1765, -75.6131], [6.1675, -75.6131]] },
    ],
    greens: [{ at: [6.172, -75.6117], rx: 0.00035, ry: 0.0003, label: 'Parque Obrero' }],
  },
];

export const areaOf = (id?: string) => AREAS.find((a) => a.id === id) ?? AREAS[0];
