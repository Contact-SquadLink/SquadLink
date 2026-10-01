export function formatPrice(amount?: number | string | null, currency = 'NGN'): string {
  const symbols: Record<string, string> = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '';
  const num = typeof amount === 'number' ? amount : Number(amount ?? 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  return `${symbol}${safeNum.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatDate(date?: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
