import { Unit } from './types';

const LB_PER_KG = 2.20462262;

export const unitLabel = (u: Unit) => u;

// Trim to 1 decimal and drop a trailing ".0"
export const tidy = (n: number) => String(Math.round(n * 10) / 10);

export function convertWeight(value: number, from: Unit, to: Unit) {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

// Weight fields are free text: leave empty / non numeric values untouched
export function convertWeightString(s: string, from: Unit, to: Unit) {
  const n = parseFloat(String(s).replace(',', '.'));
  if (!s || Number.isNaN(n)) return s;
  return tidy(convertWeight(n, from, to));
}

export const defaultStep = (u: Unit) => (u === 'kg' ? 2.5 : 5);
