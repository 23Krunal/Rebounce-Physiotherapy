# Dr. Shreya Parmar Physiotherapy

A responsive React + Vite physiotherapy booking website with a lightweight Express API.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

## Production notes

The current API uses in-memory storage so the demo runs without external services. Before production, add a database, hashed admin authentication, HTTPS, rate limiting, and server-side validation. Copy `.env.example` to `.env` and keep all secrets server-side.

### WhatsApp consultation notifications

The API can send each consultation's name, phone, email, requested service, preferred date/time, address, and concern to `WHATSAPP_NUMBER` through the Meta WhatsApp Cloud API. Configure the Meta access token, phone number ID, approved template name, template language, and Graph API version in `.env`. The approved template must contain eight body variables (`{{1}}` through `{{8}}`) in this order: name, phone, email, service, preferred date, preferred time, address, concern. The business phone number must be enabled for WhatsApp Cloud API, and the recipient must meet WhatsApp's opt-in requirements. The API response includes `whatsappSent`; it remains `false` until provider configuration is valid and Meta accepts the send.

## Included flows

- Public homepage with video and home-visit treatment paths
- Initial phone enquiry clearly separated from treatment
- Appointment form with service-area prompt for home visits
- Admin demo route at `/admin` with local appointment status controls
- Contact endpoint, availability endpoint, testimonials endpoint, sitemap and robots file
