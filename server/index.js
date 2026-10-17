import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const port = Number(process.env.PORT || 4001)
const adminEmail = (process.env.ADMIN_EMAIL || 'shreyaparmar623@gmail.com').trim()
const whatsappNumber = (process.env.WHATSAPP_NUMBER || '918401423844').replace(/\D/g, '')
const metaWhatsAppAccessToken = (process.env.META_WHATSAPP_ACCESS_TOKEN || '').trim()
const metaWhatsAppPhoneNumberId = (process.env.META_WHATSAPP_PHONE_NUMBER_ID || '').trim()
const metaWhatsAppTemplateName = (process.env.META_WHATSAPP_TEMPLATE_NAME || '').trim()
const metaWhatsAppTemplateLanguage = (process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || 'en_US').trim()
const metaGraphApiVersion = (process.env.META_GRAPH_API_VERSION || 'v23.0').trim()
const smtpUser = (process.env.SMTP_USER || '').trim()
const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '')

const smtpConfig = {
  host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true' || Number(process.env.SMTP_PORT || 587) === 465,
  auth: smtpUser && smtpPass
    ? { user: smtpUser, pass: smtpPass }
    : undefined,
}

const transporter = smtpConfig.auth ? nodemailer.createTransport(smtpConfig) : null

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

async function sendAppointmentEmail(appointment) {
  if (!transporter) {
    console.warn('SMTP not configured. No appointment email was sent.')
    return { sent: false }
  }

  const subject = `New consultation request from ${appointment.patientName}`
  const text = [
    'New consultation request',
    '',
    `Name: ${appointment.patientName}`,
    `Phone: ${appointment.phone}`,
    `Email: ${appointment.email || 'Not provided'}`,
    `Service: ${appointment.serviceType}`,
    `Preferred date: ${appointment.preferredDate}`,
    `Preferred time: ${appointment.preferredTime}`,
    `Address: ${appointment.address || 'Not provided'}`,
    `Concern: ${appointment.concern || 'Not provided'}`,
    '',
    'This enquiry came from the ReBounce physiotherapy website.',
  ].join('\n')

  const html = `
    <h2>New consultation request</h2>
    <p><strong>Name:</strong> ${escapeHtml(appointment.patientName)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(appointment.phone)}</p>
    <p><strong>Email:</strong> ${escapeHtml(appointment.email || 'Not provided')}</p>
    <p><strong>Service:</strong> ${escapeHtml(appointment.serviceType)}</p>
    <p><strong>Preferred date:</strong> ${escapeHtml(appointment.preferredDate)}</p>
    <p><strong>Preferred time:</strong> ${escapeHtml(appointment.preferredTime)}</p>
    <p><strong>Address:</strong> ${escapeHtml(appointment.address || 'Not provided')}</p>
    <p><strong>Concern:</strong> ${escapeHtml(appointment.concern || 'Not provided')}</p>
  `

  await transporter.sendMail({
    from: `"ReBounce Consultation" <${smtpUser || adminEmail}>`,
    to: adminEmail,
    replyTo: appointment.email || appointment.phone,
    subject,
    text,
    html,
  })

  return { sent: true }
}

