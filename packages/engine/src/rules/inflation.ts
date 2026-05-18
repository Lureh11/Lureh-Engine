export function adjustForInflation(
  amount: number,
  annualRate: number,
  monthsForward: number,
): number {
  if (annualRate === 0 || monthsForward <= 0) return amount;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  return Math.round(amount * Math.pow(1 + monthlyRate, monthsForward) * 100) / 100;
}

export function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth())
  );
}
