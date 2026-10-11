import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, IndianRupee, Users, Bike, AlertTriangle, PackageX, Clock, CheckCircle2,
} from 'lucide-react';
import api from '../../lib/api.js';
import { inr, dateTime, STATUS_LABELS } from '../../lib/format.js';
import { PageLoader, StatusBadge } from '../../components/ui.jsx';

const Stat = ({ icon: Icon, label, value, tone = 'brand' }) => {
  const tones = { brand: 'bg-brand-50 text-brand-700', gold: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700' };
  return (
    <div className="card p-4">
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;
  if (!data) return null;
  const s = data.stats;
  const maxSales = Math.max(...data.chart.map((c) => c.sales), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-2xl font-bold">Dashboard</h1>
        <span className="text-xs text-slate-400">Updated {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={ShoppingCart} label="Today's Orders" value={s.todayOrders} />
        <Stat icon={IndianRupee} label="Today's Sales" value={inr(s.todaySales)} tone="green" />
        <Stat icon={Clock} label="Pending Orders" value={s.pendingOrders} tone="gold" />
        <Stat icon={Bike} label="Active Deliveries" value={s.activeDeliveries} tone="blue" />
        <Stat icon={Users} label="Total Customers" value={s.totalCustomers} />
        <Stat icon={CheckCircle2} label="Completed" value={s.completedOrders} tone="green" />
        <Stat icon={AlertTriangle} label="Active Orders" value={s.activeOrders} tone="gold" />
        <Stat icon={PackageX} label="Out of Stock" value={data.outOfStock.length} tone="red" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold">Sales — last 7 days</h2>
          <div className="mt-4 flex h-48 items-end gap-2">
            {data.chart.map((c) => (
              <div key={c.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400">{inr(c.sales)}</span>
                <div className="w-full rounded-t-lg bg-brand-500" style={{ height: `${Math.max(4, (c.sales / maxSales) * 140)}px` }} title={`${c.orders} orders`} />
                <span className="text-xs text-slate-500">{c.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Bestsellers</h2>
          {data.bestsellers.length === 0 ? <p className="mt-3 text-sm text-slate-400">No sales recorded yet.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.bestsellers.map((b, i) => (
                <li key={b.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-cream-100 text-xs font-bold text-gold-600">{i + 1}</span> {b.name}</span>
                  <span className="text-slate-400">{b.units} sold</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-xs font-medium text-brand-700">View all</Link>
          </div>
          {data.recentOrders.length === 0 ? <p className="mt-3 text-sm text-slate-400">No orders yet.</p> : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {data.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-xs text-slate-400">{o.customerName} · {dateTime(o.placedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{inr(o.total)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Stock alerts</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-orange-600">Low stock</p>
              {data.lowStock.length === 0 ? <p className="text-sm text-slate-400">All good.</p> : (
                <ul className="space-y-1.5 text-sm">{data.lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between"><span className="text-slate-600">{v.product} <span className="text-slate-400">({v.label})</span></span><span className="font-semibold text-orange-600">{v.stock}</span></li>
                ))}</ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-red-600">Out of stock</p>
              {data.outOfStock.length === 0 ? <p className="text-sm text-slate-400">None.</p> : (
                <ul className="space-y-1.5 text-sm">{data.outOfStock.map((v) => (
                  <li key={v.id} className="flex justify-between"><span className="text-slate-600">{v.product} <span className="text-slate-400">({v.label})</span></span><span className="font-semibold text-red-600">0</span></li>
                ))}</ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Recent activity</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {data.recentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <span className="text-slate-600">{a.action.replace(/_/g, ' ')} {a.entity && <span className="text-slate-400">· {a.entity}</span>}</span>
              <span className="text-xs text-slate-400">{a.user?.name || 'system'} · {dateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
