import { Unit } from './types';

export const PLATES: Record<Unit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};
export const BARS: Record<Unit, number[]> = { kg: [20, 15], lb: [45, 35] };

// Competition plate colours (kg); lb plates reuse the closest colour
export const PLATE_COLORS: Record<string, string> = {
  '25': '#D7263D',
  '20': '#1F5FBF',
  '15': '#F2B705',
  '10': '#1E9E5A',
  '5': '#F4F4F4',
  '2.5': '#2B2F36',
  '1.25': '#8A93A0',
  '45': '#1F5FBF',
  '35': '#F2B705',
  '55': '#D7263D',
};

// Greedy loading, one side of the bar. `rest` is what cannot be loaded with these plates.
export function computePlates(target: number, bar: number, plates: number[]) {
  const perSide = (target - bar) / 2;
  if (perSide < 0) return { perSide: [] as number[], rest: 0, tooLight: true };
  let left = Math.round(perSide * 1000) / 1000;
  const out: number[] = [];
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (left + 1e-9 >= p) {
      out.push(p);
      left = Math.round((left - p) * 1000) / 1000;
    }
  }
  return { perSide: out, rest: Math.round(left * 2 * 1000) / 1000, tooLight: false };
}
