import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

function createConfig() {
  const isProduction = process.env.NODE_ENV === 'production'

  const configSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/joybor'),
    USE_MONGO: z.string().default(isProduction ? 'true' : 'false'),
    JWT_SECRET: isProduction
      ? z.string().min(32, 'Production da JWT_SECRET kamida 32 belgidan iborat bo\'lishi kerak')
      : z.string().min(1).default('dev_jwt_secret_key_not_for_production'),
    JWT_EXPIRES_IN: z.string().default('24h'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_ENABLED: z.string().default('false'),
    CORS_ORIGIN: isProduction
      ? z.string().min(1, 'Production da CORS_ORIGIN aniq ko\'rsatilishi kerak').refine(v => v !== '*', { message: 'Production da CORS_ORIGIN * bo\'lishi mumkin emas' })
      : z.string().default('http://localhost:3000'),
    RATE_LIMIT_MAX: z.coerce.number().default(isProduction ? 30 : 100),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  })

  const parsed = configSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('Invalid configuration:', parsed.error.flatten().fieldErrors) // eslint-disable-line no-console
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
} as const

export type Config = typeof config
