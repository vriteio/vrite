const currencyUSDFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2
});
const compactNumberFormatter = new Intl.NumberFormat("en-US", { notation: "compact" });
const numberFormatter = new Intl.NumberFormat("en-US", { notation: "standard" });

const formatUSD = (value: number | string) => currencyUSDFormatter.format(Number(value));
const formatNumber = (value: number, options?: { compact?: boolean }): string => {
  if (options?.compact) {
    return compactNumberFormatter.format(value);
  }

  return numberFormatter.format(value);
};

export { formatUSD, formatNumber };
