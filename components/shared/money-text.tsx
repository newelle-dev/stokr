import { formatMoney } from '@/lib/money';

interface MoneyTextProps {
  centavos: number;
  className?: string;
  hidePrefix?: boolean;
}

/**
 * Renders monetary amounts using tabular figures and consistent formatting.
 * Guaranteed to format integer centavos to Philippine Peso (e.g., ₱1,234.50).
 */
export function MoneyText({ centavos, className = '' }: MoneyTextProps) {
  const formatted = formatMoney(centavos);

  return (
    <span className={`tabular-nums font-mono ${className}`.trim()}>
      {formatted}
    </span>
  );
}
