import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronDown, Phone, Mail, MapPin, Clock, ShieldCheck, Truck, RefreshCw, HelpCircle, FileText } from 'lucide-react';
import api from '../../lib/api.js';
import { PageLoader } from '../../components/ui.jsx';

export default function ContentPage() {
  const { pathname } = useLocation();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);

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
                  <a href={`tel:${settings?.contactPhone || '+919000000000'}`} className="text-brand-700 hover:underline">
                    {settings?.contactPhone || '+91 90000 00000'}
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

          <div className="card p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="font-bold text-lg text-slate-800">Delivery Coverage</h2>
              <p className="mt-2 text-sm text-slate-600">
                We provide fast doorstep delivery across our designated service zones:
              </p>
              <div className="mt-4 rounded-xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-900 leading-relaxed font-medium">
                {settings?.deliveryZones || 'Bijapur Locality, Bijapur City'}
              </div>
            </div>
            <div className="mt-6">
              <Link to="/products" className="btn-primary w-full text-center">
                Browse Fresh Products
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Policy / About Us Page */
        <div className="card p-6 sm:p-8">
          <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {content}
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
