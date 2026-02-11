/**
 * Phone number formatting for backend (E.164).
 * Backend requires +[country][number], e.g. +919876543210.
 */

export function toE164(phone: string, defaultCountryCode = '91'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && defaultCountryCode === '91') {
    return `+91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length >= 10) {
    return `+${defaultCountryCode}${digits.slice(-10)}`;
  }
  return `+${defaultCountryCode}${digits}`;
}
