export const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export const getCurrencySymbol = (currencyCode: string = 'INR'): string => {
  const currency = CURRENCY_OPTIONS.find(c => c.code === currencyCode);
  return currency?.symbol || '₹';
};

export const formatCurrency = (
  amount: number, 
  currencyCode: string = 'INR',
  locale: string = 'en-IN'
): string => {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedAmount}`;
};
