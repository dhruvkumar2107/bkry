import { useEffect, useState } from 'react';
import { Plus, Pencil, Bike, MapPin, Phone } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { dateTime, timeAgo, mapsLink } from '../../lib/format.js';
import { PageLoader, Modal, Field, EmptyState } from '../../components/ui.jsx';

const empty = () => ({ name: '', phone: '', email: '', password: '', vehicleType: 'Bike', vehicleNumber: '' });

export default function AdminDeliveryBoys() {
  const [boys, setBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/admin/delivery/boys').then(({ data }) => setBoys(data.boys)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => setEditing({ ...empty(), _new: true });
  const openEdit = (b) => setEditing({ name: b.name, phone: b.phone, email: b.email || '', password: '', isActive: b.isActive, vehicleType: b.profile?.vehicleType || '', vehicleNumber: b.profile?.vehicleNumber || '' });

  const save = async () => {
    if (!editing.name || !editing.phone) return toast.error('Name and phone are required');
    setSaving(true);
    try {
      if (editing._new) {
        if (!editing.password) { setSaving(false); return toast.error('Password is required for new riders'); }
        await api.post('/admin/delivery/boys', editing);
      } else {
        await api.patch(`/admin/delivery/boys/${editing.id}`, editing);
      }
      toast.success('Saved'); setEditing(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const toggleActive = async (b) => {
    try { await api.patch(`/admin/delivery/boys/${b.id}`, { isActive: !b.isActive }); toast.success('Updated'); load(); } catch (e) { toast.error(apiError(e)); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-2xl font-bold">Delivery Partners</h1>
        <button onClick={openCreate} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> Add partner</button>
      </div>

      {boys.length === 0 ? <EmptyState title="No delivery partners yet" action={<button onClick={openCreate} className="btn-primary">Add the first one</button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boys.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700"><Bike className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold">{b.name}</p>
                    <p className="text-xs text-slate-400">{b.profile?.vehicleType || 'Bike'} {b.profile?.vehicleNumber ? `· ${b.profile.vehicleNumber}` : ''}</p>
                  </div>
                </div>
                {b.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-red-100 text-red-600">Inactive</span>}
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {b.phone}</p>
                {b.lastLocation && <p className="flex items-center gap-2 text-xs"><MapPin className="h-3.5 w-3.5" /> <a href={mapsLink(b.lastLocation.lat, b.lastLocation.lng)} target="_blank" rel="noreferrer" className="text-brand-700">Last seen {timeAgo(b.lastLocation.at)}</a></p>}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-cream-50 py-2"><p className="font-bold text-slate-800">{b.stats.assigned}</p><p className="text-[11px] text-slate-400">Assigned</p></div>
                <div className="rounded-xl bg-amber-50 py-2"><p className="font-bold text-amber-700">{b.stats.active}</p><p className="text-[11px] text-slate-400">Active</p></div>
                <div className="rounded-xl bg-green-50 py-2"><p className="font-bold text-green-700">{b.stats.delivered}</p><p className="text-[11px] text-slate-400">Delivered</p></div>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(b)} className="btn-outline flex-1 py-1.5 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <button onClick={() => toggleActive(b)} className={`flex-1 rounded-xl py-1.5 text-xs font-medium ${b.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>{b.isActive ? 'Disable' : 'Enable'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?._new ? 'Add delivery partner' : 'Edit delivery partner'} size="md">
        {editing && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Phone"><input className="input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            </div>
            <Field label="Email (optional)"><input className="input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label={editing._new ? 'Password' : 'New password (leave blank to keep)'}><input type="password" className="input" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vehicle type"><input className="input" value={editing.vehicleType} onChange={(e) => setEditing({ ...editing, vehicleType: e.target.value })} /></Field>
              <Field label="Vehicle number"><input className="input" value={editing.vehicleNumber} onChange={(e) => setEditing({ ...editing, vehicleNumber: e.target.value })} /></Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
