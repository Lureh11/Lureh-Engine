import type { PeriodSnapshot, VariabilityBand, SimulationConfig } from '../models/types.js';
import { monthsBetween } from '../rules/inflation.js';

/**
 * Generates optimistic/pessimistic bands around the expected timeline.
 * Uncertainty grows over time — the further out, the wider the band.
 *
 * Base margin: ±5% at month 1, growing ~1% per month.
 * Cap: ±30% at 5 years.
 */
export function generateVariabilityBands(
  timeline: PeriodSnapshot[],
  config: SimulationConfig,
): VariabilityBand[] {
  if (timeline.length === 0) return [];

  return timeline.map((snap) => {
    const months = Math.max(1, monthsBetween(config.startDate, snap.date));
    const margin = Math.min(0.30, 0.05 + months * 0.01);
    const expected = snap.totalBalance;

    return {
      date: snap.date,
      optimistic: Math.round(expected * (1 + margin)),
      expected,
      pessimistic: Math.round(expected * (1 - margin)),
    };
  });
}
