import nodemailer from 'nodemailer'
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend'
import { config } from '../config'

let transporter: nodemailer.Transporter | null = null
let mailerSend: MailerSend | null = null
let etherealTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const { user, pass, host, port } = config.email.smtp

  if (!user || !pass) return null

  transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port || 587,
    secure: false,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false,
    },
  })

  return transporter
}

function getMailerSend(): MailerSend | null {
  if (mailerSend) return mailerSend
  if (!config.email.mailersendApiKey) return null

  mailerSend = new MailerSend({ apiKey: config.email.mailersendApiKey })
  return mailerSend
}

async function getEtherealTransporter(): Promise<nodemailer.Transporter | null> {
  if (etherealTransporter) return etherealTransporter

  if (!config.isDev) return null

  try {
    const account = await nodemailer.createTestAccount()
    etherealTransporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    })
    console.log('[EMAIL] Ethereal test account:', account.user)
    return etherealTransporter
  } catch {
    return null
  }
}

function getEtherealUrl(messageId: string): string {
  return `https://ethereal.email/message/${messageId}`
}

export async function sendNotificationEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<boolean> {
  // 1. Gmail SMTP (real delivery) — primary
  const tr = getTransporter()

  if (tr) {
    try {
      await tr.sendMail({
        from: config.email.smtp.user,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html || params.text.replace(/\n/g, '<br>'),
      })

      console.log(`[EMAIL] Yuborildi (Gmail SMTP): ${params.to} | ${params.subject}`)
      return true
    } catch (err) {
      console.error('[EMAIL] Gmail SMTP ishlamadi:', err)
    }
  }

  // 2. MailerSend (API) — fallback
  const ms = getMailerSend()

  if (ms) {
    try {
      const sentFrom = new Sender(config.email.mailersendFrom, config.email.mailersendFromName)
      const recipients = [new Recipient(params.to)]

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(params.subject)
        .setText(params.text)

      if (params.html) {
        emailParams.setHtml(params.html)
      }

      await ms.email.send(emailParams)

      console.log(`[EMAIL] Yuborildi (MailerSend): ${params.to} | ${params.subject}`)
      return true
    } catch (err: any) {
      console.error('[EMAIL] MailerSend error:', err.response?.data || err.message || err)
    }
  }

  // 3. Ethereal (fake/dev only) — oxirgi chora
  const ethereal = await getEtherealTransporter()

  if (ethereal) {
    try {
      const info = await ethereal.sendMail({
        from: config.email.smtp.user || config.email.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
        html: params.html,
      })

      if (info.messageId) {
        const previewUrl = getEtherealUrl(info.messageId)
        console.log('[EMAIL] Ethereal preview:', previewUrl)
        console.warn('⚠️  BU EMAIL REAL EMAS! Faqat Ethereal orqali ko\'rish mumkin:', previewUrl)
      }

      return true
    } catch {
      // ethereal muhim emas
    }
  }

  const errorMsg = 'Email yuborib bo\'lmadi — barcha provayderlar ishlamadi'
  console.error(`[EMAIL] ${errorMsg}`, { to: params.to, subject: params.subject })
  throw new Error(errorMsg)
}
