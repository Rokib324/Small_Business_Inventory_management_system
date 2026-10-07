/**
 * Baki (বাকি) - Money Utilities
 * Rule 2: All money is stored as integers in poisha (1 Taka = 100 poisha).
 * Never use floating-point numbers for money storage or calculation.
 */

const BANGLA_DIGITS: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

/**
 * Converts any number or numeric string to Bangla numerals.
 * Example: "1500.50" -> "১৫০০.৫০"
 */
export function toBanglaDigits(val: string | number): string {
  return String(val).replace(/[0-9]/g, (digit) => BANGLA_DIGITS[digit] || digit);
}

/**
 * Converts Taka (from user input / text field) to integer poisha.
 * Handles float strings safely using rounding to avoid IEEE 754 precision issues.
 * Examples:
 * - 100 -> 10000
 * - 100.50 -> 10050
 * - "100.55" -> 10055
 */
export function toPoisha(taka: number | string): number {
  if (typeof taka === "string") {
    // Replace any comma separators and trim
    const sanitized = taka.replace(/,/g, "").trim();
    if (!sanitized) return 0;
    const parsed = Number(sanitized);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }

  if (isNaN(taka)) return 0;
  return Math.round(taka * 100);
}

/**
 * Converts integer poisha back to decimal Taka.
 * Example: 10050 -> 100.5
 */
export function fromPoisha(poisha: number): number {
  if (isNaN(poisha)) return 0;
  return poisha / 100;
}

/**
 * Formats poisha into standard localized currency string (English numerals).
 * Example: 125000 -> "৳ 1,250.00"
 */
export function formatMoney(
  poisha: number,
  options: {
    showCurrencySymbol?: boolean;
    showPoisha?: boolean;
  } = {}
): string {
  const { showCurrencySymbol = true, showPoisha = true } = options;
  const isNegative = poisha < 0;
  const absPoisha = Math.abs(poisha);
  const taka = Math.floor(absPoisha / 100);
  const remPoisha = absPoisha % 100;

  // Format with standard thousand separators
  const takaFormatted = taka.toLocaleString("en-US");
  const symbol = showCurrencySymbol ? "৳ " : "";

  let formatted = "";
  if (showPoisha || remPoisha > 0) {
    const poishaStr = remPoisha.toString().padStart(2, "0");
    formatted = `${symbol}${takaFormatted}.${poishaStr}`;
  } else {
    formatted = `${symbol}${takaFormatted}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats poisha into Bangla currency string with Bangla numerals (বাংলা রূপান্তর).
 * Used at final UI render time only.
 * Examples:
 * - 125000 -> "৳ ১,২৫০"
 * - 125050 -> "৳ ১,২৫০.৫০"
 * - -50000 -> "-৳ ৫০০"
 */
export function formatMoneyBn(
  poisha: number,
  options: {
    showCurrencySymbol?: boolean;
    alwaysShowPoisha?: boolean;
  } = {}
): string {
  const { showCurrencySymbol = true, alwaysShowPoisha = false } = options;
  const isNegative = poisha < 0;
  const absPoisha = Math.abs(poisha);
  const taka = Math.floor(absPoisha / 100);
  const remPoisha = absPoisha % 100;

  // Format integer Taka with South Asian / Bengali numbering (lakh/crore) style commas
  const takaStr = formatSouthAsianNumber(taka);
  const takaBn = toBanglaDigits(takaStr);
  const symbol = showCurrencySymbol ? "৳ " : "";

  let result = "";
  if (alwaysShowPoisha || remPoisha > 0) {
    const poishaBn = toBanglaDigits(remPoisha.toString().padStart(2, "0"));
    result = `${symbol}${takaBn}.${poishaBn}`;
  } else {
    result = `${symbol}${takaBn}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Format numbers using South Asian thousand/lakh/crore grouping (e.g. 12,34,567)
 */
export function formatSouthAsianNumber(num: number): string {
  const str = Math.abs(num).toString();
  if (str.length <= 3) return str;

  const lastThree = str.substring(str.length - 3);
  const remaining = str.substring(0, str.length - 3);

  // Group by 2s for remaining
  const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${formattedRemaining},${lastThree}`;
}
