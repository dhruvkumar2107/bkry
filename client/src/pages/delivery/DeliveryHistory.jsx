import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import api from '../../lib/api.js';
import { inr, dateTime } from '../../lib/format.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';

export default function DeliveryHistory() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/delivery/history').then(({ data }) => setAssignments(data.assignments)).finally(() => setLoading(false)); }, []);

  if (loading) return <PageLoader />;
  if (!assignments.length) return <EmptyState title="No delivery history yet" icon={Calendar} />;

  return (
    <div className="space-y-3">
      <h1 className="font-brand text-2xl font-bold">Delivery History</h1>
      <ul className="space-y-2">
        {assignments.map((a) => (
          <li key={a.id} className="card flex items-center justify-between p-4">
            <div>
              <Link to={`/delivery/${a.id}`} className="font-semibold text-slate-800 hover:text-brand-700">{a.orderNumber}</Link>
              <p className="text-xs text-slate-400">{dateTime(a.deliveredAt || a.acceptedAt)} · {inr(a.total)}</p>
            </div>
            <StatusBadge status={a.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
