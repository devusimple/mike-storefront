/** Pico: taka amounts with thousands separators, e.g. ৳1,250.00 */
export function taka(cents: number): string {
  const value = (cents ?? 0) / 100;
  return `৳${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
