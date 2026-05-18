import type { FinancialEvent, Recurrence } from '../models/types.js';

export interface ExpandedOccurrence {
  event: FinancialEvent;
  date: string;
}

export function expandRecurrences(
  events: FinancialEvent[],
  rangeStart: string,
  rangeEnd: string,
): ExpandedOccurrence[] {
  const occurrences: ExpandedOccurrence[] = [];

  for (const event of events) {
    if (!event.isActive) continue;
    const dates = generateOccurrenceDates(event, rangeStart, rangeEnd);
    for (const date of dates) {
      occurrences.push({ event, date });
    }
  }

  occurrences.sort((a, b) => a.date.localeCompare(b.date));
  return occurrences;
}

function generateOccurrenceDates(
  event: FinancialEvent,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  const { recurrence } = event;

  if (recurrence.frequency === 'once') {
    if (event.startDate >= rangeStart && event.startDate <= rangeEnd) {
      return [event.startDate];
    }
    return [];
  }

  const dates: string[] = [];
  let current = new Date(event.startDate + 'T00:00:00');
  const end = new Date(rangeEnd + 'T00:00:00');
  const recEnd = recurrence.endDate
    ? new Date(recurrence.endDate + 'T00:00:00')
    : null;
  const eventEnd = event.endDate
    ? new Date(event.endDate + 'T00:00:00')
    : null;
  let count = 0;

  while (current <= end) {
    if (recEnd && current > recEnd) break;
    if (eventEnd && current > eventEnd) break;
    if (recurrence.maxOccurrences && count >= recurrence.maxOccurrences) break;

    const iso = toISODate(current);
    if (iso >= rangeStart) {
      dates.push(iso);
    }

    current = advanceDate(current, recurrence);
    count++;

    if (count > 10_000) break;
  }

  return dates;
}

function advanceDate(date: Date, recurrence: Recurrence): Date {
  const next = new Date(date);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14 * interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      if (recurrence.dayOfMonth) {
        const maxDay = daysInMonth(next.getFullYear(), next.getMonth());
        next.setDate(Math.min(recurrence.dayOfMonth, maxDay));
      }
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3 * interval);
      break;
    case 'semiannual':
      next.setMonth(next.getMonth() + 6 * interval);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + interval);
      break;
    case 'once':
      return new Date(8640000000000000);
  }

  return next;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
