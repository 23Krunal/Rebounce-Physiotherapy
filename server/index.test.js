import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { initializeDatabase } from './database.js'
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

function createDatabase(execute = async () => [[], []]) {
  const queries = []
  return {
    queries,
    async execute(sql, values = []) {
      queries.push({ sql, values })
      return execute(sql, values)
    },
  }
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

async function postJson(baseUrl, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('creates the appointments and contact tables idempotently', async () => {
  const database = createDatabase()

  await initializeDatabase(database)

  assert.equal(database.queries.length, 2)
  assert.match(database.queries[0].sql, /CREATE TABLE IF NOT EXISTS appointments/)
  for (const field of [
    'patient_name', 'phone', 'email', 'service_type', 'preferred_date',
    'preferred_time', 'address', 'concern', 'consent_at', 'created_at', 'notification_status',
  ]) {
    assert.match(database.queries[0].sql, new RegExp(field))
  }
  assert.match(database.queries[1].sql, /CREATE TABLE IF NOT EXISTS contact_enquiries/)
})

test('rejects invalid appointment fields before database access or delivery', async () => {
  const database = createDatabase()
  let deliveryAttempted = false
  const delivery = async () => {
    deliveryAttempted = true
    return { sent: true }
  }

  await withApi({
    database,
    databaseInitializer: async () => {},
    deliverAppointmentEmail: delivery,
    deliverWhatsApp: delivery,
  }, async (baseUrl) => {
    const response = await postJson(baseUrl, '/api/appointments', { ...validAppointment, email: 'not-an-email' })

    assert.equal(response.status, 400)
    assert.equal(database.queries.length, 0)
    assert.equal(deliveryAttempted, false)
  })
})

test('persists an appointment before attempting notifications and records delivery status', async () => {
  const database = createDatabase()
  const attempts = []

  await withApi({
    database,
    databaseInitializer: async () => {},
    deliverAppointmentEmail: async () => {
      assert.match(database.queries[0].sql, /INSERT INTO appointments/)
      attempts.push('email')
      return { sent: true }
    },
    deliverWhatsApp: async () => {
      attempts.push('whatsapp')
      return { sent: false }
    },
    deliverPatientConfirmation: async () => {
      attempts.push('confirmation')
      return { sent: true }
    },
  }, async (baseUrl) => {
    const response = await postJson(baseUrl, '/api/appointments', validAppointment)
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.received, true)
    assert.equal(result.emailSent, true)
    assert.equal(result.confirmationSent, true)
    assert.equal(result.whatsappSent, false)
    assert.deepEqual(attempts, ['email', 'whatsapp', 'confirmation'])
    assert.equal(database.queries.length, 2)

    const [insert, update] = database.queries
    assert.match(insert.sql, /VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, 'pending'\)/)
    assert.equal(insert.values[1], validAppointment.patientName)
    assert.equal(insert.values[2], validAppointment.phone)
    assert.equal(insert.values[3], validAppointment.email)
    assert.equal(insert.values[8], validAppointment.concern)
    assert.ok(insert.values[9] instanceof Date)
    assert.match(update.sql, /UPDATE appointments/)
    assert.deepEqual(update.values, [true, true, false, 'sent', result.appointmentId])
  })
})

test('keeps a saved appointment when all notification providers fail', async () => {
  const database = createDatabase()
  let confirmationAttempted = false

  await withApi({
    database,
    databaseInitializer: async () => {},
    deliverAppointmentEmail: async () => ({ sent: false }),
    deliverWhatsApp: async () => ({ sent: false }),
    deliverPatientConfirmation: async () => {
      confirmationAttempted = true
      return { sent: true }
    },
  }, async (baseUrl) => {
    const response = await postJson(baseUrl, '/api/appointments', validAppointment)
    const result = await response.json()

    assert.equal(response.status, 201)
    assert.equal(result.received, true)
    assert.equal(result.emailSent, false)
    assert.equal(result.whatsappSent, false)
    assert.equal(database.queries.length, 2)
    assert.deepEqual(database.queries[1].values, [false, false, false, 'failed', result.appointmentId])
    assert.equal(confirmationAttempted, false)
  })
})

test('does not attempt notifications or disclose patient details when appointment storage fails', async () => {
  const database = createDatabase(async () => {
    throw new Error('database failure')
  })
  let deliveryAttempted = false

  await withApi({
    database,
    databaseInitializer: async () => {},
    deliverAppointmentEmail: async () => {
      deliveryAttempted = true
      return { sent: true }
    },
    deliverWhatsApp: async () => ({ sent: true }),
  }, async (baseUrl) => {
    const response = await postJson(baseUrl, '/api/appointments', validAppointment)
    const result = await response.json()

    assert.equal(response.status, 503)
    assert.equal(result.received, false)
    assert.equal(JSON.stringify(result).includes(validAppointment.patientName), false)
    assert.equal(deliveryAttempted, false)
  })
})

test('persists contact enquiries and applies the public write rate limit', async () => {
  const database = createDatabase()
  const enquiry = {
    name: 'Alex Patient',
    phone: '+91 98765 43210',
    email: 'alex@example.com',
    message: 'Please call me about an appointment.',
  }

  await withApi({
    database,
    databaseInitializer: async () => {},
    rateLimitMax: 1,
  }, async (baseUrl) => {
    const response = await postJson(baseUrl, '/api/contact', enquiry)
    const result = await response.json()
    const limitedResponse = await postJson(baseUrl, '/api/contact', enquiry)

    assert.equal(response.status, 201)
    assert.match(result.message, /received/)
    assert.equal(limitedResponse.status, 429)
    assert.equal(database.queries.length, 1)
    assert.match(database.queries[0].sql, /INSERT INTO contact_enquiries/)
    assert.deepEqual(database.queries[0].values.slice(1), [
      enquiry.name, enquiry.phone, enquiry.email, enquiry.message,
    ])
  })
})

test('keeps the health endpoint independent of database availability', async () => {
  await withApi({
    databaseProvider: () => {
      throw new Error('database configuration unavailable')
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
  })
})
