import { useEffect, useState } from 'react';
import { Search, Download, PackagePlus, PackageMinus, History } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr, dateTime } from '../../lib/format.js';
import { PageLoader, Modal, Field, EmptyState } from '../../components/ui.jsx';

export default function AdminInventory() {
  const [variants, setVariants] = useState([]);
  const [movements, setMovements] = useState([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjust, setAdjust] = useState(null);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [movementsOpen, setMovementsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { q: q || undefined };
      if (filter === 'low') params.lowStock = true;
      if (filter === 'out') params.outOfStock = true;
      const { data } = await api.get('/admin/inventory', { params });
      setVariants(data.variants);
    } finally { setLoading(false); }
  };
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, filter]); // eslint-disable-line

  const openMovements = async (v) => {
    const { data } = await api.get('/admin/inventory/movements', { params: { variantId: v.id } });
    setMovements(data.movements); setMovementsOpen(true);
  };

  const runAdjust = async () => {
    const d = Number(delta);
    if (!d) return toast.error('Enter a non-zero change');
    try {
      await api.post('/admin/inventory/adjust', { variantId: adjust.id, delta: d, note });
      toast.success('Stock updated'); setAdjust(null); setDelta(''); setNote(''); load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const exportCsv = async () => {
    const res = await api.get('/admin/inventory/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'chotulal-inventory.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const badge = (s) => s === 'OUT' ? 'bg-red-100 text-red-600' : s === 'LOW' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-2xl font-bold">Inventory</h1>
        <button onClick={exportCsv} className="btn-outline py-2 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product…" className="w-full bg-transparent py-2 text-sm outline-none" />
        </div>
        <select className="input w-auto py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All stock</option>
          <option value="low">Low stock (≤5)</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {loading ? <PageLoader /> : variants.length === 0 ? <EmptyState title="No variants found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Variant</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td><p className="font-medium">{v.product}</p><p className="text-xs text-slate-400">{v.sku || '—'}</p></td>
                  <td className="text-slate-600">{v.label}</td>
                  <td>{inr(v.price)}</td>
                  <td className="font-bold">{v.stock}</td>
                  <td><span className={`chip ${badge(v.status)}`}>{v.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setAdjust(v)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700" title="Adjust"><PackagePlus className="h-4 w-4" /></button>
                      <button onClick={() => openMovements(v)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="History"><History className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={`Adjust stock — ${adjust?.product} (${adjust?.label})`} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Current stock: <b>{adjust?.stock}</b>. Use a positive number to add stock, negative to remove.</p>
          <Field label="Change (+/-)"><input type="number" className="input" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. 20 or -5" /></Field>
          <Field label="Note (optional)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="New batch, damaged, etc." /></Field>
          <button onClick={runAdjust} className="btn-primary w-full">Apply</button>
        </div>
      </Modal>

      <Modal open={movementsOpen} onClose={() => setMovementsOpen(false)} title="Stock movements" size="lg">
        {movements.length === 0 ? <p className="text-sm text-slate-400">No movements recorded.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  {m.delta > 0 ? <PackagePlus className="h-4 w-4 text-green-600" /> : <PackageMinus className="h-4 w-4 text-red-500" />}
                  <span className={`font-semibold ${m.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>{m.delta > 0 ? '+' : ''}{m.delta}</span>
                  <span className="text-slate-500">{m.reason}{m.note ? ` — ${m.note}` : ''}</span>
                </div>
                <span className="text-xs text-slate-400">{m.by} · {dateTime(m.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
