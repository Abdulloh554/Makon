import { reviewModel } from './review.model'
import { sellerModel } from '../seller/seller.model'
import { cache } from '../../utils/cache'
import { NotFoundError } from '../../errors/AppError'

const CACHE_TTL = {
  REVIEWS_LIST: 60,
  REVIEWS_BY_SELLER: 120,
} as const

async function toJSON(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc
}

export async function list() {
  return cache.wrap('reviews:list', async () => {
    const reviews = await reviewModel.find().sort({ createdAt: -1 })
    return Promise.all(reviews.map(toJSON))
  }, CACHE_TTL.REVIEWS_LIST)
}

export async function getBySeller(sellerId: string) {
  return cache.wrap(`reviews:seller:${sellerId}`, async () => {
    const reviews = await reviewModel.find({ sellerId }).sort({ createdAt: -1 })
    return Promise.all(reviews.map(toJSON))
  }, CACHE_TTL.REVIEWS_BY_SELLER)
}

export async function create(data: {
  sellerId: string
  userId: string
  userName: string
  rating: number
  text: string
}) {
  const seller = await sellerModel.findById(data.sellerId)
  if (!seller) throw new NotFoundError('Seller not found')

  const review = await reviewModel.create(data)
  const created = await toJSON(review)

  // Update seller rating using aggregation
  const [stats] = await (reviewModel as any).aggregate([
    { $match: { sellerId: data.sellerId } },
    { $group: { _id: null, avgRating: { $avg: '$rating' } } },
  ])
  const avgRating = stats ? Math.round(stats.avgRating * 10) / 10 : data.rating

  await sellerModel.findByIdAndUpdate(data.sellerId, {
    $set: { rating: avgRating },
  })

  // Clear seller cache
  await cache.del(`seller:${data.sellerId}`)

  return created
}
