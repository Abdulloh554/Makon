import { z } from 'zod'

export const propertyQuerySchema = z.object({
  dealType: z.enum(['daily', 'sale', 'rent', 'installment']).optional(),
  propertyType: z.enum(['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land']).optional(),
  status: z.enum(['ready', 'half-ready', 'land', 'sold']).optional(),
  search: z.string().max(200).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sortBy: z.enum(['createdAt', 'price', 'area', 'rooms']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export const loginSchema = z.object({
  phone: z.string().min(4).max(20),
  password: z.string().min(4).max(128),
})

export const registerSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: z.string().min(4).max(20),
  password: z.string().min(6).max(128),
})

export const propertyCreateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().positive(),
  images: z.array(z.string().max(5000)).max(20).default([]),
  location: z.object({
    address: z.string().min(2).max(500),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  type: z.enum(['apartment', 'house', 'cottage', 'dacha', 'commercial', 'land']),
  dealType: z.enum(['daily', 'sale', 'rent', 'installment']),
  status: z.enum(['ready', 'half-ready', 'land']),
  rooms: z.number().int().positive().optional(),
  area: z.number().positive().optional(),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
  installmentMonths: z.number().int().positive().optional(),
  installmentPrice: z.number().positive().optional(),
})

export const propertyUpdateSchema = propertyCreateSchema.partial()

export const messageCreateSchema = z.object({
  toUserId: z.string().min(1),
  propertyId: z.string().min(1),
  text: z.string().min(1).max(2000),
})

export const reviewCreateSchema = z.object({
  sellerId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(2000),
})
