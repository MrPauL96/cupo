import type { Destination, Lot, Option, Zone } from '../api';

export type MapProps = { area?: string; zones: Zone[]; lots: Lot[]; dest?: Destination; best?: Option };
