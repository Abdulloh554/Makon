/**
 * @file routes.ts
 * @layer Shared
 * @responsibility All API endpoint paths as single source of truth
 */

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    ME: '/api/v1/auth/me',
    CSRF: '/api/v1/auth/csrf',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    GOOGLE: '/api/v1/auth/google',
  },
  CAROUSEL: '/api/v1/carousel',
  PROPERTIES: {
    LIST: '/api/v1/properties',
    CREATE: '/api/v1/properties',
    DETAIL: (id: string) => `/api/v1/properties/${id}` as const,
    UPDATE: (id: string) => `/api/v1/properties/${id}` as const,
    DELETE: (id: string) => `/api/v1/properties/${id}` as const,
    MINE: '/api/v1/properties/mine',
  },
  MESSAGES: {
    CONVERSATIONS: '/api/v1/messages/conversations',
    LIST: (conversationId: string) => `/api/v1/messages/${conversationId}` as const,
    SEND: '/api/v1/messages',
    UPDATE: (id: string) => `/api/v1/messages/${id}` as const,
    DELETE: (id: string) => `/api/v1/messages/${id}` as const,
  },
  SELLERS: {
    LIST: '/api/v1/sellers',
    DETAIL: (id: string) => `/api/v1/sellers/${id}` as const,
    CREATE: '/api/v1/sellers',
    UPDATE: '/api/v1/sellers/me',
  },
  PAYMENTS: {
    CREATE: '/api/v1/payments',
    HISTORY: '/api/v1/payments/history',
    WEBHOOK: {
      STRIPE: '/api/v1/payments/webhook/stripe',
      PAYME: '/api/v1/payments/webhook/payme',
      CLICK: '/api/v1/payments/webhook/click',
    },
  },
  IMAGES: {
    UPLOAD: '/api/v1/images/upload',
    DELETE: (id: string) => `/api/v1/images/${id}` as const,
  },
  ADMIN: {
    USERS: '/api/v1/admin/users',
    PROPERTIES: '/api/v1/admin/properties',
    STATS: '/api/v1/admin/stats',
  },
  HEALTH: '/api/v1/health',
} as const
