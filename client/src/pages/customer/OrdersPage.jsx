import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { inr, dateTime } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!user) { setLoading(false); return; }
    api.get('/orders/mine').then(({ data }) => setOrders(data.orders)).finally(() => setLoading(false));
  }, [ready, user]);

  if (loading) return <PageLoader />;
  if (!user) return <EmptyState title="Please log in" subtitle="Login to view your order history." action={<Link to="/login" className="btn-primary">Login</Link>} />;
  if (!orders.length) return <EmptyState title="No orders yet" action={<Link to="/products" className="btn-primary">Browse products</Link>} />;

  return (
    <div>
      <h1 className="mb-4 font-brand text-2xl font-bold">My Orders</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{o.orderNumber}</p>
                <p className="text-xs text-slate-400">{dateTime(o.placedAt)} · {o.paymentMethod} · {o.items.length} items</p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-bold">{inr(o.total)}</span>
              <Link to={`/track-order/${o.orderNumber}`} className="btn-outline py-1.5 text-xs">Track</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
