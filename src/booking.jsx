import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, MessageCircle, X } from 'lucide-react'

const whatsappNumber = '918401423844'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')

function BookingForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  const [booking, setBooking] = useState({ serviceType: 'Video Physiotherapy', patientName: '', phone: '', email: '', preferredDate: '', preferredTime: '', address: '', concern: '', consent: false })

  useEffect(() => {
    const openBooking = () => { setBookingError(''); setIsOpen(true) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') setIsOpen(false) }
    window.addEventListener('rebounce:open-booking', openBooking)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('rebounce:open-booking', openBooking)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const updateBooking = (event) => setBooking({ ...booking, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value })
  const buildWhatsAppUrl = (payload) => {
    const message = [
      'Hello ReBounce Physiotherapy,',
      '',
      `I am ${payload.patientName || 'a patient'}.`,
      `My phone number is ${payload.phone || 'not provided'}.`,
      `My email is ${payload.email || 'not provided'}.`,
      `I want ${payload.serviceType || 'a consultation'}.`,
      `Preferred date: ${payload.preferredDate || 'TBD'}.`,
      `Preferred time: ${payload.preferredTime || 'TBD'}.`,
      payload.address ? `Address: ${payload.address}.` : '',
      payload.concern ? `Concern: ${payload.concern}.` : '',
    ].filter(Boolean).join('\n')
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  const submitBooking = async (event) => {
    event.preventDefault()
    const fallbackLink = buildWhatsAppUrl(booking)
    setBookingError('')
    setWhatsappLink('')
    if (!apiBaseUrl && import.meta.env.PROD) {
      setWhatsappLink(fallbackLink)
      setBookingError('Online booking is not connected yet, so your request has not been submitted. You can send it directly through WhatsApp below.')
      return
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/appointments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.received !== true) {
        setWhatsappLink(data.whatsappUrl || fallbackLink)
        setBookingError(data.message || 'We could not confirm that your request was received. You can send it directly through WhatsApp below.')
        return
      }
      setSubmitted(true)
    } catch {
      setWhatsappLink(fallbackLink)
      setBookingError('We could not connect to the booking service, so your request has not been submitted. You can send it directly through WhatsApp below.')
    }
  }

  if (!isOpen) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsOpen(false)}>
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="close-modal" type="button" onClick={() => setIsOpen(false)} aria-label="Close booking form"><X /></button>
        {submitted ? <div className="success-state"><Check size={28} /><p className="eyebrow">ENQUIRY RECEIVED</p><h2 id="booking-title">Thank you,<br /><em>{booking.patientName}</em></h2><p>Your request was received by the booking service. The team will review it and follow up using your contact details.</p><button className="button" type="button" onClick={() => { setIsOpen(false); setSubmitted(false); setBookingError(''); setWhatsappLink('') }}>Done</button></div> : <>
          <p className="eyebrow">BOOK A CONSULTATION</p><h2 id="booking-title">Let’s find the<br /><em>right next step.</em></h2><p className="modal-intro">Share a few details to ask about an appointment. Session length and fees are confirmed when booking.</p>
          {bookingError && <div className="booking-error" role="alert"><p>{bookingError}</p>{whatsappLink && <a className="button button-secondary" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Send via WhatsApp</a>}</div>}
          <form onSubmit={submitBooking}>
            <label>Your name<input required maxLength="100" name="patientName" value={booking.patientName} onChange={updateBooking} autoComplete="name" /></label>
            <div className="form-row"><label>Phone number<input required maxLength="25" type="tel" name="phone" value={booking.phone} onChange={updateBooking} autoComplete="tel" /></label><label>Email<input required maxLength="254" type="email" name="email" value={booking.email} onChange={updateBooking} autoComplete="email" /></label></div>
            <label>Preferred care<select name="serviceType" value={booking.serviceType} onChange={updateBooking}><option>Video Physiotherapy</option><option>Home Physiotherapy</option></select></label>
            <div className="form-row"><label>Preferred date<input required type="date" name="preferredDate" value={booking.preferredDate} onChange={updateBooking} /></label><label>Preferred time<select required name="preferredTime" value={booking.preferredTime} onChange={updateBooking}><option value="">Select a time</option><option>Morning (9-12)</option><option>Afternoon (12-3)</option><option>Evening (3-6)</option></select></label></div>
            {booking.serviceType === 'Home Physiotherapy' && <label>Home visit area<input required maxLength="300" name="address" value={booking.address} onChange={updateBooking} autoComplete="street-address" placeholder="Area and address" /></label>}
            <label>Your concern<textarea maxLength="2000" name="concern" value={booking.concern} onChange={updateBooking} rows={4} /></label>
            <label className="consent"><input required type="checkbox" name="consent" checked={booking.consent} onChange={updateBooking} /> I agree to share these details with ReBounce so the team can respond to my appointment request.</label>
            <button className="button" type="submit">Send enquiry <ArrowUpRight size={17} /></button>
          </form>
        </>}
      </section>
    </div>
  )
}

document.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('[data-open-booking]')) window.dispatchEvent(new Event('rebounce:open-booking'))
})

const bookingRoot = document.getElementById('booking-root')
if (bookingRoot) createRoot(bookingRoot).render(<BookingForm />)