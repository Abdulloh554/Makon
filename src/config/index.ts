import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

function createConfig() {
  const isProduction = process.env.NODE_ENV === 'production'

  const configSchema = z.object({
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/makon'),
    USE_MONGO: z.string().default(isProduction ? 'true' : 'true'),
    JWT_SECRET: isProduction
      ? z.string().min(32, 'Production da JWT_SECRET kamida 32 belgidan iborat bo\'lishi kerak')
      : z.string().min(1).default('dev_jwt_secret_key_not_for_production_' + Date.now()),
    JWT_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: isProduction
      ? z.string().min(32)
      : z.string().min(1).default('dev_refresh_secret_key_for_development_only'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_ENABLED: z.string().default('true'),
    CORS_ORIGIN: isProduction
      ? z.string().min(1, 'Production da CORS_ORIGIN aniq ko\'rsatilishi kerak').refine(v => v !== '*', { message: 'Production da CORS_ORIGIN * bo\'lishi mumkin emas' })
      : z.string().default('http://localhost:3000'),
    RATE_LIMIT_MAX: z.coerce.number().default(isProduction ? 30 : 100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    SENTRY_DSN: z.string().default(''),
    SENTRY_ENABLED: z.string().default('false'),
    LOG_LEVEL: z.string().default(isProduction ? 'info' : 'debug'),
    TELEGRAM_BOT_TOKEN: z.string().default('your-telegram-bot-token'),

    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    EMAIL_FROM: z.string().default('noreply@makon.uz'),
    NOTIFICATION_EMAIL: z.string().default(''),
  })

  const parsed = configSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid configuration:', parsed.error.flatten().fieldErrors)
    process.exit(1)
  }

  return parsed.data
}

const env = createConfig()

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProduction: env.NODE_ENV === 'production',

  mongodb: {
    uri: env.MONGODB_URI,
    useMongo: env.USE_MONGO === 'true',
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  redis: {
    url: env.REDIS_URL,
    enabled: env.REDIS_ENABLED === 'true',
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },

  sentry: {
    dsn: env.SENTRY_DSN,
    enabled: env.SENTRY_ENABLED === 'true',
  },

  log: {
    level: env.LOG_LEVEL,
  },

  telegramBotToken: env.TELEGRAM_BOT_TOKEN,

  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.EMAIL_FROM,
    notificationEmail: env.NOTIFICATION_EMAIL,
  },
} as const

export type Config = typeof config
