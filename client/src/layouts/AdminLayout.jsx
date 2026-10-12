import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Image, ShoppingCart, Users, Boxes,
  MapPinned, Bike, BarChart3, Settings, LogOut, Menu, X, Store,
} from 'lucide-react';
import { useAuth } from '../store/auth.js';
import Toaster from '../components/Toaster.jsx';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/homepage', label: 'Homepage', icon: Image },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/live-deliveries', label: 'Live Deliveries', icon: MapPinned },
  { to: '/admin/delivery-boys', label: 'Delivery Boys', icon: Bike },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); nav('/admin/login'); };

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <img src="/logo.svg" alt="" className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-brand text-base font-bold text-white">Chotulal</div>
          <div className="text-[11px] text-brand-200">Admin Panel</div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-800'}`}
          >
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-brand-800 p-3">
        <button onClick={doLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-100 hover:bg-brand-800">
          <LogOut style={{ width: 18, height: 18 }} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 bg-brand-900 lg:block">{Sidebar}</aside>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-900 lg:hidden">{Sidebar}</aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="icon-btn lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <h1 className="text-base font-semibold text-slate-800">Chotulal Sweets</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 text-sm text-slate-500 hover:text-brand-700 sm:flex"><Store className="h-4 w-4" /> View store</a>
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {(user?.name || 'A')[0]}
              </div>
              <span className="hidden text-sm font-medium text-slate-600 sm:block">{user?.name}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
