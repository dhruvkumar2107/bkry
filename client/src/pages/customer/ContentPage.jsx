import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronDown, Phone, Mail, MapPin, Clock, ShieldCheck, Truck, RefreshCw, HelpCircle, FileText, XCircle, MessageCircle } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { PageLoader } from '../../components/ui.jsx';

function BranchCard({ name, address, phone, email, googleMaps }) {
  return (
    <div className="card p-6 sm:p-8 bg-cream-50 border border-cream-200 rounded-xl hover:border-brand-300 transition">
      <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-3">{name}</h3>
      <address className="text-sm text-slate-600 line-clamp-3">
        {address}
      </address>
      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${phone.replace(/\s+/g, '')}`}
          className="flex items-center gap-1.5 text-brand-700 hover:underline transition"
        >
          <Phone className="h-4 w-4" />
          {phone}
        </a>
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-1.5 text-brand-700 hover:underline transition"
        >
          <Mail className="h-4 w-4" />
          {email}
        </a>
      </div>
      <div className="mt-3">
        <a
          href={googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline transition flex items-center gap-1.5"
        >
          <MapPin className="h-3 w-3" />
          View on Google Maps
        </a>
      </div>
    </div>
  );
}

// Renders the light markdown used in CMS content: "## "/"### " headings,
// "- " bullet lists, **bold** and blank-line separated paragraphs.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong> : part
  );
}

function RichText({ text }) {
  const blocks = [];
  let list = null;
  (text || '').split('\n').forEach((raw) => {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      if (!list) blocks.push((list = { type: 'ul', items: [] }));
      list.items.push(line.slice(2));
      return;
    }
    list = null;
    if (!line) return;
    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) blocks.push({ type: heading[1].length === 2 ? 'h2' : 'h3', text: heading[2] });
    else blocks.push({ type: 'p', text: line });
  });
  return blocks.map((b, i) => {
    if (b.type === 'ul') {
      return (
        <ul key={i} className="my-3 list-disc space-y-1.5 pl-5">
          {b.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
    }
    if (b.type === 'h2') return <h2 key={i} className="mt-6 mb-2 text-lg font-bold text-slate-800 first:mt-0">{renderInline(b.text)}</h2>;
    if (b.type === 'h3') return <h3 key={i} className="mt-5 mb-1.5 text-base font-bold text-slate-800 first:mt-0">{renderInline(b.text)}</h3>;
    return <p key={i} className="my-3 first:mt-0">{renderInline(b.text)}</p>;
  });
}

export default function ContentPage() {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    orderNumber: '',
    subject: '',
    message: '',
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/catalog/settings/public')
      .then(({ data }) => setSettings(data.settings))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading content…" />;

  const cleanPath = pathname.replace(/^\//, '');

  let title = 'Information';
  let Icon = FileText;
  let content = '';

  if (cleanPath === 'about') {
    title = settings?.aboutUsTitle || 'About Chotulal Sweets';
    Icon = ShieldCheck;
    content = settings?.aboutUsContent || '';
  } else if (cleanPath === 'delivery-policy') {
    title = 'Delivery & Shipping Policy';
    Icon = Truck;
    content = settings?.deliveryPolicy || '';
  } else if (cleanPath === 'return-policy') {
    title = 'Return & Refund Policy';
    Icon = RefreshCw;
    content = settings?.returnPolicy || '';
  } else if (cleanPath === 'terms') {
    title = 'Terms & Conditions';
    Icon = FileText;
    content = settings?.termsConditions || '';
  } else if (cleanPath === 'privacy') {
    title = 'Privacy Policy';
    Icon = ShieldCheck;
    content = settings?.privacyPolicy || '';
  } else if (cleanPath === 'faqs') {
    title = 'Frequently Asked Questions';
    Icon = HelpCircle;
  } else if (cleanPath === 'contact') {
    title = 'Contact Us';
    Icon = Phone;
  }

  const faqs = Array.isArray(settings?.faqList) && settings.faqList.length > 0 ? settings.faqList : [
    { question: 'What are your delivery hours?', answer: 'We deliver daily between 8:00 AM and 10:00 PM.' },
    { question: 'Do you use 100% pure ghee?', answer: 'Yes, all our authentic traditional sweets are crafted with pure desi ghee.' },
    { question: 'How can I track my order?', answer: 'Once you place an order, you will receive a tracking link and live updates on your order tracking page.' },
    { question: 'What payment methods are supported?', answer: 'We support online payments (Cards, UPI, Netbanking) via Razorpay as well as Cash on Delivery.' },
  ];

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactSubmitted(false);
    
    const name = e.target.elements.name.value.trim();
    const phone = e.target.elements.phone.value.trim();
    const email = e.target.elements.email.value.trim();
    const orderNumber = e.target.elements.orderNumber?.value.trim() || undefined;
    const subject = e.target.elements.subject?.value.trim() || '';
    const message = e.target.elements.message.value.trim();
    
    if (!name || !phone || !email || !message) {
      setContactError('Please fill in all required fields (name, phone, email, message).');
      return;
    }
    
    if (!phone.replace(/\s+/g, '').match(/^\+?[6-9]\d{6,14}$/)) {
      setContactError('Please enter a valid phone number.');
      return;
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setContactError('Please enter a valid email address.');
      return;
    }
    
    setContactSubmitted(true);
    
    try {
      await api.post('/catalog/contact', {
        name,
        phone,
        email,
        orderNumber,
        subject,
        message,
      });
      setContactForm({
        name: '',
        phone: '',
        email: '',
        orderNumber: '',
        subject: '',
        message: '',
      });
      setContactSubmitted(true);
    } catch (err) {
      const errorMsg = apiError(err) || 'Failed to send message. Please try again.';
      setContactError(errorMsg);
      setContactSubmitted(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6 sm:py-10">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{title}</span>
      </nav>

      {/* Header Banner */}
      <div className="card mb-8 border-brand-100 bg-gradient-to-r from-cream-50 to-brand-50/40 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-sm">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-brand text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {settings?.shopName || 'Chotulal Sweets'} · Customer Support & Information
            </p>
          </div>
        </div>
      </div>

      {/* FAQs Page */}
      {cleanPath === 'faqs' ? (
        <div className="card space-y-3 p-6 sm:p-8">
          <p className="text-sm text-slate-500 mb-4">
            Find quick answers to common questions about our products, delivery, and payments.
          </p>
          <div className="divide-y divide-slate-100">
            {faqs.map((f, i) => (
              <div key={i} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 text-left font-semibold text-slate-800 hover:text-brand-700 transition"
                >
                  <span className="text-sm sm:text-base">{f.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180 text-brand-600' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="mt-2.5 text-sm text-slate-600 leading-relaxed pl-1 animate-fade-in">
                    {f.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : cleanPath === 'contact' ? (
        /* Contact Us Page */
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Left column: Store info and contact form */}
          <div className="space-y-6 sm:space-y-0">
            {/* Store Information */}
            <div className="card space-y-4 p-6 sm:p-8">
              <h2 className="font-bold text-lg text-slate-800">Store Information</h2>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Address</p>
                    <p>{settings?.address || 'Bijapur Locality, Bijapur, Karnataka'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Phone</p>
                    <a href={`tel:${settings?.contactPhone || '+919741857227'}`} className="text-brand-700 hover:underline">
                      {settings?.contactPhone || '+91 97418 57227'}
                    </a>
                  </div>
                </div>

                {settings?.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Email</p>
                      <a href={`mailto:${settings.contactEmail}`} className="text-brand-700 hover:underline">
                        {settings.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 shrink-0 text-brand-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Business Hours</p>
                    <p>{settings?.openTime || '08:00'} – {settings?.closeTime || '22:00'} (Open all 7 days)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Branch Cards */}
            <div className="space-y-4">
              <BranchCard
                name="Main Branch"
                address="Ram Mandir Road, Vijayapur, Karnataka 586101"
                phone="+91 97418 57227"
                email="chotulalsweets@gmail.com"
                googleMaps="https://www.google.com/maps/search/?q=Ram+Mandal+Road+Vijayapur+Karnataka+586101"
              />
              <BranchCard
                name="Second Branch"
                address="Opposite District Court, Ustad Complex, Vijayapur, Karnataka 586101"
                phone="+91 97418 57227"
                email="chotulalsweets@gmail.com"
                googleMaps="https://www.google.com/maps/search/?q=Opposite+District+Court+Ustad+Complex+Vijayapur+Karnataka+586101"
              />
            </div>
          </div>

          {/* Right column: Contact Form */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg text-slate-800">Contact Us</h2>
            {contactSubmitted && (
              <div className="p-4 rounded-md text-center text-green-600 text-sm sm:text-base">
                <MessageCircle className="h-4 w-4 mb-2" /> {contactError ? contactError : 'Your message has been received. Our team will contact you soon.'}
              </div>
            )}
            {contactError && !contactSubmitted && (
              <div className="p-4 rounded-md text-center text-red-600 text-sm sm:text-base">
                <XCircle className="h-4 w-4 mb-2" /> {contactError}
              </div>
            )}
            <form
              onSubmit={handleContactSubmit}
              className="card p-6 sm:p-8 space-y-4 bg-slate-50 rounded-xl"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Your name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="input w-full rounded border border-slate-300 p-3 focusoutline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    placeholder="+91 98765 43210"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="input w-full rounded border border-slate-300 p-3 focusoutline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="input w-full rounded border border-slate-300 p-3 focusoutline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5">Order Number (optional)</label>
                  <input
                    type="text"
                    name="orderNumber"
                    placeholder="Order number if applicable"
                    value={contactForm.orderNumber}
                    onChange={(e) => setContactForm({ ...contactForm, orderNumber: e.target.value })}
                    className="input w-full rounded border border-slate-300 p-3 focusoutline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-700 mb-1.5">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    placeholder="e.g. Delivery query, Order issue, etc."
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="input w-full rounded border border-slate-300 p-3 focusoutline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1.5">Message</label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  placeholder="Write your message here..."
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="input w-full rounded border border-slate-300 p-3 resize-none focusoutline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-3 rounded text-lg font-medium"
              >
                {contactSubmitted ? 'Sent →' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Standard Policy / About Us Page */
        <div className="card p-6 sm:p-8">
          <div className="max-w-none text-slate-700 text-sm sm:text-base leading-relaxed">
            <RichText text={content} />
          </div>
          <div className="mt-8 border-t border-slate-100 pt-5 flex items-center justify-between text-xs text-slate-400">
            <span>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
            <Link to="/products" className="font-semibold text-brand-700 hover:underline">
              Continue Shopping →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
