import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Navigation, Bike } from 'lucide-react';
import api from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';
import { inr, STATUS_LABELS, directionsLink } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';

export default function ActiveDeliveries() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/delivery/assignments', { params: { filter: 'active' } }).then(({ data }) => setAssignments(data.assignments)).finally(() => setLoading(false)); };

  useEffect(() => {
    load();
    const socket = getSocket();
    const onStatus = () => load();
    socket.on('order:status', onStatus);
    return () => socket.off('order:status', onStatus);
  }, []);

  if (loading) return <PageLoader />;
  if (!assignments.length) return <EmptyState title="No active deliveries" subtitle="Accepted deliveries that are in progress show here." icon={Bike} />;

  return (
    <div className="space-y-3">
      <h1 className="font-brand text-2xl font-bold">Active Deliveries</h1>
      {assignments.map((a) => (
        <div key={a.id} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{a.orderNumber}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{a.paymentMethod} · {inr(a.total)}{a.collectAmount > 0 ? ` · Collect ${inr(a.collectAmount)}` : ''}</p>

          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-medium">{a.customer.name} <a href={`tel:${a.customer.phone}`} className="text-brand-700"><Phone className="h-3.5 w-3.5" /></a></p>
            {a.address && <p className="flex items-start gap-2 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5" /> {a.address.line1}{a.address.landmark ? ` (${a.address.landmark})` : ''}</p>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/delivery/${a.id}`} className="btn-primary flex-1 py-2 text-sm">Manage delivery</Link>
            {a.address?.lat != null && (
              <a href={directionsLink(null, null, a.address.lat, a.address.lng)} target="_blank" rel="noreferrer" className="btn-outline py-2 text-sm"><Navigation className="h-4 w-4" /> Directions</a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
