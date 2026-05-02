/**
 * Format integer price (pesewas) to display string.
 * Example: 1050 → "10.50"
 */
export function formatPrice(pesewas: number): string {
  return (pesewas / 100).toFixed(2);
}

/**
 * Format integer price (pesewas) to GHS currency string.
 * Example: 1050 → "GH₵ 10.50"
 */
export function formatPriceGHS(pesewas: number): string {
  return `GH₵ ${formatPrice(pesewas)}`;
}
