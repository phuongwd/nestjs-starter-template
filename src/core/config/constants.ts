export const CORE_CONFIG = {
  LOGGING: {
    ENABLED: true,
    LEVEL: 'debug',
  },
  THROTTLE: {
    TTL: 60000,
    LIMIT: 5,
  },
  SECURITY: {
    CORS_METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
    HELMET_ENABLED: true,
  },
  VALIDATION: {
    WHITELIST: true,
    TRANSFORM: true,
    FORBID_NON_WHITELISTED: true,
  },
  API: {
    PREFIX: 'api',
    CURRENT_VERSION: '1',
    DEPRECATED_VERSIONS: [],
  },
};
