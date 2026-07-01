/**
 * @file email.worker.ts
 * @layer Worker
 * @responsibility BullMQ worker for email sending — transactional emails, notifications
 */

import { Worker } from 'bullmq'
import type { EmailJob } from '../queues/email.queue'
import { parseRedisUrl } from '../database/redis'
import { config } from '../config'

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!config.email.smtp.user) {
    console.warn(`[DEV EMAIL] To: ${to}, Subject: ${subject}`)
    return
  }

  // Dynamic import to avoid heavy module loading at startup
  const nodemailer = await import('nodemailer')

  const transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.port === 465,
    auth: {
      user: config.email.smtp.user,
      pass: config.email.smtp.pass,
    },
  })

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    html,
  })
}

async function processEmailJob(job: EmailJob): Promise<void> {
  switch (job.type) {
    case 'welcome_email': {
      await sendEmail(
        job.email,
        'Welcome to Maskan!',
        `<h1>Welcome, ${job.name}!</h1><p>Thank you for registering on Maskan.</p>`,
      )
      break
    }

    case 'password_reset': {
      const resetUrl = `${config.cors.origin}/reset?token=${job.token}`
      await sendEmail(
        job.email,
        'Password Reset - Maskan',
        `<h1>Password Reset</h1><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
      )
      break
    }

    case 'payment_receipt': {
      await sendEmail(
        job.email,
        'Payment Receipt - Maskan',
        `<h1>Payment Confirmed</h1><p>Amount: ${job.amount} UZS</p><p>Property: ${job.propertyTitle}</p>`,
      )
      break
    }

    case 'message_notification': {
      await sendEmail(
        job.email,
        'New Message - Maskan',
        `<h1>New Message from ${job.fromUserName}</h1><p>${job.messagePreview}</p>`,
      )
      break
    }
  }
}

export function createEmailWorker(): Worker<EmailJob> {
  const connection = parseRedisUrl(config.redis.url)

  const worker = new Worker<EmailJob>(
    'email-queue',
    async (job) => {
      console.log(`Processing email job: ${job.data.type} [${job.id}]`)
      await processEmailJob(job.data)
      console.log(`Email job completed: ${job.data.type} [${job.id}]`)
    },
    {
      connection,
      concurrency: 5,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`Email job failed [${job?.id}]:`, err.message)
  })

  return worker
}
