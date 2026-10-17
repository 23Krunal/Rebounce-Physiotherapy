# Dr. Shreya Parmar Physiotherapy

A static HTML physiotherapy website with a React booking dialog and a lightweight Express API.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env`, then open `http://localhost:5173`. The API runs on `http://localhost:4001`. Local API use also requires the database environment variables described below.

Run the API tests with `npm test`. Tests use mocked database access and do not require GoDaddy credentials or a live database.

## Production notes

The API uses `mysql2/promise` and reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` from its Node.js process environment. GoDaddy supplies these variables when its hosted MySQL database is attached to the Node.js app. Never put database credentials in `VITE_*` variables or frontend code. For local development, set the same variables in the ignored `.env` file; `DB_PORT` defaults to `3306`. The configured MySQL user needs permission to create and update tables.

On the first appointment or contact submission, the API creates the `appointments` and `contact_enquiries` tables if they do not already exist. Appointment details, consent and creation timestamps, and notification delivery flags are saved to MySQL. Appointment and contact inputs are validated and written with parameterized SQL. Email and WhatsApp notifications are attempted only after the appointment insert succeeds; provider failures do not remove the saved appointment or change its successful receipt response. Contact enquiries are persisted in MySQL. Both public write endpoints are limited to 20 requests per IP per 15-minute window. There is no public endpoint for reading patient records. Keep database and provider credentials server-side, restrict database access, and define an appropriate patient-data retention policy.

GitHub Pages hosts only the static frontend. Deploy `server/index.js` separately to an HTTPS Node host, configure its `PORT`, `CORS_ORIGINS` (include `https://23krunal.github.io`), and delivery-provider secrets, then add a GitHub Actions repository variable named `VITE_API_BASE_URL` containing the API origin (for example, `https://api.example.com`, without `/api`). Without that variable, the booking form offers WhatsApp and does not claim the API received the request.

### WhatsApp consultation notifications

The API can send each consultation's name, phone, email, requested service, preferred date/time, address, and concern to `WHATSAPP_NUMBER` through the Meta WhatsApp Cloud API. Configure the Meta access token, phone number ID, approved template name, template language, and Graph API version in `.env`. The approved template must contain eight body variables (`{{1}}` through `{{8}}`) in this order: name, phone, email, service, preferred date, preferred time, address, concern. The business phone number must be enabled for WhatsApp Cloud API, and the recipient must meet WhatsApp's opt-in requirements. The API response includes `whatsappSent`; it remains `false` until provider configuration is valid and Meta accepts the send.

## Included flows

- Static homepage and separate home-visit and online physiotherapy pages
- React-mounted appointment dialog
- Initial phone enquiry clearly separated from treatment
- Appointment form with service-area prompt for home visits
- Contact endpoint, availability endpoint, testimonials endpoint, sitemap and robots file
