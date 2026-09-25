export function normalizePhoneNumber(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");

  if (/^\+234\d{10}$/.test(compact)) {
    return compact;
  }

  if (/^0\d{10}$/.test(compact)) {
    return `+234${compact.slice(1)}`;
  }

  if (/^234\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  return null;
}
