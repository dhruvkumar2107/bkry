import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, Instagram, Facebook, MessageCircle, Mail, Twitter } from 'lucide-react';
import { to12h } from '../lib/format.js';

export default function Footer({ settings = {} }) {
  const shopName = settings?.shopName || 'Chotulal Sweets';
  const tagline = settings?.tagline || 'Fresh Sweets, Made with Love';
  const logoSrc = settings?.logoUrl || '/logo.svg';

  return (
    <footer className="mt-12 border-t border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-5">
        {/* Brand identity */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <img
              src={logoSrc}
              alt={shopName}
              className="h-9 w-9 object-contain"
              onError={(e) => {
                e.currentTarget.src = '/logo.svg';
              }}
            />
            <span className="font-brand text-xl font-bold text-brand-700">{shopName}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500 max-w-sm">{tagline}</p>
          {settings?.footerText && (
            <p className="mt-2 text-xs text-slate-400 max-w-sm">{settings.footerText}</p>
          )}

          <div className="mt-4 flex items-center gap-3 text-slate-400">
            {settings?.socialInstagram && (
              <a
                href={settings.socialInstagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="hover:text-brand-600 transition"
              >
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {settings?.socialFacebook && (
              <a
                href={settings.socialFacebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="hover:text-brand-600 transition"
              >
                <Facebook className="h-5 w-5" />
              </a>
            )}
            {settings?.socialWhatsapp && (
              <a
                href={`https://wa.me/${settings.socialWhatsapp.replace(/\+/g, '')}`}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="hover:text-green-600 transition"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
            {settings?.socialTwitter && (
              <a
                href={settings.socialTwitter}
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter / X"
                className="hover:text-slate-800 transition"
              >
                <Twitter className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>

        {/* Shop links */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/products" className="hover:text-brand-700 transition">All Products</Link></li>
            <li><Link to="/category/special-sweets" className="hover:text-brand-700 transition">Special Sweets</Link></li>
            <li><Link to="/category/regular-sweets" className="hover:text-brand-700 transition">Regular Sweets</Link></li>
            <li><Link to="/category/namkeen-sweets" className="hover:text-brand-700 transition">Namkeen & Savouries</Link></li>
            <li><Link to="/category/veg" className="hover:text-brand-700 transition">Veg Snacks</Link></li>
          </ul>
        </div>

        {/* Customer Service & Policies */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Help & Policies</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/about" className="hover:text-brand-700 transition">About Us</Link></li>
            <li><Link to="/delivery-policy" className="hover:text-brand-700 transition">Delivery Policy</Link></li>
            <li><Link to="/return-policy" className="hover:text-brand-700 transition">Return & Refund</Link></li>
            <li><Link to="/terms" className="hover:text-brand-700 transition">Terms & Conditions</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-700 transition">Privacy Policy</Link></li>
            <li><Link to="/faqs" className="hover:text-brand-700 transition">FAQs</Link></li>
          </ul>
        </div>

        {/* Store Contact & Hours */}
        <div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-xs">Contact & Hours</h4>
          <ul className="mt-3 space-y-2.5 text-sm text-slate-500">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
              <span>{settings?.address || 'Bijapur Locality, Bijapur'}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-brand-600" />
              <a href={`tel:${settings?.contactPhone || '+919741857227'}`} className="hover:text-brand-700">
                {settings?.contactPhone || '+91 97418 57227'}
              </a>
            </li>
            {settings?.contactEmail && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-brand-600" />
                <a href={`mailto:${settings.contactEmail}`} className="hover:text-brand-700 truncate">
                  {settings.contactEmail}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-brand-600" />
              <span>{to12h(settings?.openTime || '08:00')} – {to12h(settings?.closeTime || '22:00')}, all 7 days</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {shopName}. All rights reserved. Handcrafted Indian Sweets & Namkeen.
      </div>
    </footer>
  );
}
