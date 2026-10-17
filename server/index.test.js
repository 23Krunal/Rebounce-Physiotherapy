import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createApp } from './index.js'
import { initializeDatabase } from './database.js'

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

function createMockDatabase({ failInserts = false } = {}) {
  const calls = []
  return {
    calls,
    async execute(sql, values = []) {
      calls.push({ sql, values })
      if (failInserts && sql.includes('INSERT INTO')) throw new Error('mock database failure')
      return [{ affectedRows: 1 }, []]
    },
  }
}

test('rejects invalid appointment fields before attempting delivery', async () => {
  let deliveryAttempted = false
  const database = createMockDatabase()
  const delivery = async () => {
    deliveryAttempted = true
    return { sent: true }
  }

  await withApi({ database, deliverAppointmentEmail: delivery, deliverWhatsApp: delivery }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validAppointment, email: 'not-an-email' }),
    })

    assert.equal(response.status, 400)
    assert.equal(deliveryAttempted, false)
    assert.equal(database.calls.length, 0)
  })
})

test('persists an appointment and reports receipt when all delivery providers fail', async () => {
  const database = createMockDatabase()

  await withApi({
    database,
    deliverAppointmentEmail: async () => ({ sent: false }),
    deliverWhatsApp: async () => ({ sent: false }),
    deliverPatientConfirmation: async () => ({ sent: false }),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAppointment),
    })
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.received, true)
    assert.equal(result.emailSent, false)
    assert.equal(result.whatsappSent, false)
    assert.equal(database.calls.length, 2)
    assert.match(database.calls[0].sql, /INSERT INTO appointments/)
    assert.match(database.calls[1].sql, /UPDATE appointments/)
    assert.equal(database.calls[0].values[0], result.appointmentId)
    assert.equal(database.calls[0].values[9] instanceof Date, true)
  })
})

test('reports receipt only after a delivery provider accepts the appointment', async () => {
  let confirmationAttempted = false
  const database = createMockDatabase()

  await withApi({
    database,
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
    assert.match(database.calls[0].sql, /INSERT INTO appointments/)
    assert.match(database.calls[1].sql, /UPDATE appointments/)
    assert.equal(database.calls[1].values[3], 'sent')
  })
})

test('persists valid contact enquiries using parameterized SQL', async () => {
  const database = createMockDatabase()

  await withApi({ database }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Sam Example', phone: '+91 98765 43210', email: 'sam@example.com', message: 'Please call me.' }),
    })
    assert.equal(response.status, 201)
    assert.match(database.calls[0].sql, /INSERT INTO contact_enquiries/)
    assert.deepEqual(database.calls[0].values.slice(1), [
      'Sam Example', '+91 98765 43210', 'sam@example.com', 'Please call me.',
    ])
  })
})

test('returns a safe failure and skips notifications when appointment persistence fails', async () => {
  let deliveryAttempted = false
  const database = createMockDatabase({ failInserts: true })

  await withApi({
    database,
    deliverAppointmentEmail: async () => { deliveryAttempted = true; return { sent: true } },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validAppointment),
    })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      received: false,
      message: 'We could not save your request. Please try again later.',
    })
    assert.equal(deliveryAttempted, false)
  })
})

test('initializes appointment and contact tables', async () => {
  const database = createMockDatabase()
  await initializeDatabase(database)
  assert.equal(database.calls.length, 2)
  assert.match(database.calls[0].sql, /CREATE TABLE IF NOT EXISTS appointments/)
  assert.match(database.calls[0].sql, /consent_at TIMESTAMP/)
  assert.match(database.calls[0].sql, /notification_status/)
  assert.match(database.calls[1].sql, /CREATE TABLE IF NOT EXISTS contact_enquiries/)
})

test('keeps health checks and exposes no public appointment listing', async () => {
  await withApi({ database: createMockDatabase() }, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`)
    assert.deepEqual(await health.json(), { ok: true })
    const appointments = await fetch(`${baseUrl}/api/appointments`)
    assert.equal(appointments.status, 404)
  })
})

test('rate limits public write requests', async () => {
  const database = createMockDatabase()
  await withApi({
    database,
    rateLimitMax: 1,
    deliverAppointmentEmail: async () => ({ sent: false }),
    deliverWhatsApp: async () => ({ sent: false }),
    deliverPatientConfirmation: async () => ({ sent: false }),
  }, async (baseUrl) => {
    const request = (path, body) => fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    assert.equal((await request('/api/appointments', validAppointment)).status, 201)
    assert.equal((await request('/api/contact', { name: 'Sam', phone: '9876543210', message: 'Hello' })).status, 429)
  })
})