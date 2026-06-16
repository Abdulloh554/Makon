import type { Request, Response, NextFunction } from 'express'
import * as paymentService from './payment.service'
import { sendSuccess, sendError } from '../../lib/response'

function getUserId(req: Request): string {
  return (req as unknown as { userId: string }).userId
}

export async function listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = await paymentService.getPlans()
    sendSuccess(res, plans)
  } catch (err) {
    next(err)
  }
}

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId, method } = req.body
    if (!['payme', 'click', 'stripe'].includes(method)) {
      sendError(res, 400, 'INVALID_METHOD', 'To\'lov usuli noto\'g\'ri. payme, click yoki stripeni tanlang.')
      return
    }
    const result = await paymentService.createPayment({
      userId: getUserId(req),
      planId,
      method,
    })
    sendSuccess(res, result, 201)
  } catch (err) {
    next(err)
  }
}

export async function handlePaymeWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { transactionId } = req.body
    const result = await paymentService.confirmPayment(transactionId)
    res.json(result)
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
}

export async function handleClickWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const { transaction_id: transactionId } = req.body
    const result = await paymentService.confirmPayment(transactionId)
    res.json({ ...result, click_trans_id: req.body.click_trans_id })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
}

export async function handleStripeWebhook(req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const event = req.body
    if (event.type === 'checkout.session.completed') {
      const transactionId = event.data.object.id
      await paymentService.confirmPayment(transactionId)
    }
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
}

export async function boostProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const propertyId = String(req.params.propertyId)
    const result = await paymentService.boostProperty(propertyId, getUserId(req))
    sendSuccess(res, result)
  } catch (err) {
    next(err)
  }
}
