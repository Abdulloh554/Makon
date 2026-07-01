import { Router } from 'express'
import { propertyModel } from '../property/property.model'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const properties = await propertyModel.find({ featured: true, isActive: true }).sort({ createdAt: -1 }).limit(10)
    const data = await Promise.all(
      (properties as unknown as Record<string, unknown>[]).map(async (p) => {
        const json = typeof (p as any).toJSON === 'function' ? (p as any).toJSON() : p
        return json
      })
    )
    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

export default router
