import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ShoppingCart, User, Menu, X, ChevronDown, ClipboardList } from 'lucide-react';
import api from '../lib/api.js';
import { useAuth } from '../store/auth.js';
import { useCart } from '../store/cart.js';
import { useLocation } from '../store/location.js';
import { inr, PLACEHOLDER } from '../lib/format.js';
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
  const locLabel = location?.line1 ? location.line1 : location?.city || 'Set location';
  const accountTo = user ? (user.role === 'ADMIN' ? '/admin' : user.role === 'DELIVERY' ? '/delivery' : '/account') : '/login';

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
    setMobileMenu(false);
    nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const hasSuggestions = q.trim() && (suggest.products.length || suggest.categories.length);

  const Suggestions = () =>
    focused && hasSuggestions ? (
      <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-soft">
        {suggest.categories.map((c) => (
          <Link key={c.id} to={`/category/${c.slug}`} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-50" onMouseDown={() => setQ('')}>
            <span className="text-base">{c.icon || '🍬'}</span> {c.name} <span className="ml-auto text-xs text-slate-400">category</span>
          </Link>
        ))}
        {suggest.products.map((p) => (
          <Link key={p.id} to={`/product/${p.slug}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-cream-50" onMouseDown={() => setQ('')}>
            <img src={p.images?.[0]?.url || PLACEHOLDER} alt="" className="h-9 w-9 rounded-lg bg-cream-100 object-cover" />
            <span className="flex-1 truncate text-sm">{p.name}</span>
            <span className="text-sm font-semibold text-slate-700">{inr(p.minPrice)}</span>
          </Link>
        ))}
      </div>
    ) : null;

  const SearchBar = ({ autoId }) => (
    <form onSubmit={submitSearch} className="relative w-full" role="search">
      <label htmlFor={autoId} className="sr-only">Search sweets, namkeen and snacks</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-2 transition-all focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          id={autoId}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search sweets, namkeen and snacks"
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Suggestions />
    </form>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
        <div className="container-app">
          {/* Row 1: Brand & Top Actions */}
          <div className="flex h-14 items-center justify-between gap-2 sm:h-16">
            <div className="flex items-center gap-2 min-w-0">
              <button
                className="icon-btn md:hidden"
                onClick={() => setMobileMenu((v) => !v)}
                aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenu}
              >
                {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link to="/" className="flex shrink-0 items-center gap-2 group" aria-label="Chotuwala Sweets home">
                <img src="/logo.svg" alt="" className="h-8 w-8 sm:h-9 sm:w-9 transition-transform group-hover:scale-105 w-24" />
                <div className="leading-none flex items-center gap-2">
                  <span className="block font-bold text-base sm:text-lg text-brand-700 tracking-tight flex-1 shrink-0">Chotuwala Sweets</span>
                  <span className="block text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 flex-1 shrink-0">Fresh Mithai & Namkeen</span>
                </div>
              </Link>
            </div>

            {/* Desktop Location Selector */}
            <button
              onClick={() => setLocOpen(true)}
              className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-left text-xs transition hover:border-brand-500 hover:bg-white"
            >
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <div className="min-w-0 max-w-[160px]">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Deliver to</span>
                <span className="block truncate font-medium text-slate-700">{locLabel}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            </button>

            {/* Desktop Search */}
            <div className="hidden flex-1 max-w-lg mx-4 md:block">
              <SearchBar autoId="search-desktop" />
            </div>

            {/* Right Action Icons: Mobile Location + Account + Cart */}
            <div className="flex items-center gap-3 sm:w-full">
              {/* Mobile Location Selector Button */}
              <button
                onClick={() => setLocOpen(true)}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 transition hover:border-brand-500 active:bg-slate-100 lg:hidden"
                aria-label={`Select delivery location. Currently: ${locLabel}`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="flex-1 truncate font-medium text-[11px] sm:text-xs">{locLabel}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" aria-hidden="true" />
              </button>

              <Link
                to={accountTo}
                className="icon-btn hidden sm:inline-grid"
                aria-label={user ? 'My account' : 'Login'}
              >
                <User className="h-5 w-5" />
              </Link>

              <button
                onClick={() => setOpen(true)}
                className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-white shadow-sm transition hover:bg-brand-700 active:scale-95"
                aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
              >
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline text-xs font-semibold">Cart</span>
                {count > 0 && (
                  <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-gold-500 px-1 text-[11px] font-bold text-white shadow-xs">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Mobile Search Bar */}
          <div className="pb-2.5 md:hidden">
            <SearchBar autoId="search-mobile" />
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenu && (
          <div className="border-t border-slate-100 bg-white shadow-lg md:hidden animate-fade-in">
            <div className="container-app grid grid-cols-2 gap-2 py-3 text-sm">
              <Link to="/products" onClick={() => setMobileMenu(false)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                All Products
              </Link>
              <Link to={accountTo} onClick={() => setMobileMenu(false)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                <User className="h-4 w-4" /> {user ? 'My Account' : 'Login'}
              </Link>
              <Link to="/orders" onClick={() => setMobileMenu(false)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                <ClipboardList className="h-4 w-4" /> My Orders
              </Link>
              <Link to="/cart" onClick={() => setMobileMenu(false)} className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                <span>Shopping Cart</span>
                {count > 0 && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{count}</span>}
              </Link>
            </div>
          </div>
        )}
      </header>

      <LocationModal open={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}
