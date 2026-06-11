const { z } = require('zod');
const { isValidUzbekPhone } = require('./phone.utils');

const loginSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Telefon raqami majburiy').refine(isValidUzbekPhone, "Noto'g'ri O'zbekiston telefon raqami"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Ism 2 belgidan kam bo\'lmasligi kerak').max(50, 'Ism 50 belgidan oshmasligi kerak').trim(),
    phone: z.string().min(1, 'Telefon raqami majburiy').refine(isValidUzbekPhone, "Noto'g'ri O'zbekiston telefon raqami"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = { loginSchema, registerSchema };
