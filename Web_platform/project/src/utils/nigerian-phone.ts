export const NIGERIAN_PHONE_PREFIX = '+234';

export function phoneDigits(value: string): string {
  const withoutPrefix = value.replace(/^\+234/, '').replace(/^0/, '');
  return withoutPrefix.replace(/\D/g, '').slice(0, 10);
}

export function formatNigerianPhone(value: string): string {
  return `${NIGERIAN_PHONE_PREFIX}${phoneDigits(value)}`;
}

export function isCompleteNigerianPhone(value: string): boolean {
  return /^\+234\d{10}$/.test(value);
}
