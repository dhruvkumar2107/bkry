import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock, Instagram, Facebook } from 'lucide-react';

export default function Footer({ settings = {} }) {
  return (
    <footer className="mt-12 border-t border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-9 w-9" />
            <span className="font-brand text-lg font-bold text-brand-700">{settings.shopName || 'Chotulal Sweets'}</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">{settings.tagline || 'Fresh Sweets, Made with Love'}</p>
          <div className="mt-4 flex gap-3 text-slate-400">
            <Instagram className="h-5 w-5" /> <Facebook className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Shop</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/products" className="hover:text-brand-700">All Products</Link></li>
            <li><Link to="/category/special-sweets" className="hover:text-brand-700">Special Sweets</Link></li>
            <li><Link to="/category/namkeen-sweets" className="hover:text-brand-700">Namkeen</Link></li>
            <li><Link to="/category/veg" className="hover:text-brand-700">Veg Snacks</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li><Link to="/account" className="hover:text-brand-700">My Account</Link></li>
            <li><Link to="/orders" className="hover:text-brand-700">My Orders</Link></li>
            <li><Link to="/cart" className="hover:text-brand-700">Cart</Link></li>
            <li><Link to="/admin/login" className="hover:text-brand-700">Admin / Staff</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-500">
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-600" /> {settings.address || 'Bijapur Locality'}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-600" /> {settings.contactPhone || '+91 90000 00000'}</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" /> {settings.openTime || '08:00'} – {settings.closeTime || '22:00'}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {settings.shopName || 'Chotulal Sweets'}. All rights reserved. · Sample prices are configurable in the admin panel.
      </div>
    </footer>
  );
}
