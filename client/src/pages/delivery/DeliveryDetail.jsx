import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Phone, MapPin, Navigation, CheckCircle2, Bike, Play, Square,
  PackageCheck, Truck, PackageX, IndianRupee,
} from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr, dateTime, STATUS_LABELS, directionsLink } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';

const NEXT_ACTIONS = {
  ASSIGNED_FOR_DELIVERY: [{ status: 'PICKED_UP', label: 'Mark picked up', icon: PackageCheck }],
  PICKED_UP: [{ status: 'OUT_FOR_DELIVERY', label: 'Start delivery', icon: Truck }],
  OUT_FOR_DELIVERY: [{ status: 'DELIVERED', label: 'Mark delivered', icon: CheckCircle2 }],
};

export default function DeliveryDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const watchRef = useRef(null);
  const lastSent = useRef(0);

  const load = async () => {
    try { const { data } = await api.get(`/delivery/assignments/${id}`); setA(data.assignment); }
    catch { setA(null); } finally { setLoading(false); }
  };
  useEffect(() => { load(); return () => stopWatch(); /* eslint-disable-next-line */ }, [id]);

  const stopWatch = () => {
    if (watchRef.current != null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    setSharing(false);
  };

  const sendLocation = (pos) => {
    const now = Date.now();
    if (now - lastSent.current < 8000) return;
    lastSent.current = now;
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    api.post(`/delivery/assignments/${id}/location`, { lat, lng, accuracy }).catch(() => {});
  };

  const startTracking = async () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported on this device');
    setBusy(true);
    try {
      await api.post(`/delivery/assignments/${id}/tracking/start`);
      watchRef.current = navigator.geolocation.watchPosition(
        sendLocation,
        (e) => toast.error(e.code === 1 ? 'Location permission denied' : 'Location error'),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      setSharing(true);
      toast.success('Live location sharing started');
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const stopTracking = async () => {
    stopWatch();
    try { await api.post(`/delivery/assignments/${id}/tracking/stop`); toast.success('Location sharing stopped'); load(); } catch (e) { toast.error(apiError(e)); }
  };

  const accept = async () => {
    setBusy(true);
    try { await api.post(`/delivery/assignments/${id}/accept`); toast.success('Accepted'); load(); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const setStatus = async (status, note) => {
    setBusy(true);
    try {
      await api.post(`/delivery/assignments/${id}/status`, { status, note });
      if (status === 'DELIVERED' || status === 'FAILED_DELIVERY') stopWatch();
      toast.success(STATUS_LABELS[status]); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  if (loading) return <PageLoader />;
  if (!a) return <EmptyState title="Assignment not found" action={<Link to="/delivery" className="btn-primary">Back</Link>} />;

  const finished = ['DELIVERED', 'FAILED_DELIVERY'].includes(a.status);
  const dest = a.address;
  const markers = dest?.lat != null ? [{ lat: dest.lat, lng: dest.lng, label: 'Delivery address', color: '#15803d' }] : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Back</button>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h1 className="font-brand text-xl font-bold">{a.orderNumber}</h1>
          <StatusBadge status={a.status} />
        </div>
        <p className="mt-1 text-xs text-slate-400">{a.items.length} items · {a.paymentMethod} · {inr(a.total)}</p>
        {a.collectAmount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            <IndianRupee className="h-4 w-4" /> Collect {inr(a.collectAmount)} in cash on delivery
          </div>
        )}

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-cream-50 p-3">
            <span className="font-medium">{a.customer.name}</span>
            <a href={`tel:${a.customer.phone}`} className="btn-outline py-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> Call</a>
          </div>
          {dest && (
            <div className="rounded-xl bg-cream-50 p-3">
              <p className="flex items-start gap-2 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 text-brand-600" /> {dest.line1}{dest.line2 ? `, ${dest.line2}` : ''}{dest.landmark ? ` (${dest.landmark})` : ''}</p>
              {dest.instructions && <p className="mt-1 text-xs text-slate-400">Note: {dest.instructions}</p>}
              {dest.lat != null && <a href={directionsLink(null, null, dest.lat, dest.lng)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700"><Navigation className="h-3.5 w-3.5" /> Get directions</a>}
            </div>
          )}
        </div>

        {markers.length > 0 && <div className="mt-3"><MapView markers={markers} height={240} /></div>}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {a.items.map((it) => (
            <li key={it.id} className="flex justify-between text-slate-600"><span>{it.name} <span className="text-slate-400">({it.variantLabel}) × {it.quantity}</span></span><span>{inr(it.lineTotal)}</span></li>
          ))}
        </ul>
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Actions</h2>
        {!a.acceptedAt && <button onClick={accept} disabled={busy} className="btn-primary w-full py-3"><CheckCircle2 className="h-4 w-4" /> Accept this delivery</button>}

        {a.acceptedAt && !finished && (
          <div className="flex flex-wrap gap-2">
            {a.trackingActive || sharing ? (
              <button onClick={stopTracking} className="btn-outline flex-1 py-2 text-sm text-red-600"><Square className="h-4 w-4" /> Stop sharing location</button>
            ) : (
              <button onClick={startTracking} disabled={busy} className="btn-gold flex-1 py-2 text-sm"><Play className="h-4 w-4" /> Share live location</button>
            )}
          </div>
        )}

        {a.acceptedAt && !finished && (NEXT_ACTIONS[a.status] || []).map(({ status, label, icon: Icon }) => (
          <button key={status} onClick={() => setStatus(status)} disabled={busy} className="btn-primary w-full py-3"><Icon className="h-4 w-4" /> {label}</button>
        ))}

        {a.acceptedAt && !finished && (
          <button onClick={() => { const note = window.prompt('Reason for failed delivery?') || 'Customer unavailable'; setStatus('FAILED_DELIVERY', note); }} disabled={busy} className="btn-outline w-full py-2 text-sm text-red-600"><PackageX className="h-4 w-4" /> Mark failed delivery</button>
        )}

        {finished && (
          <div className="rounded-xl bg-green-50 p-3 text-center text-sm text-green-700">
            <Bike className="mx-auto mb-1 h-5 w-5" />
            {a.status === 'DELIVERED' ? `Delivered ${dateTime(a.deliveredAt)}` : 'Marked as failed delivery'}
          </div>
        )}
      </div>
    </div>
  );
}
