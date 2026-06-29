/**
 * @file env.ts
 * @layer Config
 * @responsibility Zod-validated environment variables — crashes on startup if invalid
 */

import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    PORT: z.coerce.number().int().positive().max(65535).default(4000),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_URI_TEST: z.string().optional(),

    REDIS_ENABLED: z.string().default('false'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGIN: z
      .string()
      .refine((val) => val !== '*', { message: 'CORS_ORIGIN cannot be wildcard in production' })
      .default('http://localhost:3000'),

    CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    EMAIL_FROM: z.string().email().default('noreply@makon.uz'),

    RESEND_API_KEY: z.string().default(''),

    MAILERSEND_API_KEY: z.string().default(''),
    MAILERSEND_FROM: z.string().default('abdullokg14@gmail.com'),
    MAILERSEND_FROM_NAME: z.string().default('Makon'),

    SENTRY_DSN: z.string().default(''),
    SENTRY_ENABLED: z.string().default('false'),

    TELEGRAM_BOT_TOKEN: z.string().default(''),
    GOOGLE_CLIENT_ID: z.string().default(''),

    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),

    AWS_ACCESS_KEY_ID: z.string().default(''),
    AWS_SECRET_ACCESS_KEY: z.string().default(''),
    AWS_S3_BUCKET: z.string().default(''),
    AWS_REGION: z.string().default('eu-central-1'),

    FIREBASE_PROJECT_ID: z.string().default(''),
    FIREBASE_CLIENT_EMAIL: z.string().default(''),
    FIREBASE_PRIVATE_KEY: z.string().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.SMTP_USER || !data.SMTP_PASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SMTP credentials are required in production',
          path: ['SMTP_USER'],
        })
      }
    }
  })

function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  return result.data
}

const env = validateEnv()

export const config = {
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  isProduction: env.NODE_ENV === 'production',

  port: env.PORT,

  mongodb: {
    uri: env.MONGODB_URI,
    testUri: env.MONGODB_URI_TEST,
  },

  redis: {
    enabled: env.REDIS_ENABLED === 'true',
    url: env.REDIS_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: env.CORS_ORIGIN,
  },

  csrf: {
    secret: env.CSRF_SECRET,
  },

  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    from: env.EMAIL_FROM,
    resendApiKey: env.RESEND_API_KEY,
    mailersendApiKey: env.MAILERSEND_API_KEY,
    mailersendFrom: env.MAILERSEND_FROM,
    mailersendFromName: env.MAILERSEND_FROM_NAME,
  },

  sentry: {
    dsn: env.SENTRY_DSN,
    enabled: env.SENTRY_ENABLED === 'true',
  },

  telegramBotToken: env.TELEGRAM_BOT_TOKEN,
  googleClientId: env.GOOGLE_CLIENT_ID,

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  },

  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: env.AWS_S3_BUCKET,
    region: env.AWS_REGION,
  },

  firebase: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY,
  },
} as const

export type Config = typeof config
