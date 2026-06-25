import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validate } from '../../middleware/validate.middleware'
import { z } from 'zod'
import { PROPERTY_TYPES, DEAL_TYPES, PROPERTY_STATUSES } from '../../constants'
import * as ctrl from './property.controller'

const propertyCreateBody = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional().default(''),
  price: z.number().positive('Narx musbat son bo\'lishi kerak'),
  type: z.enum(PROPERTY_TYPES),
  dealType: z.enum(DEAL_TYPES),
  status: z.enum(PROPERTY_STATUSES).optional(),
  rooms: z.number().int().min(0).optional().default(0),
  area: z.number().positive('Maydon musbat son bo\'lishi kerak'),
  floor: z.number().int().optional(),
  totalFloors: z.number().int().optional(),
  images: z.array(z.string().max(5000000)).optional().default([]),
  location: z.object({
    lat: z.number().optional().default(0),
    lng: z.number().optional().default(0),
    address: z.string().optional().default(''),
    district: z.string().optional(),
    city: z.string().optional().default('Tashkent'),
  }).optional().default({}),
  installmentMonths: z.number().int().positive().optional(),
  installmentPrice: z.number().positive().optional(),
})

const propertyUpdateBody = z.object({
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
})

const propertyListQuery = z.object({
  search: z.string().max(200).optional(),
  dealType: z.enum(DEAL_TYPES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  status: z.enum(PROPERTY_STATUSES).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

const router = Router()

router.get('/', validate({ query: propertyListQuery }), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authenticate, validate({ body: propertyCreateBody }), ctrl.create)
router.patch('/:id', authenticate, validate({ body: propertyUpdateBody }), ctrl.update)
router.delete('/:id', authenticate, ctrl.deleteProperty)

export default router