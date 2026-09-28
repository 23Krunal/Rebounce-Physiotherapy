import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'

const app = express()
const port = Number(process.env.PORT || 4001)
const enquiries = []
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

async function sendAppointmentEmail(appointment) {
  if (!transporter) {
    console.warn('SMTP not configured yet. Booking saved locally but no email was sent.')
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
    'This enquiry came from the Rebounce physiotherapy website.',
  ].join('\n')

  const html = `
    <h2>New consultation request</h2>
    <p><strong>Name:</strong> ${appointment.patientName}</p>
    <p><strong>Phone:</strong> ${appointment.phone}</p>
    <p><strong>Email:</strong> ${appointment.email || 'Not provided'}</p>
    <p><strong>Service:</strong> ${appointment.serviceType}</p>
    <p><strong>Preferred date:</strong> ${appointment.preferredDate}</p>
    <p><strong>Preferred time:</strong> ${appointment.preferredTime}</p>
    <p><strong>Address:</strong> ${appointment.address || 'Not provided'}</p>
    <p><strong>Concern:</strong> ${appointment.concern || 'Not provided'}</p>
  `

  await transporter.sendMail({
    from: `"Rebounce Consultation" <${smtpUser || adminEmail}>`,
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
    'Thank you for contacting Rebounce Physiotherapy.',
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
    'Rebounce Physiotherapy Team',
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #1b1b1b; max-width: 640px; margin: 0 auto;">
      <div style="padding: 24px 28px; background: #f7f2ea; border: 1px solid #eadbc7; border-radius: 14px;">
        <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 1.5px; color: #7d6956; text-transform: uppercase;">Rebounce Physiotherapy</p>
        <h2 style="margin: 0 0 16px; color: #1a1a1a;">Thank you for contacting us</h2>
        <p style="margin: 0 0 12px;">Dear ${appointment.patientName},</p>
        <p style="margin: 0 0 12px;">We have received your consultation request and our team is reviewing it.</p>
        <p style="margin: 0 0 12px;">Dr. Shreya Parmar will review your enquiry and call you back shortly to discuss the next steps and guide you toward the right care plan.</p>
        <div style="background: #ffffff; border: 1px solid #e9dfd4; border-radius: 10px; padding: 16px; margin: 18px 0;">
          <p style="margin: 0 0 8px;"><strong>Preferred service:</strong> ${appointment.serviceType}</p>
          <p style="margin: 0 0 8px;"><strong>Preferred date:</strong> ${appointment.preferredDate}</p>
          <p style="margin: 0;"><strong>Preferred time:</strong> ${appointment.preferredTime}</p>
        </div>
        <p style="margin: 0;">Warm regards,<br />The Rebounce Physiotherapy Team</p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"Rebounce Physiotherapy" <${smtpUser || adminEmail}>`,
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
    'Hello Rebounce Physiotherapy,',
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
  ].filter(Boolean).join(' %0A')

  return `https://wa.me/${whatsappNumber}?text=${message}`
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

app.use(cors())
app.use(express.json({ limit: '100kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/appointments', async (req, res) => {
  const { patientName, phone, email, serviceType, preferredDate, preferredTime, address, concern } = req.body
  if (!patientName || !phone || !email || !serviceType || !preferredDate || !preferredTime) {
    return res.status(400).json({ message: 'Please complete the required booking fields: name, phone, email, service, date and time.' })
  }

  const appointment = {
    id: crypto.randomUUID(), patientName, phone, email: String(email).trim(), serviceType,
    preferredDate, preferredTime, address: address || '', concern: concern || '',
    createdAt: new Date().toISOString(),
    emailSent: false,
    confirmationSent: false,
    whatsappSent: false,
    whatsappUrl: '',
  }

  appointment.whatsappUrl = buildWhatsAppUrl(appointment)

  try {
    const emailResult = await sendAppointmentEmail(appointment)
    appointment.emailSent = emailResult.sent
  } catch (error) {
    console.error('Failed to send consultation email:', error)
  }

  try {
    const confirmationResult = await sendPatientConfirmationEmail(appointment)
    appointment.confirmationSent = confirmationResult.sent
  } catch (error) {
    console.error('Failed to send patient confirmation email:', error)
  }

  const whatsappResult = await sendAppointmentWhatsApp(appointment)
  appointment.whatsappSent = whatsappResult.sent

  res.status(201).json({
    appointment,
    emailSent: appointment.emailSent,
    confirmationSent: appointment.confirmationSent,
    whatsappSent: appointment.whatsappSent,
    whatsappUrl: appointment.whatsappUrl,
  })
})
app.post('/api/contact', (req, res) => {
  const { name, phone, message } = req.body
  if (!name || !phone || !message) return res.status(400).json({ message: 'Name, phone and message are required.' })
  enquiries.unshift({ id: crypto.randomUUID(), ...req.body, createdAt: new Date().toISOString(), status: 'New' })
  res.status(201).json({ message: 'Thanks. Your enquiry has been received.' })
})
app.get('/api/testimonials', (_req, res) => res.json([
  { name: 'Meera', category: 'Post-operative recovery', content: 'The sessions gave me confidence to move again. Every step felt considered and manageable.' },
  { name: 'Arjun', category: 'Neurological rehabilitation', content: 'Clear guidance, patient explanations and a plan that worked around my everyday life.' },
]))
app.get('/api/availability', (_req, res) => res.json({ video: true, homeVisit: true, hours: 'Mon-Sat, 9:00 AM - 6:00 PM' }))
app.listen(port, () => console.log(`API listening on http://localhost:${port}`))