async function sendPatientConfirmationEmail(appointment) {
  if (!transporter || !appointment.email) {
    return { sent: false }
  }

  const subject = 'We have received your consultation request'
  const text = [
    'Thank you for contacting ReBounce Physiotherapy.',
    '',
    'We have received your consultation request and our team is reviewing it.',
    'Dr. Shreya Parmar will review your enquiry and call you back shortly to discuss the next steps.',
    '',
    `Patient name: ${appointment.patientName}`,
    `Service requested: ${appointment.serviceType}`,
    `Preferred date: ${appointment.preferredDate}`,
    `Preferred time: ${appointment.preferredTime}`,
    '',
    'Warm regards,',
    'ReBounce Physiotherapy Team',
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1b1b1b; max-width: 640px; margin: 0 auto;">
      <div style="padding: 24px 28px; background: #f7f2ea; border: 1px solid #eadbc7; border-radius: 14px;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 1.5px; color: #7d6956; text-transform: uppercase;">ReBounce Physiotherapy</p>
        <h2 style="margin: 0 0 16px; color: #1a1a1a;">Thank you for contacting us</h2>
         <p style="margin: 0 0 12px;">Dear ${escapeHtml(appointment.patientName)},</p>
        <p style="margin: 0 0 12px;">We have received your consultation request and our team is reviewing it.</p>
        <p style="margin: 0 0 12px;">Dr. Shreya Parmar will review your enquiry and call you back shortly to discuss the next steps and guide you toward the right care plan.</p>
        <div style="background: #ffffff; border: 1px solid #e9dfd4; border-radius: 10px; padding: 16px; margin: 18px 0;">
           <p style="margin: 0 0 8px;"><strong>Preferred service:</strong> ${escapeHtml(appointment.serviceType)}</p>
           <p style="margin: 0 0 8px;"><strong>Preferred date:</strong> ${escapeHtml(appointment.preferredDate)}</p>
           <p style="margin: 0 0 8px;"><strong>Preferred time:</strong> ${escapeHtml(appointment.preferredTime)}</p>
        </div>
        <p style="margin: 0;">Warm regards,<br />The ReBounce Physiotherapy Team</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"ReBounce Physiotherapy" <${smtpUser || adminEmail}>`,
    to: appointment.email,
    replyTo: adminEmail,
    subject,
    text,
    html,
  })

  return { sent: true }
}

function buildWhatsAppUrl(appointment) {
  const message = [
    'Hello ReBounce Physiotherapy,',
    '',
    `I am ${appointment.patientName}.`,
    `My phone number is ${appointment.phone}.`,
    `My email is ${appointment.email}.`,
    `I want ${appointment.serviceType}.`,
    `Preferred date: ${appointment.preferredDate}.`,
    `Preferred time: ${appointment.preferredTime}.`,
    appointment.address ? `Address: ${appointment.address}.` : '',
    appointment.concern ? `Concern: ${appointment.concern}.` : '',
    '',
    'Please review my enquiry and call me back shortly.',
  ].filter(Boolean).join('\n')

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
}

async function sendAppointmentWhatsApp(appointment) {
  if (!metaWhatsAppAccessToken || !metaWhatsAppPhoneNumberId || !metaWhatsAppTemplateName || !whatsappNumber) {
    return { sent: false }
  }

  const parameters = [
    appointment.patientName,
    appointment.phone,
    appointment.email,
    appointment.serviceType,
    appointment.preferredDate,
    appointment.preferredTime,
    appointment.address || 'Not provided',
    appointment.concern || 'Not provided',
  ].map((text) => ({ type: 'text', text: String(text) }))

  try {
    const response = await fetch(`https://graph.facebook.com/${metaGraphApiVersion}/${metaWhatsAppPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${metaWhatsAppAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: whatsappNumber,
        type: 'template',
        template: {
          name: metaWhatsAppTemplateName,
          language: { code: metaWhatsAppTemplateLanguage },
          components: [{ type: 'body', parameters }],
        },
      }),
    })

    if (!response.ok) {
      console.error('Meta WhatsApp notification failed:', response.status, await response.text())
      return { sent: false }
    }

    return { sent: true }
  } catch (error) {
    console.error('Meta WhatsApp notification failed:', error)
    return { sent: false }
  }
}

export function createApp({
  deliverAppointmentEmail = sendAppointmentEmail,
  deliverPatientConfirmation = sendPatientConfirmationEmail,
  deliverWhatsApp = sendAppointmentWhatsApp,
  allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
} = {}) {
  const app = express()
  const enquiries = []
  const allowedOriginSet = new Set(allowedOrigins.filter(Boolean))

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOriginSet.has(origin)) return callback(null, true)
      return callback(new Error('Origin not allowed'))
    },
  }))
  app.use(express.json({ limit: '20kb' }))

