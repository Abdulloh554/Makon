const { z } = require('zod');

const sendSchema = z.object({
  body: z.object({
    toUserId: z.string().min(1, 'Qabul qiluvchi ID majburiy'),
    text: z.string().min(1, 'Xabar matni majburiy').max(1000, 'Xabar 1000 belgidan oshmasligi kerak').trim(),
    propertyId: z.string().optional().default('general'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const listQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    userId: z.string().min(1, 'userId parametri majburiy'),
  }),
  params: z.object({}).optional(),
});

module.exports = { sendSchema, listQuerySchema };
