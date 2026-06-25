/**
 * @file notification.worker.ts
 * @layer Worker
 * @responsibility BullMQ worker for push notifications and Telegram notifications
 */

import { Worker } from 'bullmq'
import type { NotificationJob } from '../queues/notification.queue'
import { parseRedisUrl } from '../database/redis'
import { config } from '../config'

async function processNotificationJob(job: NotificationJob): Promise<void> {
  switch (job.type) {
    case 'push_notification': {
      // Push notification implementation goes here
      // This would integrate with Firebase Cloud Messaging or similar
      console.log(`[PUSH] To: ${job.userId}, Title: ${job.title}`)
      break
    }

    case 'telegram_notify': {
      if (!config.telegramBotToken) {
        console.warn('[TELEGRAM] Bot token not configured')
        return
      }

      try {
        const { Telegraf } = await import('telegraf')
        const bot = new Telegraf(config.telegramBotToken)

      await bot.telegram.sendMessage(job.telegramId, job.message, {
        parse_mode: job.parseMode || 'HTML',
        link_preview_options: { is_disabled: true },
      })
      } catch (err) {
        console.error('[TELEGRAM] Send error:', err instanceof Error ? err.message : 'Unknown')
        throw err
      }
      break
    }
  }
}

export function createNotificationWorker(): Worker<NotificationJob> {
  const connection = parseRedisUrl(config.redis.url)

  const worker = new Worker<NotificationJob>(
    'notification-queue',
    async (job) => {
      console.log(`Processing notification job: ${job.data.type} [${job.id}]`)
      await processNotificationJob(job.data)
      console.log(`Notification job completed: ${job.data.type} [${job.id}]`)
    },
    {
      connection,
      concurrency: 10,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`Notification job failed [${job?.id}]:`, err.message)
  })

  return worker
}