app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'PhysioEase API',
  })
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.post('/api/appointments', async (req, res) => {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
    const appointment = Object.fromEntries(
      Object.entries({
        patientName: 100,
        phone: 25,
        email: 254,
        serviceType: 40,
        preferredDate: 10,
        preferredTime: 30,
        address: 300,
        concern: 2000,
      }).map(([field, maxLength]) => [field, typeof body[field] === 'string' ? body[field].trim() : '']),
    )
    const requiredFields = ['patientName', 'phone', 'email', 'serviceType', 'preferredDate', 'preferredTime']
    const lengthsValid = Object.entries(appointment).every(([field, value]) => value.length <= {
      patientName: 100, phone: 25, email: 254, serviceType: 40,
      preferredDate: 10, preferredTime: 30, address: 300, concern: 2000,
    }[field])
    const parsedDate = new Date(`${appointment.preferredDate}T00:00:00Z`)
    const today = new Date().toISOString().slice(0, 10)
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(appointment.preferredDate)
      && !Number.isNaN(parsedDate.getTime())
      && parsedDate.toISOString().slice(0, 10) === appointment.preferredDate
      && appointment.preferredDate >= today
    const validService = ['Video Physiotherapy', 'Home Physiotherapy'].includes(appointment.serviceType)
    const validTime = ['Morning (9-12)', 'Afternoon (12-3)', 'Evening (3-6)'].includes(appointment.preferredTime)

    if (
      requiredFields.some((field) => !appointment[field])
      || !lengthsValid
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appointment.email)
      || !/^\+?[0-9()\s-]{7,25}$/.test(appointment.phone)
      || !validDate
      || !validService
      || !validTime
      || body.consent !== true
    ) {
      return res.status(400).json({ message: 'Enter valid contact details and choose a listed service, date and time.' })
    }

    Object.assign(appointment, {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      emailSent: false,
      confirmationSent: false,
      whatsappSent: false,
    })
    appointment.whatsappUrl = buildWhatsAppUrl(appointment)

    try {
      const emailResult = await deliverAppointmentEmail(appointment)
      appointment.emailSent = Boolean(emailResult?.sent)
    } catch (error) {
      console.error('Failed to send consultation email:', error)
    }

    try {
      const whatsappResult = await deliverWhatsApp(appointment)
      appointment.whatsappSent = Boolean(whatsappResult?.sent)
    } catch (error) {
      console.error('Failed to send consultation WhatsApp:', error)
    }

    if (!appointment.emailSent && !appointment.whatsappSent) {
      return res.status(503).json({
        received: false,
        message: 'We could not send your request. Please contact us directly or use WhatsApp.',
        whatsappUrl: appointment.whatsappUrl,
      })
    }

    try {
      const confirmationResult = await deliverPatientConfirmation(appointment)
      appointment.confirmationSent = Boolean(confirmationResult?.sent)
    } catch (error) {
      console.error('Failed to send patient confirmation email:', error)
    }

    return res.status(201).json({
      received: true,
      appointmentId: appointment.id,
      emailSent: appointment.emailSent,
      confirmationSent: appointment.confirmationSent,
      whatsappSent: appointment.whatsappSent,
    })
  })

  app.post('/api/contact', (req, res) => {
    const { name, phone, message } = req.body
    if (!name || !phone || !message) return res.status(400).json({ message: 'Name, phone and message are required.' })
    enquiries.unshift({ id: crypto.randomUUID(), ...req.body, createdAt: new Date().toISOString(), status: 'New' })
    res.status(201).json({ message: 'Thanks. Your enquiry has been received.' })
  })
  app.get('/api/testimonials', (_req, res) => res.json([]))
  app.get('/api/availability', (_req, res) => res.json({ video: true, homeVisit: true, hours: 'Mon-Sat, 9:00 AM - 6:00 PM' }))

  return app
}

const app = createApp()
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  app.listen(port, () => console.log(`API listening on port ${port}`))
}
