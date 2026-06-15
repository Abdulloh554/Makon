import { sellerModel } from './seller.model'
import { propertyModel } from '../property/property.model'
import { cache } from '../../lib/cache'
import { NotFoundError } from '../../lib/errors'

const CACHE_TTL = {
  SELLERS_LIST: 60,
  SELLER_DETAIL: 120,
} as const

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function list() {
  return cache.wrap('sellers:list', async () => {
    const sellers = await sellerModel.find().sort({ joinedAt: -1 })
    return Promise.all(sellers.map(toJSON))
  }, CACHE_TTL.SELLERS_LIST)
}

export async function getById(id: string) {
  return cache.wrap(`seller:${id}`, async () => {
    const seller = await sellerModel.findById(id)
    if (!seller) throw new NotFoundError('Seller not found')
    return toJSON(seller)
  }, CACHE_TTL.SELLER_DETAIL)
}

export async function getProperties(sellerId: string) {
  const properties = await propertyModel.find({ sellerId }).sort({ createdAt: -1 })
  return Promise.all(properties.map(toJSON))
}
