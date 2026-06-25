/**
 * @file notification.queue.ts
 * @layer Queue
 * @responsibility BullMQ notification queue — push notifications, Telegram notifications
 */

import { Queue } from 'bullmq'
import { config } from '../config'
import { parseRedisUrl } from '../database/redis'

export interface PushNotificationJob {
  type: 'push_notification'
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface TelegramNotifyJob {
  type: 'telegram_notify'
  telegramId: string
  message: string
  parseMode?: 'HTML' | 'Markdown'
}

export type NotificationJob = PushNotificationJob | TelegramNotifyJob

let notificationQueue: Queue<NotificationJob> | null = null

export function getNotificationQueue(): Queue<NotificationJob> {
  if (notificationQueue) {
    return notificationQueue
  }

  const connection = parseRedisUrl(config.redis.url)

  notificationQueue = new Queue<NotificationJob>('notification-queue', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  })

  return notificationQueue
}

export async function addNotificationJob(job: NotificationJob): Promise<void> {
  const queue = getNotificationQueue()
  await queue.add(job.type, job, { priority: 1 })
}

export async function closeNotificationQueue(): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.close()
    notificationQueue = null
  }
}
