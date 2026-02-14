/**
 * Utility Functions
 */

/**
 * API Response Format Wrapper
 */
export const apiResponse = (
  success: boolean,
  message: string,
  data: unknown = null,
  statusCode: number = success ? 200 : 400
) => ({
  success,
  statusCode,
  message,
  data,
  timestamp: new Date().toISOString(),
});

/**
 * Validate Email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate Random ID
 */
export const generateId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Delay Promise (for testing)
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
