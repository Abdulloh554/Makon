import { z } from 'zod'

const phoneSchema = z.string()
  .min(1, 'Telefon raqami majburiy')
  .regex(/^\+998\d{9}$/, "Noto'g'ri O'zbekiston telefon raqami")

export const loginSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    password: z.string().min(1, 'Parol majburiy'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'Ism 2 belgidan kam bo\'lmasligi kerak').max(50).trim(),
    lastName: z.string().min(2, 'Familiya 2 belgidan kam bo\'lmasligi kerak').max(50).trim(),
    phone: phoneSchema,
    password: z.string().min(8, 'Parol kamida 8 belgidan iborat bo\'lishi kerak').max(100),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

export const forgotPasswordSchema = z.object({
  body: z.object({
    phone: phoneSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token majburiy'),
    password: z.string().min(8, 'Parol kamida 8 belgidan iborat bo\'lishi kerak').max(100),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
})
