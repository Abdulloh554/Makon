import type { Request, Response, NextFunction } from 'express'
import Stripe from 'stripe'
import * as paymentService from './payment.service'
import { sendSuccess, sendError } from '../../utils/response'
import { config } from '../../config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripe: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStripe(): any {
  if (!stripe) {
    if (!config.stripe.secretKey) {
      throw new Error('Stripe secret key not configured')
    }
    stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2026-05-27.dahlia' })
  }
  return stripe
}

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
    const sig = req.headers['stripe-signature'] as string
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' })
      return
    }

    if (!config.stripe.webhookSecret) {
      res.status(500).json({ error: 'Stripe webhook secret not configured' })
      return
    }

    const event = getStripe().webhooks.constructEvent(
      req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body)),
      sig,
      config.stripe.webhookSecret,
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { id: string }
      const transactionId = session.id
      await paymentService.confirmPayment(transactionId)
    }
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
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
