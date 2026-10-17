import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Phone, MapPin, Navigation, Clock, User2, Bike } from 'lucide-react';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { useAuth } from '../../store/auth.js';
import { inr, dateTime, timeAgo, mapsLink, STATUS_LABELS } from '../../lib/format.js';
import { PageLoader, StatusBadge, EmptyState } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';

export default function TrackOrderPage() {
  const { orderNumber } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const token = params.get('t') || localStorage.getItem(`track_${orderNumber}`);

  const load = async () => {
    try {
      const { data } = await api.get(`/track/${orderNumber}`, { params: token ? { t: token } : {} });
      setOrder(data.order);
      if (data.order && token) {
        localStorage.setItem(`track_${orderNumber}`, token);
      }
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get('t')) {
      localStorage.setItem(`track_${orderNumber}`, params.get('t'));
    }
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    /* eslint-disable-next-line */
  }, [orderNumber]);

  useEffect(() => {
    if (!order) return undefined;
    // Fast polling fallback (4s) so status updates and GPS movements are smooth and real-time
    const poll = setInterval(load, 4000);
    const socket = getSocket();
    socket.emit('order:subscribe', order.id);
    const onStatus = (p) => { if (p.orderId === order.id) load(); };
    const onLocation = (p) => {
      if (p.orderId !== order.id) return;
      setOrder((o) => (o ? { ...o, boyLocation: { lat: p.lat, lng: p.lng, accuracy: p.accuracy, recordedAt: p.recordedAt, stale: false } } : o));
    };
    socket.on('order:status', onStatus);
    socket.on('delivery:location', onLocation);
    return () => { clearInterval(poll); socket.emit('order:unsubscribe', order.id); socket.off('order:status', onStatus); socket.off('delivery:location', onLocation); };
  }, [order?.id]);

  const markers = useMemo(() => {
    const m = [];
    if (order?.deliveryAddress?.lat != null) m.push({ lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng, label: 'Delivery address', color: '#15803d' });
    if (order?.boyLocation?.lat != null) m.push({ lat: order.boyLocation.lat, lng: order.boyLocation.lng, label: 'Delivery partner', color: '#f59e0b' });
    return m;
  }, [order]);

  if (loading) return <PageLoader label="Loading tracking…" />;
  if (!order) return <EmptyState title="Order not found" subtitle="This order may not exist, or you're not authorised to view it." action={<Link to="/orders" className="btn-primary">My orders</Link>} />;

  const dest = order.deliveryAddress;
  const boy = order.boyLocation;

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-3 text-xs text-slate-400"><Link to="/" className="hover:text-brand-700">Home</Link> / <Link to="/orders" className="hover:text-brand-700">Orders</Link> / <span className="text-slate-600">{order.orderNumber}</span></nav>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-brand text-xl font-bold">{order.orderNumber}</h1>
            <p className="text-xs text-slate-400">Placed {dateTime(order.placedAt)} · {inr(order.total)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.canTrack && boy && (
          <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-brand-800"><Bike className="h-4 w-4" /> Delivery partner is on the way</div>
            {order.deliveryBoy && (
              <div className="mt-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600"><User2 className="h-4 w-4" /> {order.deliveryBoy.name}</span>
                <a href={`tel:${order.deliveryBoy.phone}`} className="btn-outline py-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> Call</a>
              </div>
            )}
            <p className={`mt-1 text-xs ${boy.stale ? 'text-orange-600' : 'text-slate-500'}`}>
              <Clock className="mr-1 inline h-3 w-3" /> Last location update: {timeAgo(boy.recordedAt)} {boy.stale && '(may be stale)'}
            </p>
          </div>
        )}

        {markers.length > 0 && (
          <div className="mt-4">
            <MapView markers={markers} height={320} follow={!!boy} route={boy && dest ? [[boy.lat, boy.lng], [dest.lat, dest.lng]] : undefined} />
            <p className="mt-1 text-center text-xs text-slate-400">Green = your address · Orange = delivery partner (direct line shown)</p>
          </div>
        )}
      </div>

      <div className="card mt-4 p-5">
        <h2 className="mb-4 font-semibold">Order status timeline</h2>
        <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5">
          {order.timeline.map((t, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[27px] grid h-5 w-5 place-items-center rounded-full ${i === order.timeline.length - 1 ? 'bg-brand-600' : 'bg-slate-200'}`}>
                <span className={`h-2 w-2 rounded-full ${i === order.timeline.length - 1 ? 'bg-white' : 'bg-slate-400'}`} />
              </span>
              <p className="text-sm font-medium text-slate-700">{t.label}</p>
              {t.note && <p className="text-xs text-slate-400">{t.note}</p>}
              <p className="text-xs text-slate-400">{dateTime(t.at)}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="card mt-4 p-5">
        <h2 className="mb-2 font-semibold">Delivery details</h2>
        {dest ? (
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-brand-600" />
            <div>
              <p>{dest.line1}{dest.line2 ? `, ${dest.line2}` : ''}</p>
              {dest.landmark && <p className="text-slate-400">Landmark: {dest.landmark}</p>}
              {dest.lat != null && <a href={mapsLink(dest.lat, dest.lng)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700"><Navigation className="h-3.5 w-3.5" /> Open in Google Maps</a>}
            </div>
          </div>
        ) : <p className="text-sm text-slate-400">No delivery address on record.</p>}
        <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between"><span className="text-slate-600">{it.name} ({it.variantLabel}) × {it.quantity}</span><span>{inr(it.lineTotal)}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
