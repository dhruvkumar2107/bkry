import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Navigation, Phone, MapPin, Bike, Clock } from 'lucide-react';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { timeAgo, mapsLink, dateTime, STATUS_LABELS } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';
import MapView from '../../components/MapView.jsx';

export default function LiveDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/delivery/live');
      setDeliveries(data.deliveries);
      setSelectedId((id) => id || data.deliveries[0]?.orderId || null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    const socket = getSocket();
    const onLoc = (p) => {
      setDeliveries((list) => list.map((d) => (d.orderId === p.orderId
        ? { ...d, boyLocation: { lat: p.lat, lng: p.lng, accuracy: p.accuracy, recordedAt: p.recordedAt, stale: false } }
        : d)));
    };
    const onStatus = () => load();
    socket.on('delivery:location', onLoc);
    socket.on('order:status', onStatus);
    socket.on('delivery:accepted', onStatus);
    socket.on('delivery:tracking', onStatus);
    return () => { clearInterval(t); socket.off('delivery:location', onLoc); socket.off('order:status', onStatus); socket.off('delivery:accepted', onStatus); socket.off('delivery:tracking', onStatus); };
  }, [load]);

  const selected = deliveries.find((d) => d.orderId === selectedId);

  const markers = useMemo(() => {
    if (!selected) return [];
    const m = [];
    if (selected.destination) m.push({ lat: selected.destination.lat, lng: selected.destination.lng, label: 'Customer', color: '#15803d' });
    if (selected.boyLocation) m.push({ lat: selected.boyLocation.lat, lng: selected.boyLocation.lng, label: selected.deliveryBoy?.name || 'Rider', color: '#f59e0b' });
    return m;
  }, [selected]);

  if (loading) return <PageLoader label="Loading live deliveries…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-2xl font-bold">Live Deliveries</h1>
        <button onClick={load} className="btn-outline py-2 text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {deliveries.length === 0 ? <EmptyState title="No active deliveries" subtitle="Orders appear here once a rider has been assigned." /> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-2">
            {deliveries.map((d) => (
              <li key={d.assignmentId}>
                <button onClick={() => setSelectedId(d.orderId)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === d.orderId ? 'border-brand-500 bg-brand-50' : 'border-slate-100 bg-white hover:border-brand-200'}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{d.orderNumber}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{d.customerName} · {d.customerPhone}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Bike className="h-3.5 w-3.5" /> {d.deliveryBoy?.name}</span>
                    {d.boyLocation ? (
                      <span className={`flex items-center gap-1 ${d.boyLocation.stale ? 'text-orange-500' : 'text-green-600'}`}>
                        <Clock className="h-3.5 w-3.5" /> {timeAgo(d.boyLocation.recordedAt)}{d.boyLocation.stale ? ' (stale)' : ''}
                      </span>
                    ) : <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> No GPS yet</span>}
                    {d.trackingActive ? <span className="chip bg-green-100 text-green-700">Tracking on</span> : <span className="chip bg-slate-100 text-slate-500">Tracking off</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="space-y-3">
              <MapView markers={markers} follow height={380} route={selected.boyLocation && selected.destination ? [[selected.boyLocation.lat, selected.boyLocation.lng], [selected.destination.lat, selected.destination.lng]] : undefined} />
              <div className="card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{selected.orderNumber} · {STATUS_LABELS[selected.status] || selected.status}</p>
                  <span className="text-xs text-slate-400">{dateTime(selected.boyLocation?.recordedAt)}</span>
                </div>
                <div className="mt-2 space-y-1 text-slate-600">
                  <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {selected.address?.line1}{selected.address?.landmark ? ` (${selected.address.landmark})` : ''}</p>
                  <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selected.customerPhone}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.destination && <a href={mapsLink(selected.destination.lat, selected.destination.lng)} target="_blank" rel="noreferrer" className="btn-outline py-1.5 text-xs"><Navigation className="h-3.5 w-3.5" /> Customer location</a>}
                  {selected.boyLocation && <a href={mapsLink(selected.boyLocation.lat, selected.boyLocation.lng)} target="_blank" rel="noreferrer" className="btn-outline py-1.5 text-xs"><Bike className="h-3.5 w-3.5" /> Rider location</a>}
                  {selected.deliveryBoy && <a href={`tel:${selected.deliveryBoy.phone}`} className="btn-outline py-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> Call rider</a>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
