import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { CheckCircle2, Package, Home, Copy } from 'lucide-react';
import api from '../../lib/api.js';
import { inr, dateTime } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { PageLoader, StatusBadge } from '../../components/ui.jsx';

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const routerState = useLocation();
  const [order, setOrder] = useState(null);
  const [trackingToken, setTrackingToken] = useState(routerState.state?.token || localStorage.getItem(`track_${orderNumber}`));

  const trackHref = `/track-order/${orderNumber}${trackingToken ? `?t=${trackingToken}` : ''}`;

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${trackHref}`);
      toast.success('Tracking link copied');
    } catch { toast.error('Could not copy link'); }
  };

  useEffect(() => {
    if (routerState.state?.token) localStorage.setItem(`track_${orderNumber}`, routerState.state.token);
  }, [orderNumber, routerState.state]);

  useEffect(() => {
    const token = trackingToken || localStorage.getItem(`track_${orderNumber}`);
    api.get(`/track/${orderNumber}`, { params: token ? { t: token } : {} })
      .then(({ data }) => {
        setOrder(data.order);
        if (data.order && token) localStorage.setItem(`track_${orderNumber}`, token);
      })
      .catch(() => setOrder(null));
  }, [orderNumber, trackingToken]);

  if (!order) return <PageLoader label="Loading your order…" />;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6 text-center sm:p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-4 font-brand text-2xl font-bold">Order placed successfully!</h1>
        <p className="mt-1 text-sm text-slate-500">Thank you for ordering from Chotulal Sweets.</p>

        <div className="mt-5 inline-flex flex-col items-center rounded-2xl bg-cream-100 px-6 py-4">
          <span className="text-xs uppercase tracking-wide text-slate-500">Order number</span>
          <span className="font-brand text-xl font-bold text-brand-700">{order.orderNumber}</span>
          <div className="mt-2"><StatusBadge status={order.status} /></div>
        </div>

        <div className="mt-6 text-left">
          <h3 className="mb-2 text-sm font-semibold">Items</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span>{it.name} <span className="text-slate-400">({it.variantLabel}) × {it.quantity}</span></span>
                <span className="font-medium">{inr(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-lg font-bold"><span>Total paid</span><span>{inr(order.total)}</span></div>
          <p className="text-xs text-slate-400">Payment: {order.paymentMethod} · {order.paymentStatus}</p>
        </div>

        {order.deliveryAddress && (
          <div className="mt-5 rounded-xl bg-cream-50 p-4 text-left text-sm">
            <p className="font-semibold">Delivering to</p>
            <p className="text-slate-500">{order.deliveryAddress.line1}{order.deliveryAddress.landmark ? `, ${order.deliveryAddress.landmark}` : ''}</p>
            {order.deliveryAddress.lat != null && (
              <a href={`https://www.google.com/maps?q=${order.deliveryAddress.lat},${order.deliveryAddress.lng}`} target="_blank" rel="noreferrer" className="text-xs text-brand-700">View delivery location →</a>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link to={trackHref} className="btn-primary flex-1"><Package className="h-4 w-4" /> Track Order</Link>
          <button onClick={copyTracking} className="btn-outline flex-1"><Copy className="h-4 w-4" /> Copy tracking link</button>
          <Link to="/products" className="btn-outline flex-1"><Home className="h-4 w-4" /> Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}
