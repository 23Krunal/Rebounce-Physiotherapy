import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from './index.js'

const validAppointment = {
  patientName: 'Sam Example',
  phone: '+91 98765 43210',
  email: 'sam@example.com',
  serviceType: 'Video Physiotherapy',
  preferredDate: '2099-05-15',
  preferredTime: 'Morning (9-12)',
  address: '',
  concern: 'Mobility support',
  consent: true,
}

async function withApi(options, callback) {
  const server = createApp(options).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()

  try {
    await callback(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}

test('rejects invalid appointment fields before attempting delivery', async () => {
  let deliveryAttempted = false
  const delivery = async () => {
    deliveryAttempted = true
    return { sent: true }
  }

  await withApi({ deliverAppointmentEmail: delivery, deliverWhatsApp: delivery }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validAppointment, email: 'not-an-email' }),
    })

    assert.equal(response.status, 400)
    assert.equal(deliveryAttempted, false)
  })
})

test('does not report receipt when all delivery providers fail', async () => {
  let confirmationAttempted = false

  await withApi({
    deliverAppointmentEmail: async () => ({ sent: false }),
    deliverWhatsApp: async () => ({ sent: false }),
    deliverPatientConfirmation: async () => {
      confirmationAttempted = true
      return { sent: true }
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAppointment),
    })
    const result = await response.json()

    assert.equal(response.status, 503)
    assert.equal(result.received, false)
    assert.match(result.whatsappUrl, /^https:\/\/wa\.me\//)
    assert.equal(confirmationAttempted, false)
  })
})

test('reports receipt only after a delivery provider accepts the appointment', async () => {
  let confirmationAttempted = false

  await withApi({
    deliverAppointmentEmail: async () => ({ sent: true }),
    deliverWhatsApp: async () => ({ sent: false }),
    deliverPatientConfirmation: async () => {
      confirmationAttempted = true
      return { sent: true }
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAppointment),
    })
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.received, true)
    assert.equal(result.emailSent, true)
    assert.equal(typeof result.appointmentId, 'string')
    assert.equal(confirmationAttempted, true)
  })
})