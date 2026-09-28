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

  if (/^[789]\d{9}$/.test(compact)) {
    return `+234${compact}`;
  }

  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  return null;
}
