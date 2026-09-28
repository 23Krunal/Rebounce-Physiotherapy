import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { ArrowUpRight, Check, Clock3, Instagram, Mail, MapPin, Menu, MessageCircle, Phone, ShieldCheck, Sparkles, X } from 'lucide-react'
import therapistPhoto from '../Image/IMG-20260927-WA0009.jpg'
import aboutPhoto from '../Image/image 2.jpg'
import './styles.css'

const whatsappNumber = '918401423844'

const services = [
  { number: '01', title: 'Initial phone enquiry', text: 'A short information call to understand your concern and guide you toward the right next step.', icon: Phone, note: 'Information & intake' },
  { number: '02', title: 'Video physiotherapy', text: 'Assessment, exercise guidance and progressive rehabilitation from wherever you are.', icon: Sparkles, note: 'Online treatment' },
  { number: '03', title: 'Home physiotherapy', text: 'In-person assessment and tailored treatment in the comfort of your home.', icon: MapPin, note: 'In-person treatment' },
]

const testimonials = [
  { name: 'Meera', detail: 'Post-operative recovery', quote: 'The sessions gave me confidence to move again. Every step felt considered and manageable.' },
  { name: 'Arjun', detail: 'Neurological rehabilitation', quote: 'Clear guidance, patient explanations and a plan that worked around my everyday life.' },
]

