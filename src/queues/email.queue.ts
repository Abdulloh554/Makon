/**
 * @file email.queue.ts
 * @layer Queue
 * @responsibility BullMQ email queue — welcome emails, password resets, payment receipts, notifications
 */

import { Queue } from 'bullmq'
import { config } from '../config'
import { parseRedisUrl } from '../database/redis'

export interface WelcomeEmailJob {
  type: 'welcome_email'
  userId: string
  email: string
  name: string
}

export interface PasswordResetJob {
  type: 'password_reset'
  email: string
  token: string
}

export interface PaymentReceiptJob {
  type: 'payment_receipt'
  userId: string
  email: string
  paymentId: string
  amount: number
  propertyTitle: string
}

export interface MessageNotificationJob {
  type: 'message_notification'
  userId: string
  email: string
  fromUserName: string
  messagePreview: string
}

export type EmailJob = WelcomeEmailJob | PasswordResetJob | PaymentReceiptJob | MessageNotificationJob

let emailQueue: Queue<EmailJob> | null = null

export function getEmailQueue(): Queue<EmailJob> {
  if (emailQueue) {
    return emailQueue
  }

  const connection = parseRedisUrl(config.redis.url)

  emailQueue = new Queue<EmailJob>('email-queue', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  })

  return emailQueue
}

export async function addEmailJob(job: EmailJob): Promise<void> {
  const queue = getEmailQueue()
  const priority = job.type === 'payment_receipt' || job.type === 'message_notification' ? 1 : 3
  await queue.add(job.type, job, { priority })
}

export async function closeEmailQueue(): Promise<void> {
  if (emailQueue) {
    await emailQueue.close()
    emailQueue = null
  }
}
