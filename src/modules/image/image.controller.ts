import type { Request, Response, NextFunction } from 'express'
import * as imageService from './image.service'
import { sendSuccess, sendError } from '../../utils/response'

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
