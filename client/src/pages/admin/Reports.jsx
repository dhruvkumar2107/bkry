import { useEffect, useState } from 'react';
import { Download, TrendingUp, Package, Wallet, Bike } from 'lucide-react';
import api from '../../lib/api.js';
import { inr } from '../../lib/format.js';
import { PageLoader, StatusBadge } from '../../components/ui.jsx';

export default function AdminReports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState('daily');
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = { from: from || undefined, to: to || undefined };
    try {
      const [s, p, c, st, pay, perf, val] = await Promise.all([
        api.get('/admin/reports/sales', { params: { ...params, groupBy } }),
        api.get('/admin/reports/products', { params }),
        api.get('/admin/reports/categories', { params }),
        api.get('/admin/reports/orders-by-status'),
        api.get('/admin/reports/payments', { params }),
        api.get('/admin/reports/delivery-performance'),
        api.get('/admin/reports/inventory-valuation'),
      ]);
      setSales(s.data); setProducts(p.data.products); setCategories(c.data.categories);
      setStatuses(st.data.statuses); setPayments(pay.data.payments);
      setPerformance(perf.data.performance); setValuation(val.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupBy]);

  const exportCsv = async (type) => {
    const res = await api.get('/admin/reports/export', { params: { type }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = `chotulal-${type}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <PageLoader label="Crunching numbers…" />;

  const maxSales = Math.max(...(sales?.data || []).map((d) => d.sales), 1);

  return (
    <div className="space-y-5 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-2xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" className="input w-auto py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400">to</span>
          <input type="date" className="input w-auto py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          <button onClick={load} className="btn-primary py-2 text-sm">Apply</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4"><p className="text-xs text-slate-400">Total sales {from || to ? '(range)' : '(all time)'}</p><p className="text-2xl font-bold text-green-700">{inr(sales?.totalSales)}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400">Total orders</p><p className="text-2xl font-bold">{sales?.totalOrders}</p></div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold"><TrendingUp className="h-4 w-4 text-brand-600" /> Sales trend</h2>
          <select className="input w-auto py-1.5 text-sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </div>
        {(sales?.data || []).length === 0 ? <p className="mt-3 text-sm text-slate-400">No sales in this period.</p> : (
          <div className="mt-4 flex h-52 items-end gap-1.5 overflow-x-auto">
            {sales.data.map((d) => (
              <div key={d.period} className="flex min-w-[42px] flex-1 flex-col items-center gap-1" title={`${d.orders} orders · ${inr(d.sales)}`}>
                <span className="text-[9px] text-slate-400">{d.orders}</span>
                <div className="w-full rounded-t bg-brand-500" style={{ height: `${Math.max(4, (d.sales / maxSales) * 150)}px` }} />
                <span className="whitespace-nowrap text-[9px] text-slate-500">{d.period.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => exportCsv('orders')} className="btn-outline mt-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Export orders CSV</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Package className="h-4 w-4 text-brand-600" /> Top products</h2>
            <button onClick={() => exportCsv('products')} className="text-xs text-brand-700">Export</button>
          </div>
          {products.length === 0 ? <p className="mt-3 text-sm text-slate-400">No data.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {products.slice(0, 10).map((p) => (
                <li key={p.name} className="flex items-center justify-between"><span className="text-slate-600">{p.name}</span><span className="text-slate-400">{p.units} units · <b className="text-slate-700">{inr(p.revenue)}</b></span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Category performance</h2>
          {categories.length === 0 ? <p className="mt-3 text-sm text-slate-400">No data.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between"><span className="text-slate-600">{c.name}</span><span className="text-slate-400">{c.units} units · <b className="text-slate-700">{inr(c.revenue)}</b></span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Orders by status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {statuses.map((s) => (
              <li key={s.status} className="flex items-center justify-between"><StatusBadge status={s.status} /><span className="text-slate-400">{s.count} · {inr(s.value)}</span></li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-brand-600" /> Payments</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {payments.length === 0 ? <li className="text-slate-400">No data.</li> : payments.map((p, i) => (
              <li key={i} className="flex items-center justify-between"><span className="text-slate-600">{p.method} · {p.status}</span><span className="text-slate-400">{p.count} · {inr(p.amount)}</span></li>
            ))}
          </ul>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold"><Bike className="h-4 w-4 text-brand-600" /> Delivery performance</h2>
          {performance.length === 0 ? <p className="mt-3 text-sm text-slate-400">No riders.</p> : (
            <div className="table-wrap mt-3">
              <table className="table">
                <thead><tr><th>Rider</th><th>Delivered</th><th>Failed</th><th>Avg. time</th></tr></thead>
                <tbody>{performance.map((r) => (<tr key={r.id}><td className="font-medium">{r.name}</td><td className="text-green-600">{r.delivered}</td><td className="text-red-500">{r.failed}</td><td>{r.avgMinutes} min</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Inventory valuation</h2>
            <button onClick={() => exportCsv('inventory')} className="text-xs text-brand-700">Export</button>
          </div>
          <p className="mt-1 text-sm text-slate-500">Total stock value: <b>{inr(valuation?.totalValue)}</b></p>
        </div>
      </div>
    </div>
  );
}
