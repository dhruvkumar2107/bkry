import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, CheckCircle2, Package } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { getSocket } from '../../lib/socket.js';
import { inr, dateTime, STATUS_LABELS } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';

export default function AssignedDeliveries() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); api.get('/delivery/assignments', { params: { filter: 'assigned' } }).then(({ data }) => setAssignments(data.assignments)).finally(() => setLoading(false)); };

  useEffect(() => {
    load();
    const poll = setInterval(load, 15000);
    const socket = getSocket();
    const onNew = () => load();
    socket.on('order:new', onNew);
    return () => { clearInterval(poll); socket.off('order:new', onNew); };
  }, []);

  const accept = async (id) => {
    try { await api.post(`/delivery/assignments/${id}/accept`); toast.success('Delivery accepted'); load(); } catch (e) { toast.error(apiError(e)); }
  };

  if (loading) return <PageLoader />;
  if (!assignments.length) return <EmptyState title="No new assignments" subtitle="New deliveries assigned to you will appear here." icon={Package} />;

  return (
    <div className="space-y-3">
      <h1 className="font-brand text-2xl font-bold">New Assignments</h1>
      {assignments.map((a) => (
        <div key={a.id} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{a.orderNumber}</p>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-1 text-xs text-slate-400">Assigned {dateTime(a.acceptedAt || undefined)} · {inr(a.total)} · {a.paymentMethod}</p>

          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-medium">{a.customer.name} <a href={`tel:${a.customer.phone}`} className="text-brand-700"><Phone className="h-3.5 w-3.5" /></a></p>
            {a.address && <p className="flex items-start gap-2 text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5" /> {a.address.line1}{a.address.landmark ? ` (${a.address.landmark})` : ''}</p>}
            <p className="text-xs text-slate-400">{a.items.length} items · {a.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}</p>
          </div>

          {a.collectAmount > 0 && <p className="mt-2 chip bg-amber-100 text-amber-700">Collect {inr(a.collectAmount)} (COD)</p>}

          <div className="mt-3 flex gap-2">
            <button onClick={() => accept(a.id)} className="btn-primary flex-1 py-2 text-sm"><CheckCircle2 className="h-4 w-4" /> Accept delivery</button>
            <Link to={`/delivery/${a.id}`} className="btn-outline py-2 text-sm">Details</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
