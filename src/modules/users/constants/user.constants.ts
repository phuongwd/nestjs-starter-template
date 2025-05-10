export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const SALT_ROUNDS = 10;
export const PASSWORD_MIN_LENGTH = 8;

export const ERROR_MESSAGES = {
  USER_NOT_FOUND: (id: number) => `User with ID ${id} not found`,
  INVALID_PASSWORD:
    'Password must contain uppercase, lowercase, number and special character',
} as const;
