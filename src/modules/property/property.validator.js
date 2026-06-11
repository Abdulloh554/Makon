const { z } = require('zod');
const { PROPERTY_TYPES, DEAL_TYPES, PROPERTY_STATUSES } = require('../../constants');

const createSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Nomi 3 belgidan kam bo\'lmasligi kerak').max(200, 'Nomi 200 belgidan oshmasligi kerak').trim(),
    description: z.string().max(2000).optional().default(''),
    price: z.number().positive('Narx musbat son bo\'lishi kerak'),
    type: z.enum(PROPERTY_TYPES, { message: 'Noto\'g\'ri tur' }),
    dealType: z.enum(DEAL_TYPES, { message: 'Noto\'g\'ri bitim turi' }),
    status: z.enum(PROPERTY_STATUSES).optional(),
    rooms: z.number().int().min(0).optional().default(0),
    area: z.number().positive('Maydon musbat son bo\'lishi kerak'),
    floor: z.number().int().optional(),
    totalFloors: z.number().int().optional(),
    images: z.array(z.string()).optional().default([]),
    location: z.object({
      lat: z.number().optional().default(0),
      lng: z.number().optional().default(0),
      address: z.string().optional().default(''),
      district: z.string().optional(),
      city: z.string().optional().default('Tashkent'),
    }).optional().default({}),
    installmentMonths: z.number().int().positive().optional(),
    installmentPrice: z.number().positive().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const listQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    dealType: z.enum(DEAL_TYPES).optional(),
    propertyType: z.enum(PROPERTY_TYPES).optional(),
    status: z.enum(PROPERTY_STATUSES).optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),
  params: z.object({}).optional(),
});

const updateSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(200).trim().optional(),
    description: z.string().max(2000).optional(),
    price: z.number().positive().optional(),
    type: z.enum(PROPERTY_TYPES).optional(),
    dealType: z.enum(DEAL_TYPES).optional(),
    status: z.enum(PROPERTY_STATUSES).optional(),
    rooms: z.number().int().min(0).optional(),
    area: z.number().positive().optional(),
    floor: z.number().int().optional(),
    totalFloors: z.number().int().optional(),
    images: z.array(z.string()).optional(),
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
    }).optional(),
    installmentMonths: z.number().int().positive().optional(),
    installmentPrice: z.number().positive().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
