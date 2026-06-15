import { propertyModel } from './property.model'
import { sellerModel } from '../seller/seller.model'
import { cache } from '../../lib/cache'
import { NotFoundError, ForbiddenError } from '../../lib/errors'

const CACHE_TTL = {
  PROPERTIES_LIST: 60,
  PROPERTY_DETAIL: 120,
} as const

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function list(filters: Record<string, unknown>) {
  const cacheKey = `properties:${JSON.stringify(filters)}`
  return cache.wrap(cacheKey, async () => {
    const filter: Record<string, unknown> = {}
    if (filters.dealType) filter.dealType = filters.dealType
    if (filters.propertyType) filter.type = filters.propertyType
    if (filters.status) filter.status = filters.status
    if (filters.minPrice || filters.maxPrice) {
      filter.price = {}
      if (filters.minPrice) (filter.price as Record<string, unknown>).$gte = filters.minPrice
      if (filters.maxPrice) (filter.price as Record<string, unknown>).$lte = filters.maxPrice
    }
    if (filters.search) {
      const escaped = String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ]
    }

    const page = Number(filters.page) || 1
    const limit = Number(filters.limit) || 20
    const skip = (page - 1) * limit

    const [properties, total] = await Promise.all([
      propertyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      propertyModel.countDocuments(filter),
    ])

    return {
      data: await Promise.all(properties.map(toJSON)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }, CACHE_TTL.PROPERTIES_LIST)
}

export async function getById(id: string) {
  return cache.wrap(`property:${id}`, async () => {
    const property = await propertyModel.findById(id)
    if (!property) throw new NotFoundError('Property not found')
    return toJSON(property)
  }, CACHE_TTL.PROPERTY_DETAIL)
}

export async function create(data: Record<string, unknown>, userId: string) {
  const seller = await sellerModel.findOne({ userId })
  if (!seller) {
    throw new ForbiddenError('Siz sotuvchi emassiz. Avval sotuvchi sifatida ro\'yxatdan o\'ting.')
  }

  const sellerId = String(seller._id ?? seller.id ?? '')
  const property = await propertyModel.create({ ...data, sellerId })

  await sellerModel.findByIdAndUpdate(sellerId, { $inc: { totalListings: 1 } })
  await cache.delPattern('properties:*')

  return toJSON(property)
}

export async function update(id: string, data: Record<string, unknown>, userId: string) {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Property not found')

  const seller = await sellerModel.findOne({ userId })
  const propertySellerId = String(property.sellerId ?? '')
  const sellerId = String(seller?._id ?? seller?.id ?? '')
  if (!seller || (propertySellerId !== sellerId)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni tahrirlashingiz mumkin.')
  }

  Object.assign(property, data)
  await property.save()

  await cache.delPattern('properties:*')
  await cache.del(`property:${id}`)

  return toJSON(property)
}

export async function deleteProperty(id: string, userId: string) {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Property not found')

  const seller = await sellerModel.findOne({ userId })
  const propertySellerId = String(property.sellerId ?? '')
  const sellerId = String(seller?._id ?? seller?.id ?? '')
  if (!seller || (propertySellerId !== sellerId)) {
    throw new ForbiddenError('Siz faqat o\'z elonlaringizni o\'chirishingiz mumkin.')
  }

  await propertyModel.findByIdAndDelete(id)
  await sellerModel.findByIdAndUpdate(
    sellerId,
    { $inc: { totalListings: -1 } },
  )

  await cache.delPattern('properties:*')
  await cache.del(`property:${id}`)
  return { message: 'Elon o\'chirildi.' }
}
