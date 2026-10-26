import { useEffect, useState } from 'react';
import { Search, Download, User2, Phone, Mail } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr, dateTime } from '../../lib/format.js';
import { PageLoader, Pagination, Modal, EmptyState, StatusBadge } from '../../components/ui.jsx';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/customers', { params: { page, limit: 20, q: q || undefined } });
      setCustomers(data.customers); setPagination(data.pagination);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [q]); // eslint-disable-line

  const openDetail = async (id) => { const { data } = await api.get(`/admin/customers/${id}`); setDetail(data.customer); };

  const toggleActive = async (c) => {
    try { await api.patch(`/admin/customers/${c.id}`, { isActive: !c.isActive }); toast.success('Updated'); setDetail(null); load(pagination.page); } catch (e) { toast.error(apiError(e)); }
  };

  const exportCsv = async () => {
    const res = await api.get('/admin/customers/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'chotulal-customers.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-2xl font-bold">Customers</h1>
        <button onClick={exportCsv} className="btn-outline py-2 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      <div className="card flex items-center gap-2 p-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, email…" className="w-full bg-transparent py-1 text-sm outline-none" />
      </div>

      {loading ? <PageLoader /> : customers.length === 0 ? <EmptyState title="No customers found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Joined</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><p className="font-medium">{c.name || 'Guest'}</p><p className="text-xs text-slate-400">{c.id.slice(0, 8)}</p></td>
                  <td><p className="text-sm">{c.phone}</p><p className="text-xs text-slate-400">{c.email || '—'}</p></td>
                  <td className="font-medium">{c.orderCount}</td>
                  <td className="text-xs text-slate-500">{dateTime(c.createdAt)}</td>
                  <td>{c.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-red-100 text-red-600">Disabled</span>}</td>
                  <td><button onClick={() => openDetail(c.id)} className="btn-outline py-1.5 text-xs">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onChange={load} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Customer'} size="lg">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-cream-50 p-3">
                <p className="flex items-center gap-2 text-slate-600"><User2 className="h-4 w-4" /> {detail.name || 'Guest'}</p>
                <p className="mt-1 flex items-center gap-2 text-slate-500"><Phone className="h-3.5 w-3.5" /> {detail.phone}</p>
                {detail.email && <p className="mt-1 flex items-center gap-2 text-slate-500"><Mail className="h-3.5 w-3.5" /> {detail.email}</p>}
                <p className="mt-1 text-xs text-slate-400">Joined {dateTime(detail.createdAt)} · Last login {dateTime(detail.lastLoginAt)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-brand-50 p-3 text-center"><p className="text-2xl font-bold text-brand-700">{detail.stats.totalOrders}</p><p className="text-xs text-slate-500">Orders</p></div>
                <div className="rounded-xl bg-green-50 p-3 text-center"><p className="text-2xl font-bold text-green-700">{inr(detail.stats.totalSpent)}</p><p className="text-xs text-slate-500">Lifetime value</p></div>
              </div>
            </div>

            {detail.addresses?.length > 0 && (
              <div>
                <p className="mb-1 font-semibold">Saved addresses</p>
                <ul className="space-y-1 text-slate-600">
                  {detail.addresses.map((a) => <li key={a.id}>{a.label || 'Address'} — {a.line1}{a.landmark ? ` (${a.landmark})` : ''}</li>)}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 font-semibold">Order history</p>
              {detail.orders.length === 0 ? <p className="text-slate-400">No orders.</p> : (
                <ul className="divide-y divide-slate-100">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between py-2">
                      <div><p className="font-medium">{o.orderNumber}</p><p className="text-xs text-slate-400">{dateTime(o.placedAt)} · {o.items.length} items</p></div>
                      <div className="text-right"><p className="font-semibold">{inr(o.total)}</p><StatusBadge status={o.status} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button onClick={() => toggleActive(detail)} className={`w-full rounded-xl py-2 text-sm font-medium ${detail.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
              {detail.isActive ? 'Disable account' : 'Re-enable account'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
