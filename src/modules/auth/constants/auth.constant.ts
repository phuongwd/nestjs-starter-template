export const AUTH_CONSTANTS = {
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  PASSWORD_RESET_EXPIRES_IN:
    Number(process.env.PASSWORD_RESET_EXPIRES_IN) || 3600000, // 1 hour
  THROTTLE_TTL: Number(process.env.AUTH_THROTTLE_TTL) || 60000, // 1 minute
  THROTTLE_LIMIT: Number(process.env.AUTH_THROTTLE_LIMIT) || 5,
  LOGIN_THROTTLE_TTL: Number(process.env.LOGIN_THROTTLE_TTL) || 300000, // 5 minutes
  LOGIN_THROTTLE_LIMIT: Number(process.env.LOGIN_THROTTLE_LIMIT) || 5,
  MAX_FAILED_ATTEMPTS: Number(process.env.MAX_FAILED_ATTEMPTS) || 10,
  ACCOUNT_LOCK_DURATION: Number(process.env.ACCOUNT_LOCK_DURATION) || 3600000, // 1 hour lock duration
} as const;

export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_EXISTS: 'Email already exists',
  USER_NOT_FOUND: 'User not found',
  INVALID_TOKEN: 'Invalid or expired token',
  TOKEN_EXPIRED: 'Token has expired',
  UNAUTHORIZED: 'Unauthorized access',
} as const;
