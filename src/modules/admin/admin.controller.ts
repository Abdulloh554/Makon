import type { Request, Response, NextFunction } from 'express'
import * as adminService from './admin.service'
import { sendSuccess, sendError } from '../../utils/response'
import { generateToken } from '../../middleware/auth'

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body as { username: string; password: string }
    if (!username || !password) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Username va parol talab qilinadi')
      return
    }
    const user = await adminService.login(username, password)
    const token = generateToken(user)
    sendSuccess(res, { token, user })
  } catch (err) {
    next(err)
  }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getStats()
    sendSuccess(res, data)
  } catch (err) {
    next(err)
  }
}

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const result = await adminService.listUsers(page, limit)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await adminService.getUser(req.params.id as string)
    sendSuccess(res, user)
  } catch (err) {
    next(err)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteUser(req.params.id as string)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function listProperties(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const filters: Record<string, unknown> = {}
    if (req.query.search) filters.search = req.query.search
    if (req.query.dealType) filters.dealType = req.query.dealType
    if (req.query.type) filters.type = req.query.type
    if (req.query.status) filters.status = req.query.status
    const result = await adminService.listProperties(page, limit, filters)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function deleteProperty(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteProperty(req.params.id as string)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function listSellers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const result = await adminService.listSellers(page, limit)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function deleteSeller(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.deleteSeller(req.params.id as string)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function listMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const result = await adminService.listMessages(page, limit)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function migrateImages(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await adminService.migratePropertyImages()
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}

export async function listReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
    const result = await adminService.listReviews(page, limit)
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
