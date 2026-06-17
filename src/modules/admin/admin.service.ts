import { userModel } from '../user/user.model'
import { sellerModel } from '../seller/seller.model'
import { propertyModel } from '../property/property.model'
import { messageModel } from '../message/message.model'
import { reviewModel } from '../review/review.model'
import { cache } from '../../lib/cache'
import { NotFoundError } from '../../lib/errors'
import bcrypt from 'bcryptjs'

export async function login(username: string, password: string) {
  const user = await userModel.findOne({ phone: username })
  if (!user) throw new NotFoundError('Admin topilmadi')

  const isMatch = await bcrypt.compare(password, user.password as string)
  if (!isMatch) throw new NotFoundError('Noto\'g\'ri parol')

  const role = user.role as string
  if (role !== 'admin') throw new NotFoundError('Admin huquqi yo\'q')

  const json = { ...(typeof user.toJSON === 'function' ? user.toJSON() : user) }
  delete json.password
  return json
}

export async function getStats() {
  const usersCount = await userModel.countDocuments()
  const sellersCount = await sellerModel.countDocuments()
  const propertiesCount = await propertyModel.countDocuments()
  const messagesCount = await messageModel.countDocuments()
  const reviewsCount = await reviewModel.countDocuments()

  const properties = await (propertyModel as any).find({}).sort({ createdAt: -1 }).limit(100).toArray()
  const activeListings = properties.filter((p: any) => p.status !== 'sold' && p.isActive !== false).length
  const totalViews = properties.reduce((sum: number, p: any) => sum + (Number(p.views) || 0), 0)

  return {
    users: usersCount,
    sellers: sellersCount,
    properties: propertiesCount,
    activeListings,
    messages: messagesCount,
    reviews: reviewsCount,
    totalViews,
  }
}

export async function listUsers(page: number, limit: number) {
  const skip = (page - 1) * limit
  const users = await (userModel as any).find({}).skip(skip).limit(limit).toArray()
  const total = await userModel.countDocuments()
  return { data: users.map((u: any) => { const j = { ...(typeof u.toJSON === 'function' ? u.toJSON() : u) }; delete j.password; return j }), total, page, totalPages: Math.ceil(total / limit) }
}

export async function getUser(id: string) {
  const user = await userModel.findById(id)
  if (!user) throw new NotFoundError('Foydalanuvchi topilmadi')
  const json = { ...(typeof user.toJSON === 'function' ? user.toJSON() : user) }
  delete json.password
  return json
}

export async function deleteUser(id: string) {
  const user = await userModel.findById(id)
  if (!user) throw new NotFoundError('Foydalanuvchi topilmadi')
  const seller = await sellerModel.findOne({ userId: id })

  await userModel.findByIdAndDelete(id)
  if (seller) {
    const sellerId = String((seller as any)._id ?? (seller as any).id ?? '')
    await propertyModel.deleteMany({ sellerId })
    await sellerModel.findByIdAndDelete(sellerId)
  }
  await messageModel.deleteMany({
    $or: [{ fromUserId: id }, { toUserId: id }],
  })
  await cache.delPattern('properties:*')
  return { message: 'Foydalanuvchi va barcha ma\'lumotlari o\'chirildi' }
}

export async function listProperties(page: number, limit: number, filters?: Record<string, unknown>) {
  const skip = (page - 1) * limit
  const filter: Record<string, unknown> = {}
  if (filters?.search) {
    const s = String(filters.search)
    filter.$or = [
      { title: { $regex: s, $options: 'i' } },
      { description: { $regex: s, $options: 'i' } },
    ]
  }
  if (filters?.dealType) filter.dealType = String(filters.dealType)
  if (filters?.type) filter.type = String(filters.type)
  if (filters?.status) filter.status = String(filters.status)

  const total = await propertyModel.countDocuments(filter)
  let query = (propertyModel as any).find(filter).sort({ createdAt: -1 }).skip(skip)
  if (limit > 0) query = query.limit(limit)
  const properties = await query.toArray()
  return { data: properties.map((p: any) => (typeof p.toJSON === 'function' ? p.toJSON() : p)), total, page, totalPages: Math.ceil(total / limit) }
}

export async function deleteProperty(id: string) {
  const property = await propertyModel.findById(id)
  if (!property) throw new NotFoundError('Elon topilmadi')
  await propertyModel.findByIdAndDelete(id)
  await cache.delPattern('properties:*')
  return { message: 'Elon o\'chirildi' }
}

export async function listSellers(page: number, limit: number) {
  const skip = (page - 1) * limit
  const sellers = await (sellerModel as any).find({}).skip(skip).limit(limit).toArray()
  const total = await sellerModel.countDocuments()
  return { data: sellers.map((s: any) => (typeof s.toJSON === 'function' ? s.toJSON() : s)), total, page, totalPages: Math.ceil(total / limit) }
}

export async function deleteSeller(id: string) {
  const seller = await sellerModel.findById(id)
  if (!seller) throw new NotFoundError('Sotuvchi topilmadi')
  const props = await propertyModel.find({ sellerId: id })
  for (const p of props) {
    const pid = String((p as any)._id ?? (p as any).id ?? '')
    await propertyModel.findByIdAndDelete(pid)
  }
  await sellerModel.findByIdAndDelete(id)
  await cache.delPattern('properties:*')
  return { message: 'Sotuvchi va uning elonlari o\'chirildi' }
}

export async function listMessages(page: number, limit: number) {
  const skip = (page - 1) * limit
  const messages = await (messageModel as any).find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
  const total = await messageModel.countDocuments()
  return { data: messages.map((m: any) => (typeof m.toJSON === 'function' ? m.toJSON() : m)), total, page, totalPages: Math.ceil(total / limit) }
}

export async function listReviews(page: number, limit: number) {
  const skip = (page - 1) * limit
  const reviews = await (reviewModel as any).find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()
  const total = await reviewModel.countDocuments()
  return { data: reviews.map((r: any) => (typeof r.toJSON === 'function' ? r.toJSON() : r)), total, page, totalPages: Math.ceil(total / limit) }
}
