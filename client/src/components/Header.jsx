import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShoppingCart, User, Menu, X, ChevronDown, Phone } from 'lucide-react';
import api from '../lib/api.js';
import { useAuth } from '../store/auth.js';
import { useCart } from '../store/cart.js';
import { useLocation } from '../store/location.js';
import { inr } from '../lib/format.js';
import LocationModal from './LocationModal.jsx';

export default function Header() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { cart, setOpen } = useCart();
  const { location } = useLocation();
  const [q, setQ] = useState('');
  const [suggest, setSuggest] = useState({ products: [], categories: [] });
  const [focused, setFocused] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const timer = useRef(null);

  const count = cart.items.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!q.trim()) return setSuggest({ products: [], categories: [] });
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/catalog/search/suggest', { params: { q } });
        setSuggest({ products: data.products, categories: data.categories });
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setFocused(false);
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
          <button className="lg:hidden" onClick={() => setMobileMenu((v) => !v)} aria-label="Menu">
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/logo.svg" alt="Chotulal Sweets" className="h-9 w-9" />
            <div className="hidden leading-tight sm:block">
              <div className="font-brand text-lg font-bold text-brand-700">Chotulal Sweets</div>
              <div className="text-[11px] text-slate-400">Bijapur Locality</div>
            </div>
          </Link>

          <button onClick={() => setLocOpen(true)} className="hidden max-w-[180px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-left text-xs hover:border-brand-300 md:flex">
            <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="min-w-0">
              <span className="block font-semibold text-slate-700">Deliver to</span>
              <span className="block truncate text-slate-400">{location?.line1 ? location.line1.slice(0, 22) : 'Set location'}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          <form onSubmit={submitSearch} className="relative flex-1">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-cream-50 px-3 py-2 focus-within:border-brand-500 focus-within:bg-white">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                placeholder="Search sweets, namkeen, snacks…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            {focused && (q.trim() && (suggest.products.length || suggest.categories.length)) && (
              <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-soft">
                {suggest.categories.map((c) => (
                  <Link key={c.id} to={`/category/${c.slug}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream-50" onMouseDown={() => setQ('')}>
                    <span className="text-base">{c.icon || '🍬'}</span> {c.name} <span className="text-xs text-slate-400">category</span>
                  </Link>
                ))}
                {suggest.products.map((p) => (
                  <Link key={p.id} to={`/product/${p.slug}`} className="flex items-center gap-3 px-4 py-2 hover:bg-cream-50" onMouseDown={() => setQ('')}>
                    <img src={p.images?.[0]?.url} alt="" className="h-9 w-9 rounded-lg object-cover bg-cream-100" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                    <span className="flex-1 text-sm">{p.name}</span>
                    <span className="text-sm font-semibold text-slate-700">{inr(p.minPrice)}</span>
                  </Link>
                ))}
              </div>
            )}
          </form>

          <button onClick={() => setLocOpen(true)} className="flex items-center gap-1 md:hidden" aria-label="Location">
            <MapPin className="h-5 w-5 text-brand-600" />
          </button>

          {user ? (
            <Link to={user.role === 'ADMIN' ? '/admin' : user.role === 'DELIVERY' ? '/delivery' : '/account'} className="hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:flex">
              <User className="h-5 w-5" /> {user.name?.split(' ')[0] || 'Account'}
            </Link>
          ) : (
            <Link to="/login" className="hidden items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:flex">
              <User className="h-5 w-5" /> Login
            </Link>
          )}

          <button onClick={() => setOpen(true)} className="relative flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-white hover:bg-brand-700">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="hidden text-sm font-semibold sm:block">{count}</span>}
            {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-[11px] font-bold sm:hidden">{count}</span>}
          </button>
        </div>

        {mobileMenu && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link to="/products" onClick={() => setMobileMenu(false)} className="rounded-xl bg-cream-50 px-3 py-2">All Products</Link>
              <Link to="/search" onClick={() => setMobileMenu(false)} className="rounded-xl bg-cream-50 px-3 py-2">Search</Link>
              <Link to="/account" onClick={() => setMobileMenu(false)} className="rounded-xl bg-cream-50 px-3 py-2">{user ? 'My Account' : 'Login'}</Link>
              <Link to="/orders" onClick={() => setMobileMenu(false)} className="rounded-xl bg-cream-50 px-3 py-2">My Orders</Link>
            </div>
          </div>
        )}
      </header>

      <LocationModal open={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}
