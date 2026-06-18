import nodemailer from 'nodemailer'
import { config } from '../config'

let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter

  const { host, port, user, pass } = config.email.smtp

  if (!user || !pass) {
    console.log('[EMAIL] SMTP credentials not configured — email sending disabled')
    return null
  }

  console.log('[EMAIL] Creating transporter:', { host, port, user })

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  transporter.verify().then(() => {
    console.log('[EMAIL] Transporter verified — ready to send')
  }).catch((err) => {
    console.error('[EMAIL] Transporter verification FAILED:', err)
    transporter = null
  })

  return transporter
}

export async function sendNotificationEmail(params: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<boolean> {
  console.log('[EMAIL] sendNotificationEmail called:', { to: params.to, subject: params.subject })

  const tr = getTransporter()

  if (!tr) {
    console.log('[EMAIL] No transporter available — email NOT sent')
    console.log('[EMAIL] Would have sent:', { to: params.to, subject: params.subject, text: params.text })
    return false
  }

  try {
    console.log('[EMAIL] Sending mail...')

    const info = await tr.sendMail({
      from: `"Makon" <${config.email.from}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, '<br>'),
    })

    console.log('[EMAIL] Mail sent successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    })

    return true
  } catch (err) {
    console.error('[EMAIL] Failed to send email:', err)
    return false
  }
}
