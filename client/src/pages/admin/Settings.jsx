import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Ticket, ShieldCheck, ScrollText, Store, Palette } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr, dateTime } from '../../lib/format.js';
import { PageLoader, Field, Modal, EmptyState, ConfirmDialog } from '../../components/ui.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';

const TABS = [
  { key: 'shop', label: 'Shop & Delivery', icon: Store },
  { key: 'branding', label: 'Branding & Logos', icon: Palette },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'admins', label: 'Admins', icon: ShieldCheck },
  { key: 'audit', label: 'Audit log', icon: ScrollText },
];

const emptyCoupon = () => ({ code: '', description: '', type: 'PERCENT', value: 10, minOrder: 0, maxDiscount: null, isActive: true, usageLimit: null, startsAt: '', expiresAt: '' });

export default function AdminSettings() {
  const [tab, setTab] = useState('shop');
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couponEdit, setCouponEdit] = useState(null);
  const [adminEdit, setAdminEdit] = useState(null);
  const [delCoupon, setDelCoupon] = useState(null);

  const loadCore = async () => {
    const { data } = await api.get('/admin/settings');
    setSettings(data.settings); setIntegrations(data.integrations);
  };
  useEffect(() => {
    (async () => {
      try {
        await loadCore();
        const [c, a] = await Promise.all([api.get('/admin/settings/coupons'), api.get('/admin/settings/admins')]);
        setCoupons(c.data.coupons); setAdmins(a.data.admins);
      } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (tab === 'audit') api.get('/admin/settings/audit').then(({ data }) => setLogs(data.logs));
  }, [tab]);

  const saveSettings = async () => {
    setSaving(true);
    try { const { data } = await api.patch('/admin/settings', settings); setSettings(data.settings); toast.success('Settings saved'); }
    catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const saveCoupon = async () => {
    try {
      const payload = { ...couponEdit, startsAt: couponEdit.startsAt || null, expiresAt: couponEdit.expiresAt || null };
      if (couponEdit.id) await api.put(`/admin/settings/coupons/${couponEdit.id}`, payload);
      else await api.post('/admin/settings/coupons', payload);
      toast.success('Coupon saved'); setCouponEdit(null);
      const { data } = await api.get('/admin/settings/coupons'); setCoupons(data.coupons);
    } catch (e) { toast.error(apiError(e)); }
  };
  const removeCoupon = async (id) => { try { await api.delete(`/admin/settings/coupons/${id}`); toast.success('Deleted'); const { data } = await api.get('/admin/settings/coupons'); setCoupons(data.coupons); } catch (e) { toast.error(apiError(e)); } };

  const saveAdmin = async () => {
    try {
      if (adminEdit.id) await api.patch(`/admin/settings/admins/${adminEdit.id}`, adminEdit);
      else await api.post('/admin/settings/admins', adminEdit);
      toast.success('Saved'); setAdminEdit(null);
      const { data } = await api.get('/admin/settings/admins'); setAdmins(data.admins);
    } catch (e) { toast.error(apiError(e)); }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5 pb-16">
      <h1 className="font-brand text-2xl font-bold">Settings</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ${tab === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'branding' && settings && (
        <div className="card space-y-6 p-6">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">Website Branding & Assets</h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload and manage your store brand assets. Changes reflect immediately across desktop and mobile.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="label font-medium">Primary Storefront Logo</p>
              <p className="text-xs text-slate-400 mb-2">Used in header and footer across all pages.</p>
              <ImageUploader
                single
                images={settings.logoUrl ? [{ url: settings.logoUrl }] : []}
                onChange={(imgs) => setSettings({ ...settings, logoUrl: imgs[0]?.url || '' })}
              />
            </div>

            <div>
              <p className="label font-medium">Mobile Header Logo (optional)</p>
              <p className="text-xs text-slate-400 mb-2">Compact icon or crest for small mobile viewports.</p>
              <ImageUploader
                single
                images={settings.mobileLogoUrl ? [{ url: settings.mobileLogoUrl }] : []}
                onChange={(imgs) => setSettings({ ...settings, mobileLogoUrl: imgs[0]?.url || '' })}
              />
            </div>

            <div>
              <p className="label font-medium">Browser Favicon (optional)</p>
              <p className="text-xs text-slate-400 mb-2">Small 32x32 icon shown in browser tabs.</p>
              <ImageUploader
                single
                images={settings.faviconUrl ? [{ url: settings.faviconUrl }] : []}
                onChange={(imgs) => setSettings({ ...settings, faviconUrl: imgs[0]?.url || '' })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button onClick={saveSettings} disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Branding'}
            </button>
          </div>
        </div>
      )}

      {tab === 'shop' && settings && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="card space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Shop name"><input className="input" value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} /></Field>
              <Field label="Tagline"><input className="input" value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></Field>
            </div>
            <Field label="Address"><input className="input" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Contact phone"><input className="input" value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })} /></Field>
              <Field label="Contact email"><input className="input" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Opens at"><input type="time" className="input" value={settings.openTime} onChange={(e) => setSettings({ ...settings, openTime: e.target.value })} /></Field>
              <Field label="Closes at"><input type="time" className="input" value={settings.closeTime} onChange={(e) => setSettings({ ...settings, closeTime: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Delivery fee (₹)"><input type="number" className="input" value={settings.deliveryFee} onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })} /></Field>
              <Field label="Free delivery above (₹)"><input type="number" className="input" value={settings.freeDeliveryAbove} onChange={(e) => setSettings({ ...settings, freeDeliveryAbove: Number(e.target.value) })} /></Field>
              <Field label="Min order (₹)"><input type="number" className="input" value={settings.minOrderAmount} onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Delivery zones"><input className="input" value={settings.deliveryZones} onChange={(e) => setSettings({ ...settings, deliveryZones: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tax percent"><input type="number" className="input" value={settings.taxPercent} onChange={(e) => setSettings({ ...settings, taxPercent: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex flex-wrap gap-4">
              {[['taxEnabled', 'GST / tax enabled'], ['codEnabled', 'Cash on delivery'], ['onlinePaymentEnabled', 'Online payment'], ['guestCheckoutEnabled', 'Guest checkout'], ['notificationSmsEnabled', 'SMS notifications'], ['notificationWhatsappEnabled', 'WhatsApp notifications'], ['notificationEmailEnabled', 'Email notifications']].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="h-4 w-4" /> {label}</label>
              ))}
            </div>
            <button onClick={saveSettings} disabled={saving} className="btn-primary"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}</button>
          </div>

          <div className="card h-fit p-5">
            <h3 className="font-semibold">Integrations</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {Object.entries(integrations).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="capitalize text-slate-600">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className={`chip ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{v ? 'Configured' : 'Not set'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-400">Integrations are configured via server environment variables (see server/.env.example).</p>
          </div>
        </div>
      )}

      {tab === 'coupons' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setCouponEdit(emptyCoupon())} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> New coupon</button></div>
          {coupons.length === 0 ? <EmptyState title="No coupons yet" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min order</th><th>Used</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id}>
                      <td><p className="font-mono font-semibold">{c.code}</p><p className="text-xs text-slate-400">{c.description}</p></td>
                      <td className="text-slate-500">{c.type}</td>
                      <td>{c.type === 'PERCENT' ? `${c.value}%` : inr(c.value)}</td>
                      <td>{inr(c.minOrder)}</td>
                      <td className="text-slate-500">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                      <td>{c.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-slate-100 text-slate-500">Off</span>}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setCouponEdit({ ...c, startsAt: c.startsAt?.slice(0, 10) || '', expiresAt: c.expiresAt?.slice(0, 10) || '' })} className="btn-outline py-1.5 text-xs">Edit</button>
                          <button onClick={() => setDelCoupon(c.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'admins' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setAdminEdit({ name: '', phone: '', email: '', password: '', _new: true })} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> New admin</button></div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Last login</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.name}</td>
                    <td>{a.phone}</td>
                    <td className="text-slate-500">{a.email || '—'}</td>
                    <td className="text-xs text-slate-400">{dateTime(a.lastLoginAt)}</td>
                    <td>{a.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-red-100 text-red-600">Disabled</span>}</td>
                    <td><button onClick={() => setAdminEdit({ id: a.id, name: a.name, isActive: a.isActive, password: '' })} className="btn-outline py-1.5 text-xs">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card p-0">
          <ul className="divide-y divide-slate-100 text-sm">
            {logs.length === 0 ? <li className="p-5 text-slate-400">No activity.</li> : logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-slate-600">{l.action.replace(/_/g, ' ')}{l.entity ? ` · ${l.entity}` : ''}</span>
                <span className="text-xs text-slate-400">{l.user?.name || 'system'} · {dateTime(l.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={!!couponEdit} onClose={() => setCouponEdit(null)} title={couponEdit?.id ? 'Edit coupon' : 'New coupon'} size="md">
        {couponEdit && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Code"><input className="input font-mono uppercase" value={couponEdit.code} onChange={(e) => setCouponEdit({ ...couponEdit, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Type"><select className="input" value={couponEdit.type} onChange={(e) => setCouponEdit({ ...couponEdit, type: e.target.value })}><option value="PERCENT">Percent</option><option value="FLAT">Flat</option></select></Field>
            </div>
            <Field label="Description"><input className="input" value={couponEdit.description} onChange={(e) => setCouponEdit({ ...couponEdit, description: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={couponEdit.type === 'PERCENT' ? 'Percent off' : 'Flat off (₹)'}><input type="number" className="input" value={couponEdit.value} onChange={(e) => setCouponEdit({ ...couponEdit, value: Number(e.target.value) })} /></Field>
              <Field label="Min order (₹)"><input type="number" className="input" value={couponEdit.minOrder} onChange={(e) => setCouponEdit({ ...couponEdit, minOrder: Number(e.target.value) })} /></Field>
              <Field label="Max discount (₹)"><input type="number" className="input" value={couponEdit.maxDiscount ?? ''} onChange={(e) => setCouponEdit({ ...couponEdit, maxDiscount: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Usage limit"><input type="number" className="input" value={couponEdit.usageLimit ?? ''} onChange={(e) => setCouponEdit({ ...couponEdit, usageLimit: e.target.value ? Number(e.target.value) : null })} /></Field>
              <Field label="Starts"><input type="date" className="input" value={couponEdit.startsAt || ''} onChange={(e) => setCouponEdit({ ...couponEdit, startsAt: e.target.value })} /></Field>
              <Field label="Expires"><input type="date" className="input" value={couponEdit.expiresAt || ''} onChange={(e) => setCouponEdit({ ...couponEdit, expiresAt: e.target.value })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={couponEdit.isActive} onChange={(e) => setCouponEdit({ ...couponEdit, isActive: e.target.checked })} className="h-4 w-4" /> Active</label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setCouponEdit(null)} className="btn-outline">Cancel</button>
              <button onClick={saveCoupon} className="btn-primary">Save</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!adminEdit} onClose={() => setAdminEdit(null)} title={adminEdit?.id ? 'Edit admin' : 'New admin'} size="md">
        {adminEdit && (
          <div className="space-y-3">
            <Field label="Name"><input className="input" value={adminEdit.name} onChange={(e) => setAdminEdit({ ...adminEdit, name: e.target.value })} /></Field>
            {adminEdit._new && <Field label="Phone"><input className="input" value={adminEdit.phone} onChange={(e) => setAdminEdit({ ...adminEdit, phone: e.target.value })} /></Field>}
            {adminEdit._new && <Field label="Email (optional)"><input className="input" value={adminEdit.email} onChange={(e) => setAdminEdit({ ...adminEdit, email: e.target.value })} /></Field>}
            <Field label={adminEdit._new ? 'Password' : 'New password (optional)'}><input type="password" className="input" value={adminEdit.password} onChange={(e) => setAdminEdit({ ...adminEdit, password: e.target.value })} /></Field>
            {!adminEdit._new && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={adminEdit.isActive} onChange={(e) => setAdminEdit({ ...adminEdit, isActive: e.target.checked })} className="h-4 w-4" /> Active</label>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setAdminEdit(null)} className="btn-outline">Cancel</button>
              <button onClick={saveAdmin} className="btn-primary">Save</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delCoupon} onClose={() => setDelCoupon(null)} onConfirm={() => removeCoupon(delCoupon)} title="Delete coupon?" message="Customers will no longer be able to use this code." confirmLabel="Delete" danger />
    </div>
  );
}
