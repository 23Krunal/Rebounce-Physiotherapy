import { createPool } from 'mysql2/promise'

let pool

export function getDatabasePool(env = process.env) {
  if (pool) return pool

  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
  const missing = required.filter((key) => !env[key])
  const port = Number(env.DB_PORT || 3306)
  if (missing.length || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Database configuration is incomplete or invalid.')
  }

  pool = createPool({
    host: env.DB_HOST,
    port,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  return pool
}

export async function initializeDatabase(database) {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id CHAR(36) NOT NULL PRIMARY KEY,
      patient_name VARCHAR(100) NOT NULL,
      phone VARCHAR(25) NOT NULL,
      email VARCHAR(254) NOT NULL,
      service_type VARCHAR(40) NOT NULL,
      preferred_date DATE NOT NULL,
      preferred_time VARCHAR(30) NOT NULL,
      address VARCHAR(300) NOT NULL DEFAULT '',
      concern TEXT NOT NULL,
      consent_at TIMESTAMP(3) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      notification_status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
      email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      confirmation_sent BOOLEAN NOT NULL DEFAULT FALSE,
      whatsapp_sent BOOLEAN NOT NULL DEFAULT FALSE
    ) ENGINE=InnoDB
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id CHAR(36) NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(25) NOT NULL,
      email VARCHAR(254) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB
  `)
}
