import { useEffect, useState } from 'react';
import { Search, Printer, MapPin, Bike, CheckCircle2, XCircle, Copy, Navigation, ExternalLink } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr, dateTime, timeAgo, mapsLink, ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS } from '../../lib/format.js';
import { Modal, PageLoader, Pagination, Field, StatusBadge, EmptyState, ConfirmDialog } from '../../components/ui.jsx';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [boys, setBoys] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ q: '', status: '', paymentStatus: '', date: '' });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [assignBoy, setAssignBoy] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/orders', { params: { page, limit: 20, q: filters.q || undefined, status: filters.status || undefined, paymentStatus: filters.paymentStatus || undefined, from: filters.date || undefined, to: filters.date || undefined } });
      setOrders(data.orders); setPagination(data.pagination);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [filters]); // eslint-disable-line
  useEffect(() => { api.get('/admin/delivery/boys').then(({ data }) => setBoys(data.boys)); }, []);

  const openDetail = async (id) => { const { data } = await api.get(`/admin/orders/${id}`); setDetail({ ...data.order, nextStatuses: data.nextStatuses, trackingToken: data.trackingToken, locationPings: data.locationPings || [] }); setAssignBoy(''); };

  const trackingUrl = (o) => o?.trackingToken ? `${window.location.origin}/track-order/${o.orderNumber}?t=${o.trackingToken}` : `${window.location.origin}/track-order/${o.orderNumber}`;
  const copyTracking = async (o) => {
    try { await navigator.clipboard.writeText(trackingUrl(o)); toast.success('Tracking link copied'); }
    catch { toast.error('Could not copy link'); }
  };

  const setStatus = async (id, status, note) => {
    try { await api.post(`/admin/orders/${id}/status`, { status, note }); toast.success(`Marked ${STATUS_LABELS[status] || status}`); openDetail(id); load(pagination.page); } catch (e) { toast.error(apiError(e)); }
  };

  const assign = async () => {
    if (!assignBoy) return toast.error('Select a delivery partner');
    try { await api.post(`/admin/orders/${detail.id}/assign`, { deliveryBoyId: assignBoy }); toast.success('Delivery assigned'); openDetail(detail.id); load(pagination.page); } catch (e) { toast.error(apiError(e)); }
  };

  const cancelOrder = async () => {
    try { await api.post(`/admin/orders/${cancelId}/status`, { status: 'CANCELLED', note: cancelReason || 'Cancelled by admin' }); toast.success('Order cancelled & stock restored'); setCancelId(null); setCancelReason(''); setDetail(null); load(pagination.page); } catch (e) { toast.error(apiError(e)); }
  };

  const printInvoice = (o) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${o.orderNumber}</title><style>body{font-family:sans-serif;padding:24px;max-width:600px;margin:auto}h1{color:#8a1c1c}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #eee;text-align:left}</style></head><body>
      <h1>Chotulal Sweets</h1><p>Bijapur Locality · GST invoice</p>
      <h2>Invoice ${o.orderNumber}</h2>
      <p>Date: ${dateTime(o.placedAt)}<br/>Customer: ${o.customerName || 'Guest'}${o.customerPhone ? ` · ${o.customerPhone}` : ''}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>
      ${o.items.map((it) => `<tr><td>${it.name} (${it.variantLabel})</td><td>${it.quantity}</td><td>${inr(it.unitPrice)}</td><td>${inr(it.lineTotal)}</td></tr>`).join('')}
      </tbody></table>
      <p style="text-align:right;margin-top:16px">Subtotal: ${inr(o.subtotal)}<br/>Discount: -${inr(o.discount)}<br/>Delivery: ${inr(o.deliveryFee)}<br/>Tax: ${inr(o.tax)}<br/><b>Total: ${inr(o.total)}</b></p>
      <p>Payment: ${o.paymentMethod} (${o.paymentStatus})</p>
      <script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <h1 className="font-brand text-2xl font-bold">Orders</h1>

      <div className="card grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Order no, name, phone…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        </div>
        <select className="input py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input py-2 text-sm" value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
          <option value="">All payments</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
        </select>
        <input type="date" className="input py-2 text-sm" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
      </div>

      {loading ? <PageLoader /> : orders.length === 0 ? <EmptyState title="No orders match filters" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><p className="font-medium">{o.orderNumber}</p><p className="text-xs text-slate-400">{dateTime(o.placedAt)}</p></td>
                  <td><p className="font-medium">{o.customerName}</p><p className="text-xs text-slate-400">{o.customerPhone}</p></td>
                  <td className="text-slate-500">{o.deliveryBoy?.name || '—'}</td>
                  <td className="font-semibold">{inr(o.total)}</td>
                  <td><span className="chip bg-slate-100 text-slate-600 text-xs">{o.paymentMethod} · {o.paymentStatus}</span></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td><button onClick={() => openDetail(o.id)} className="btn-outline py-1.5 text-xs">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onChange={load} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Order ${detail.orderNumber}` : ''} size="xl">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={detail.status} />
              <div className="flex gap-2">
                <button onClick={() => copyTracking(detail)} className="btn-outline py-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> Tracking link</button>
                <a href={trackingUrl(detail)} target="_blank" rel="noreferrer" className="btn-outline py-1.5 text-xs"><ExternalLink className="h-3.5 w-3.5" /> Track</a>
                <button onClick={() => printInvoice(detail)} className="btn-outline py-1.5 text-xs"><Printer className="h-3.5 w-3.5" /> Invoice</button>
                {!['DELIVERED', 'CANCELLED', 'FAILED_DELIVERY'].includes(detail.status) && <button onClick={() => setCancelId(detail.id)} className="btn-outline border-red-200 py-1.5 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" /> Cancel</button>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-cream-50 p-4">
                <p className="font-semibold">Customer</p>
                <p>{detail.customerName || 'Guest'}</p>
                <p className="text-slate-500">{detail.customerPhone}</p>
                {detail.user?.email && <p className="text-slate-500">{detail.user.email}</p>}
              </div>
              <div className="rounded-xl bg-cream-50 p-4">
                <p className="font-semibold">Delivery address</p>
                {detail.deliveryAddress ? <>
                  <p>{detail.deliveryAddress.line1}{detail.deliveryAddress.line2 ? `, ${detail.deliveryAddress.line2}` : ''}</p>
                  {detail.deliveryAddress.landmark && <p className="text-slate-500">Landmark: {detail.deliveryAddress.landmark}</p>}
                  {detail.deliveryAddress.instructions && <p className="text-slate-500">Note: {detail.deliveryAddress.instructions}</p>}
                  {detail.deliveryAddress.lat != null && <a href={mapsLink(detail.deliveryAddress.lat, detail.deliveryAddress.lng)} target="_blank" rel="noreferrer" className="text-xs text-brand-700"><MapPin className="mr-1 inline h-3 w-3" />Open location</a>}
                </> : <p className="text-slate-400">—</p>}
              </div>
            </div>

            <div>
              <p className="mb-1 font-semibold">Items</p>
              <table className="table">
                <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>{detail.items.map((it) => (<tr key={it.id}><td>{it.name}<span className="text-slate-400"> ({it.variantLabel})</span></td><td>{it.quantity}</td><td>{inr(it.unitPrice)}</td><td>{inr(it.lineTotal)}</td></tr>))}</tbody>
              </table>
              <div className="mt-2 ml-auto max-w-xs space-y-1 text-right">
                <p>Subtotal: {inr(detail.subtotal)}</p>
                {detail.discount > 0 && <p className="text-green-600">Discount: -{inr(detail.discount)}</p>}
                <p>Delivery: {inr(detail.deliveryFee)}</p>
                <p>Tax: {inr(detail.taxAmount)}</p>
                <p className="text-lg font-bold">Total: {inr(detail.total)}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 font-semibold">Update status</p>
                <div className="flex flex-wrap gap-2">
                  {(detail.nextStatuses || []).map((s) => (
                    <button key={s} onClick={() => setStatus(detail.id, s)} className={`rounded-xl px-3 py-1.5 text-xs font-medium ${STATUS_COLORS[s] || 'bg-slate-100'}`}>{STATUS_LABELS[s]}</button>
                  ))}
                  {(!detail.nextStatuses || detail.nextStatuses.length === 0) && <p className="text-xs text-slate-400">No further transitions.</p>}
                </div>
              </div>
              <div>
                <p className="mb-2 font-semibold"><Bike className="mr-1 inline h-4 w-4" />Assign delivery</p>
                {detail.assignment ? (
                  <div className="rounded-xl bg-brand-50 p-3">
                    <p className="font-medium">{detail.assignment.deliveryBoy?.name} · {detail.assignment.trackingActive ? 'Tracking live' : 'Assigned'}</p>
                    <p className="text-xs text-slate-500">{detail.assignment.deliveryBoy?.phone}</p>
                    {detail.locationPings?.[0] ? (
                      <p className="mt-1 text-xs text-slate-500">
                        <MapPin className="mr-1 inline h-3 w-3 text-brand-600" />
                        Last GPS {timeAgo(detail.locationPings[0].recordedAt)}{' '}
                        <a href={mapsLink(detail.locationPings[0].lat, detail.locationPings[0].lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700"><Navigation className="h-3 w-3" />Open</a>
                      </p>
                    ) : <p className="mt-1 text-xs text-slate-400">No GPS updates yet.</p>}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select className="input py-2 text-sm" value={assignBoy} onChange={(e) => setAssignBoy(e.target.value)}>
                      <option value="">Select partner…</option>
                      {boys.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.phone})</option>)}
                    </select>
                    <button onClick={assign} className="btn-primary py-2 text-sm">Assign</button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 font-semibold">Timeline</p>
              <ol className="space-y-1.5">
                {detail.statusHistory.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-brand-600" /><span className="font-medium">{STATUS_LABELS[t.status] || t.status}</span><span className="text-slate-400">{dateTime(t.createdAt)}</span>{t.note && <span className="text-slate-400">— {t.note}</span>}</li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel order" size="sm">
        <Field label="Reason"><textarea className="input" rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why is this order being cancelled?" /></Field>
        <div className="mt-3 flex justify-end gap-2"><button onClick={() => setCancelId(null)} className="btn-outline">Back</button><button onClick={cancelOrder} className="btn-primary bg-red-600 hover:bg-red-700">Cancel order</button></div>
      </Modal>
    </div>
  );
}
