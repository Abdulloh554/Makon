const UZ_OPERATORS = [
  '90', '91', '93', '94', '95', '97', '98', '99',
  '33', '88', '77', '50', '55', '66', '70', '71',
];

function normalizePhone(raw) {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return '+' + digits;
  if (digits.length === 9) return '+998' + digits;
  if (digits.length === 11 && digits.startsWith('8')) return '+998' + digits.slice(1);
  if (digits.length === 13 && digits.startsWith('998')) return '+' + digits;
  return raw.trim();
}

function isValidUzbekPhone(phone) {
  if (typeof phone !== 'string') return false;
  const normalized = normalizePhone(phone);
  const match = normalized.match(/^\+998(\d{2})(\d{7})$/);
  if (!match) return false;
  return UZ_OPERATORS.includes(match[1]);
}

module.exports = { normalizePhone, isValidUzbekPhone, UZ_OPERATORS };
