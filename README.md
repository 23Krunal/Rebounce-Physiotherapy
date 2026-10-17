# Dr. Shreya Parmar Physiotherapy

A static HTML physiotherapy website with a React booking dialog and a lightweight Express API.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env`, fill in the database and any notification settings, then open `http://localhost:5173`. The API runs on `http://localhost:4001`. Never commit `.env` or place database credentials in frontend `VITE_*` variables.

Run the API tests with `npm test`. Database access is mocked in the tests; they do not require a live database.

## Production notes

The Node.js API reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` from its environment. GoDaddy's Node.js app integration supplies these values when the hosted database is attached. For local development, set the same variables in the ignored `.env` file; `DB_PORT` defaults to `3306`. The configured MySQL user needs permission to create and update tables. On startup, the API creates the `appointments` and `contact_enquiries` tables if they do not already exist. The API will not start if database initialization fails.

Appointment and contact request bodies are validated and inserted using parameterized SQL. Appointments record patient contact details, requested service/date/time, address, concern, consent timestamp, creation timestamp, and notification delivery status. Notification attempts happen only after the appointment insert; email or WhatsApp delivery failure does not remove the appointment or change the successful receipt response. Contact submissions are stored in MySQL rather than memory. Both public write endpoints are limited to 20 requests per IP in a 15-minute window. No public endpoint lists or retrieves patient records. Keep database and provider credentials server-side, restrict database access, and define an appropriate patient-data retention policy.

GitHub Pages hosts only the static frontend. Deploy `server/index.js` separately to an HTTPS Node host, configure its `PORT`, `CORS_ORIGINS` (include `https://23krunal.github.io`), and delivery-provider secrets, then add a GitHub Actions repository variable named `VITE_API_BASE_URL` containing the API origin (for example, `https://api.example.com`, without `/api`). Without that variable, the booking form offers WhatsApp and does not claim the API received the request.

### WhatsApp consultation notifications

The API can send each consultation's name, phone, email, requested service, preferred date/time, address, and concern to `WHATSAPP_NUMBER` through the Meta WhatsApp Cloud API. Configure the Meta access token, phone number ID, approved template name, template language, and Graph API version in `.env`. The approved template must contain eight body variables (`{{1}}` through `{{8}}`) in this order: name, phone, email, service, preferred date, preferred time, address, concern. The business phone number must be enabled for WhatsApp Cloud API, and the recipient must meet WhatsApp's opt-in requirements. The API response includes `whatsappSent`; it remains `false` until provider configuration is valid and Meta accepts the send.

## Included flows

- Static homepage and separate home-visit and online physiotherapy pages
- React-mounted appointment dialog
- Initial phone enquiry clearly separated from treatment
- Appointment form with service-area prompt for home visits
- Contact endpoint, availability endpoint, testimonials endpoint, sitemap and robots file
