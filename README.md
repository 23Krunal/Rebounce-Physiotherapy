# Dr. Shreya Parmar Physiotherapy

A static HTML physiotherapy website with a React booking dialog and a lightweight Express API.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env`, then open `http://localhost:5173`. The API runs on `http://localhost:4001`.

Run the API tests with `npm test`.

## Production notes

The appointment API validates requests and returns success only after the configured email or WhatsApp provider accepts delivery. It does not yet persist appointment records, so it is not production-ready. Before accepting patient enquiries in production, add durable storage, rate limiting/abuse controls, a data-retention policy, and secure access controls for any stored records. Keep provider secrets server-side. A public appointment endpoint does not require patient login; any future admin access must be authenticated.

GitHub Pages hosts only the static frontend. Deploy `server/index.js` separately to an HTTPS Node host, configure its `PORT`, `CORS_ORIGINS` (include `https://23krunal.github.io`), and delivery-provider secrets, then add a GitHub Actions repository variable named `VITE_API_BASE_URL` containing the API origin (for example, `https://api.example.com`, without `/api`). Without that variable, the booking form offers WhatsApp and does not claim the API received the request.

### WhatsApp consultation notifications

The API can send each consultation's name, phone, email, requested service, preferred date/time, address, and concern to `WHATSAPP_NUMBER` through the Meta WhatsApp Cloud API. Configure the Meta access token, phone number ID, approved template name, template language, and Graph API version in `.env`. The approved template must contain eight body variables (`{{1}}` through `{{8}}`) in this order: name, phone, email, service, preferred date, preferred time, address, concern. The business phone number must be enabled for WhatsApp Cloud API, and the recipient must meet WhatsApp's opt-in requirements. The API response includes `whatsappSent`; it remains `false` until provider configuration is valid and Meta accepts the send.

## Included flows

- Static homepage and separate home-visit and online physiotherapy pages
- React-mounted appointment dialog
- Initial phone enquiry clearly separated from treatment
- Appointment form with service-area prompt for home visits
- Contact endpoint, availability endpoint, testimonials endpoint, sitemap and robots file
