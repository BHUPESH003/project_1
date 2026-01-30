/**
 * Utility functions for formatting
 */

export const formatPhoneNumber = (phone: string): string => {
  // Remove non-digits
  const cleaned = phone.replace(/\D/g, '');
  return cleaned;
};

export const maskPhoneNumber = (phone: string): string => {
  // Format as ****-****-89 style
  const last4 = phone.slice(-4);
  return `****-****-${last4}`;
};

export const formatOrderId = (id: string | number): string => {
  return `#${id}`.toUpperCase();
};

/**
 * Format currency amount
 * Input: 1299 -> Output: "₹1,299"
 */
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  const currencySymbol =
    currency === 'INR'
      ? '₹'
      : currency === 'USD'
        ? '$'
        : currency === 'EUR'
          ? '€'
          : currency;

  return `${currencySymbol}${amount.toLocaleString('en-IN')}`;
};

/**
 * Format date
 * Input: "2025-01-29T10:30:00Z" -> Output: "29 Jan, 2025"
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return date.toLocaleDateString('en-IN', options);
};

/**
 * Format date and time
 * Input: "2025-01-29T10:30:00Z" -> Output: "29 Jan, 2025 • 10:30 AM"
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };

  const datePart = date.toLocaleDateString('en-IN', dateOptions);
  const timePart = date.toLocaleTimeString('en-IN', timeOptions);

  return `${datePart} • ${timePart}`;
};

/**
 * Truncate text
 * Input: "This is a very long text", 10 -> Output: "This is a ..."
 */
export const truncateText = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
};

/**
 * Extract error message from API error
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};
