export function formatMoney(amount: number | null | undefined, currency = "TZS"): string {
  return `${currency} ${(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
