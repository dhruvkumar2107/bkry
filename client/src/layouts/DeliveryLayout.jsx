import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ClipboardList, Truck, History, LogOut } from 'lucide-react';
import { useAuth } from '../store/auth.js';
import Toaster from '../components/Toaster.jsx';

export default function DeliveryLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const doLogout = async () => { await logout(); nav('/delivery/login'); };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-16">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-700 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="text-sm font-bold">Chotulal Delivery</div>
            <div className="text-[11px] text-brand-200">{user?.name}</div>
          </div>
        </div>
        <button onClick={doLogout} className="rounded-lg p-2 hover:bg-brand-600"><LogOut className="h-5 w-5" /></button>
      </header>

      <main className="flex-1 p-3">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white">
        {[
          { to: '/delivery', label: 'Assigned', icon: ClipboardList, end: true },
          { to: '/delivery/active', label: 'Active', icon: Truck },
          { to: '/delivery/history', label: 'History', icon: History },
        ].map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${isActive ? 'text-brand-700' : 'text-slate-400'}`}>
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>
      <Toaster />
    </div>
  );
}
