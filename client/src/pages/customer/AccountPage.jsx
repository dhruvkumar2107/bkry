import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, Package, Plus, Trash2, User } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { toast } from '../../store/toast.js';
import { Field, Modal, ConfirmDialog, PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { inr, dateTime } from '../../lib/format.js';

export default function AccountPage() {
  const { user, logout, updateProfile, ready } = useAuth();
  const nav = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('orders');
  const [name, setName] = useState('');
  const [addrOpen, setAddrOpen] = useState(false);
  const [delId, setDelId] = useState(null);
  const [form, setForm] = useState({ label: 'Home', line1: '', line2: '', landmark: '', city: 'Bijapur', pincode: '', isDefault: false });

  useEffect(() => { if (user) setName(user.name || ''); }, [user]);
  useEffect(() => {
    if (!user) return;
    api.get('/auth/addresses').then(({ data }) => setAddresses(data.addresses));
    api.get('/orders/mine').then(({ data }) => setOrders(data.orders));
  }, [user]);

  if (!ready) return <PageLoader />;
  if (!user) { nav('/login'); return null; }

  const saveProfile = async () => {
    try { await updateProfile({ name }); toast.success('Profile updated'); } catch (e) { toast.error(apiError(e)); }
  };

  const addAddress = async () => {
    if (!form.line1) return toast.error('Enter an address');
    try {
      const { data } = await api.post('/auth/addresses', form);
      setAddresses((a) => [data.address, ...a]);
      setAddrOpen(false);
      setForm({ label: 'Home', line1: '', line2: '', landmark: '', city: 'Bijapur', pincode: '', isDefault: false });
      toast.success('Address added');
    } catch (e) { toast.error(apiError(e)); }
  };

  const removeAddress = async (id) => {
    try { await api.delete(`/auth/addresses/${id}`); setAddresses((a) => a.filter((x) => x.id !== id)); toast.success('Address removed'); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="card p-5 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">{(user.name || user.phone || 'U')[0]}</div>
          <h2 className="mt-3 font-semibold">{user.name || 'Chotulal Customer'}</h2>
          <p className="text-sm text-slate-400">{user.phone}</p>
          <button onClick={async () => { await logout(); nav('/'); }} className="btn-outline mt-4 w-full"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
        <div className="card p-2">
          {[
            { key: 'orders', label: 'My Orders', icon: Package },
            { key: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { key: 'profile', label: 'Profile', icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab === key ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </aside>

      <div>
        {tab === 'orders' && (
          <div>
            <h1 className="mb-4 font-brand text-2xl font-bold">My Orders</h1>
            {orders.length === 0 ? <EmptyState title="No orders yet" subtitle="Your orders will appear here." action={<Link to="/products" className="btn-primary">Start shopping</Link>} /> : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{o.orderNumber}</p>
                        <p className="text-xs text-slate-400">{dateTime(o.placedAt)} · {o.items.length} items</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold">{inr(o.total)}</span>
                      <Link to={`/track-order/${o.orderNumber}`} className="btn-outline py-1.5 text-xs">Track order</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'addresses' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-brand text-2xl font-bold">Saved Addresses</h1>
              <button onClick={() => setAddrOpen(true)} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> Add address</button>
            </div>
            {addresses.length === 0 ? <EmptyState title="No saved addresses" subtitle="Add an address for faster checkout." /> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {addresses.map((a) => (
                  <li key={a.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold">{a.label} {a.isDefault && <span className="chip bg-brand-100 text-brand-700">Default</span>}</p>
                      <button onClick={() => setDelId(a.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city} {a.pincode}</p>
                    {a.landmark && <p className="text-xs text-slate-400">Landmark: {a.landmark}</p>}
                    {a.lat != null && <a href={`https://www.google.com/maps?q=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-brand-700">View on map →</a>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="max-w-md">
            <h1 className="mb-4 font-brand text-2xl font-bold">Profile</h1>
            <div className="card space-y-4 p-5">
              <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Mobile number"><input className="input bg-slate-50" value={user.phone || ''} disabled /></Field>
              <button onClick={saveProfile} className="btn-primary">Save changes</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title="Add address">
        <div className="space-y-3">
          <Field label="Label"><input className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field>
          <Field label="Address line 1"><input className="input" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} /></Field>
          <Field label="Address line 2"><input className="input" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Landmark"><input className="input" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} /></Field>
            <Field label="Pincode"><input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="h-4 w-4" /> Set as default</label>
          <button onClick={addAddress} className="btn-primary w-full">Save address</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => removeAddress(delId)} title="Delete address?" message="This address will be removed from your account." confirmLabel="Delete" danger />
    </div>
  );
}