function Admin() {
  const [appointments, setAppointments] = useState([
    { id: 'demo-1', patientName: 'Aarav Mehta', serviceType: 'Home Physiotherapy', preferredDate: '2026-09-28', preferredTime: 'Morning (9-12)', status: 'Pending' },
    { id: 'demo-2', patientName: 'Nisha Rao', serviceType: 'Video Physiotherapy', preferredDate: '2026-09-29', preferredTime: 'Afternoon (12-3)', status: 'Confirmed' },
  ])
  const updateStatus = async (id, status) => {
    setAppointments(appointments.map((item) => item.id === id ? { ...item, status } : item))
    try { await fetch(`http://localhost:4001/api/appointments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }) } catch { /* demo mode */ }
  }
  return <div className="admin-shell"><header className="topbar"><a className="brand" href="/"><span>SP</span><div><strong>Rebounce</strong><small>Personalized Physiotherapy</small></div></a><a className="text-link" href="/">View public site <ArrowUpRight size={16} /></a></header><main className="admin-main"><div className="admin-heading"><div><p className="eyebrow">PRACTICE OVERVIEW</p><h1>Good morning,<br /><em>Dr. Shreya.</em></h1></div><div className="availability"><span className="status-dot"></span><strong>Accepting enquiries</strong><small>Mon-Sat · 9:00 AM - 6:00 PM</small></div></div><div className="admin-stats"><div><span>Open requests</span><strong>{appointments.filter((item) => item.status === 'Pending').length}</strong></div><div><span>Video available</span><strong>Yes</strong></div><div><span>Home visits</span><strong>Active</strong></div></div><section className="requests"><div className="admin-section-title"><h2>Appointment requests</h2><span>{appointments.length} total</span></div>{appointments.map((item) => <article className="request-row" key={item.id}><div><strong>{item.patientName}</strong><span>{item.serviceType}</span></div><div><strong>{item.preferredDate}</strong><span>{item.preferredTime}</span></div><select value={item.status} onChange={(event) => updateStatus(item.id, event.target.value)}><option>Pending</option><option>Confirmed</option><option>Rescheduled</option><option>Completed</option><option>Cancelled</option></select></article>)}</section></main></div>
}

function App() {
  if (window.location.pathname === '/admin') return <Admin />
  const [menuOpen, setMenuOpen] = useState(false)
  const [showBooking, setShowBooking] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [booking, setBooking] = useState({ serviceType: 'Video Physiotherapy', patientName: '', phone: '', email: '', preferredDate: '', preferredTime: '', address: '', concern: '' })

  const updateBooking = (event) => setBooking({ ...booking, [event.target.name]: event.target.value })
  const buildWhatsAppUrl = (payload) => {
    const message = [
      'Hello Rebounce Physiotherapy,',
      '',
      `I am ${payload.patientName || 'a patient'}.`,
      `My phone number is ${payload.phone || 'not provided'}.`,
      `My email is ${payload.email || 'not provided'}.`,
      `I want ${payload.serviceType || 'a consultation'}.`,
      `Preferred date: ${payload.preferredDate || 'TBD'}.`,
      `Preferred time: ${payload.preferredTime || 'TBD'}.`,
      payload.address ? `Address: ${payload.address}.` : '',
      payload.concern ? `Concern: ${payload.concern}.` : '',
      '',
      'Please review my enquiry and call me back shortly.',
    ].filter(Boolean).join(' %0A')

    return `https://wa.me/${whatsappNumber}?text=${message}`
  }

  const openDirectWhatsApp = () => {
    const message = 'Hello Rebounce Physiotherapy, I would like to book a consultation. Please let me know the next available slot.'
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const submitBooking = async (event) => {
    event.preventDefault()
    const fallbackLink = buildWhatsAppUrl(booking)

    try {
      const response = await fetch('http://localhost:4001/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(booking) })
      const data = await response.json()
      const nextLink = data.whatsappUrl || fallbackLink
      if (nextLink) {
        setWhatsappLink(nextLink)
        window.open(nextLink, '_blank', 'noopener,noreferrer')
      }
    } catch {
      setWhatsappLink(fallbackLink)
      window.open(fallbackLink, '_blank', 'noopener,noreferrer')
    }
    setSubmitted(true)
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Rebounce home"><span>SP</span><div><strong>Rebounce</strong><small>Personalized Physiotherapy</small></div></a>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#approach" onClick={() => setMenuOpen(false)}>Approach</a><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#about" onClick={() => setMenuOpen(false)}>About</a><a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <button className="button button-small" onClick={() => setShowBooking(true)}>Book consultation <ArrowUpRight size={16} /></button>
      </header>

      {showBooking && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowBooking(false)}>
        <div className="booking-modal">
          <button className="close-modal" onClick={() => setShowBooking(false)} aria-label="Close booking form"><X /></button>
          {submitted ? (
            <div className="success-state">
              <Check size={28} />
              <p className="eyebrow">ENQUIRY RECEIVED</p>
              <h2>Thank you,<br /><em>{booking.patientName || 'we have it.'}</em></h2>
              <p>Dr. Shreya's team will call you to understand your requirement and confirm the next step.</p>
              {whatsappLink && <a className="button button-secondary" href={whatsappLink} target="_blank" rel="noreferrer">Continue on WhatsApp</a>}
              <button className="button" onClick={() => { setShowBooking(false); setSubmitted(false); setWhatsappLink('') }}>Done</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">BOOK A CONSULTATION</p>
              <h2>Let’s find the<br /><em>right next step.</em></h2>
              <p className="modal-intro">Share a few details. This starts with an information call, not treatment over the phone.</p>
              <form onSubmit={submitBooking}>
                <label>Your name<input required name="patientName" value={booking.patientName} onChange={updateBooking} placeholder="Full name" /></label>
                <div className="form-row">
                  <label>Phone number<input required type="tel" name="phone" value={booking.phone} onChange={updateBooking} placeholder="+91" /></label>
                  <label>Email<input required type="email" name="email" value={booking.email} onChange={updateBooking} placeholder="you@email.com" /></label>
                </div>
                <label>Preferred care<select name="serviceType" value={booking.serviceType} onChange={updateBooking}><option>Video Physiotherapy</option><option>Home Physiotherapy</option></select></label>
                <div className="form-row">
                  <label>Preferred date<input required type="date" name="preferredDate" value={booking.preferredDate} onChange={updateBooking} /></label>
                  <label>Preferred time<select required name="preferredTime" value={booking.preferredTime} onChange={updateBooking}><option value="">Select a time</option><option>Morning (9-12)</option><option>Afternoon (12-3)</option><option>Evening (3-6)</option></select></label>
                </div>
                <label>Address <span>(optional)</span><input name="address" value={booking.address} onChange={updateBooking} placeholder="Your address" /></label>
                <label>Your concern<textarea name="concern" value={booking.concern} onChange={updateBooking} placeholder="Tell us a little about your condition or goal" rows={4} /></label>
                <button className="button" type="submit">Send enquiry <ArrowUpRight size={17} /></button>
              </form>
            </>
          )}
        </div>
      </div>}

      <main id="top">
        <section className="hero section-grid">
          <div className="hero-copy reveal"><p className="eyebrow">PERSONALISED PHYSIOTHERAPY <span>•</span> MEANINGFUL RECOVERY</p><h1>Move with<br /><em>more confidence.</em></h1><p className="hero-lede">Thoughtful rehabilitation for the moments that matter — delivered through video consultations or attentive home visits.</p><div className="hero-actions"><button className="button" onClick={() => setShowBooking(true)}>Book a consultation <ArrowUpRight size={17} /></button><button className="button button-secondary" onClick={openDirectWhatsApp}><MessageCircle size={17} /> Book via WhatsApp</button><a className="text-link" href="tel:+918401423844"><Phone size={16} /> Call now</a></div><div className="hero-meta"><div><strong>30+</strong><span>home visits</span></div><div><strong>2 yrs</strong><span>clinical experience</span></div><div><strong>BPT</strong><span>qualified care</span></div></div></div>
          <div className="hero-visual"><div className="portrait-frame"><img className="portrait-image" src={therapistPhoto} alt="Dr. Shreya Parmar, physiotherapist" /></div><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><p className="side-note">NEUROLOGICAL &<br />POST-OPERATIVE<br />REHABILITATION</p></div>
        </section>

        <section className="trust-strip"><span>Trusted, considered care for</span><strong>Orthopaedic recovery</strong><strong>Neurological rehabilitation</strong><strong>Geriatric mobility</strong><strong>Post-operative support</strong></section>

        <section className="intro section-grid" id="approach"><div className="section-label"><span>01</span><span>THE APPROACH</span></div><div className="intro-copy"><p className="eyebrow">A CLEARER WAY FORWARD</p><h2>Rehabilitation should feel <em>personal.</em></h2><p>Every body and every recovery has its own rhythm. Together, we build a plan around your movement, your daily life and the goals you want to return to.</p><a className="text-link" href="#about">Meet Dr. Shreya <ArrowUpRight size={16} /></a></div><div className="quote-card"><Sparkles size={22} /><p>“Small, consistent progress can change how you feel in your body.”</p><span>— Dr. Shreya Parmar</span></div></section>

        <section className="services-section" id="services"><div className="section-heading"><div><p className="eyebrow">HOW WE CAN WORK TOGETHER</p><h2>Care, in the format<br /><em>that fits your life.</em></h2></div><p className="section-aside">First, we listen. Then we match you with the right treatment path — online or at home.</p></div><div className="service-grid">{services.map(({ number, title, text, icon: Icon, note }) => <article className="service-card" key={title}><div className="service-top"><span>{number}</span><Icon size={22} /></div><div><span className="service-note">{note}</span><h3>{title}</h3><p>{text}</p></div><button className="icon-button" onClick={() => setShowBooking(true)} aria-label={`Book ${title}`}><ArrowUpRight size={19} /></button></article>)}</div></section>

        <section className="pathway section-grid"><div className="section-label"><span>02</span><span>THE PATIENT JOURNEY</span></div><div className="pathway-body"><p className="eyebrow">A SIMPLE START</p><h2>From first conversation<br />to <em>feeling stronger.</em></h2><div className="steps"><div><b>01</b><span>Phone enquiry</span><small>We understand your concern and discuss what may help.</small></div><div><b>02</b><span>Choose your care</span><small>Video physiotherapy or a home visit within the service area.</small></div><div><b>03</b><span>Build momentum</span><small>Personalised treatment, practical guidance and follow-up.</small></div></div></div></section>

        <section className="about-section section-grid" id="about"><div className="about-photo"><img className="about-image" src={aboutPhoto} alt="Dr. Shreya Parmar in clinic" /><span>Dr. Shreya Parmar (PT)</span></div><div className="about-copy"><p className="eyebrow">A LITTLE ABOUT ME</p><h2>Professional care.<br /><em>Humanly delivered.</em></h2><p>Dr. Shreya Parmar (PT) is a physiotherapist specialising in Neurological and Post-Operative Rehabilitation, with clinical experience in personalised physiotherapy and home-based care.</p><p>Her approach combines clinical assessment, therapeutic exercises, mobility training and progressive rehabilitation tailored to each patient's needs and goals.</p><div className="credential-list"><span><Check size={15} /> BPT qualified</span><span><Check size={15} /> 30+ home visits</span><span><Check size={15} /> Home & video care</span></div></div></section>

        <section className="testimonials"><div className="section-heading"><div><p className="eyebrow">PATIENT NOTES</p><h2>Progress worth<br /><em>talking about.</em></h2></div><div className="review-mark">“</div></div><div className="testimonial-grid">{testimonials.map((item) => <article className="testimonial" key={item.name}><p>“{item.quote}”</p><div><strong>{item.name}</strong><span>{item.detail}</span></div></article>)}</div></section>

        <section className="contact-section" id="contact"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Start with a<br /><em>conversation.</em></h2></div><div className="contact-details"><p>Home visits available across Pune and nearby areas, subject to availability.</p><a href="tel:+918401423844"><Phone size={17} /> +91 84014 23844</a><a href="mailto:shreyaparmar623@gmail.com"><Mail size={17} />shreyaparmar623@gmail.com</a><div className="contact-actions"><button className="button" onClick={() => setShowBooking(true)}>Book a consultation <ArrowUpRight size={17} /></button><button className="button button-secondary" onClick={openDirectWhatsApp}><MessageCircle size={17} /> Book via WhatsApp</button></div></div></section>
      </main>

      <footer><div className="brand"><span>SP</span><div><strong>Rebounce</strong><small>Personalized Physiotherapy</small></div></div><p>Personalised physiotherapy.<br />Meaningful recovery.</p><div className="footer-links"><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a><a href="https://instagram.com"><Instagram size={16} /> Instagram</a><a href="/admin">Admin</a></div><small className="copyright">© 2026 Rebounce. All rights reserved.</small></footer>

      {showBooking && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowBooking(false)}><div className="booking-modal"><button className="close-modal" onClick={() => setShowBooking(false)} aria-label="Close booking form"><X /></button>{submitted ? <div className="success-state"><Check size={28} /><p className="eyebrow">ENQUIRY RECEIVED</p><h2>Thank you,<br /><em>{booking.patientName || 'we have it.'}</em></h2><p>Dr. Shreya's team will call you to understand your requirement and confirm the next step.</p><button className="button" onClick={() => { setShowBooking(false); setSubmitted(false) }}>Done</button></div> : <><p className="eyebrow">BOOK A CONSULTATION</p><h2>Let’s find the<br /><em>right next step.</em></h2><p className="modal-intro">Share a few details. This starts with an information call, not treatment over the phone.</p><form onSubmit={submitBooking}><label>Your name<input required name="patientName" value={booking.patientName} onChange={updateBooking} placeholder="Full name" /></label><div className="form-row"><label>Phone number<input required name="phone" value={booking.phone} onChange={updateBooking} placeholder="+91" /></label><label>Email <span>(required)</span><input required type="email" name="email" value={booking.email} onChange={updateBooking} placeholder="you@email.com" /></label></div><label>Preferred care<select name="serviceType" value={booking.serviceType} onChange={updateBooking}><option>Video Physiotherapy</option><option>Home Physiotherapy</option></select></label><div className="form-row"><label>Preferred date<input required type="date" name="preferredDate" value={booking.preferredDate} onChange={updateBooking} /></label><label>Preferred time<select required name="preferredTime" value={booking.preferredTime} onChange={updateBooking}><option value="">Select a time</option><option>Morning (9-12)</option><option>Afternoon (12-3)</option><option>Evening (3-6)</option></select></label></div>{booking.serviceType === 'Home Physiotherapy' && <label>Home visit address<input name="address" value={booking.address} onChange={updateBooking} placeholder="Area and full address" /></label>}<label>What would you like help with?<textarea name="concern" value={booking.concern} onChange={updateBooking} rows="3" placeholder="A short description is enough" /></label><label className="consent"><input required type="checkbox" /> I consent to being contacted about this enquiry.</label><button className="button" type="submit">Send enquiry <ArrowUpRight size={17} /></button></form></>}</div></div>}
    </div>
  )
}

export default App

createRoot(document.getElementById('root')).render(<App />)
