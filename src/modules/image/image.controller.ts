import type { Request, Response, NextFunction } from 'express'
import * as imageService from './image.service'
import { sendSuccess, sendError } from '../../utils/response'
import { propertyModel } from '../property/property.model'
import { sellerModel } from '../seller/seller.model'

export async function upload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { image } = req.body
    if (!image || typeof image !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'image (base64 data URI) talab qilinadi.')
      return
    }
    const url = await imageService.saveImage(image)
    if (url === image) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Yaroqsiz rasm formati. Faqat JPEG, PNG, WebP, GIF qabul qilinadi.')
      return
    }
    sendSuccess(res, { url }, 201)
  } catch (err) {
    next(err)
  }
}

export async function getInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hash = String(req.params.hash)
    const info = await imageService.getImageInfo(hash)
    if (!info) {
      sendError(res, 404, 'NOT_FOUND', 'Rasm topilmadi.')
      return
    }
    sendSuccess(res, info)
  } catch (err) {
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hash = String(req.params.hash)
    const userId = (req as unknown as { userId: string }).userId

    const property = await (propertyModel as any).findOne({
      images: { $regex: hash },
    })

    if (property) {
      const seller = await sellerModel.findOne({ userId })
      const sellerId = String(seller?._id ?? seller?.id ?? '')
      const propertySellerId = String(property.sellerId ?? '')
      if (!seller || propertySellerId !== sellerId) {
        sendError(res, 403, 'FORBIDDEN', 'Siz faqat o\'z elonlaringizdagi rasmlarni o\'chirishingiz mumkin.')
        return
      }
    }

    const deleted = await imageService.deleteImage(hash)
    if (!deleted) {
      sendError(res, 404, 'NOT_FOUND', 'Rasm topilmadi.')
      return
    }
    sendSuccess(res, { message: 'Rasm o\'chirildi.' })
  } catch (err) {
    next(err)
  }
}
