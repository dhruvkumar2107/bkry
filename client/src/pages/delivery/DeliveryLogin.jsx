import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bike } from 'lucide-react';
import { useAuth } from '../../store/auth.js';
import { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';

export default function DeliveryLogin() {
  const nav = useNavigate();
  const { staffLogin } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await staffLogin(identifier, password, 'DELIVERY');
      toast.success('Welcome');
      nav('/delivery');
    } catch (err) { toast.error(apiError(err)); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-soft">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><Bike className="h-7 w-7" /></div>
          <h1 className="mt-3 font-brand text-2xl font-bold">Delivery Partner</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to view your deliveries</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block"><span className="label">Phone or email</span><input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="8888888881" /></label>
          <label className="block"><span className="label">Password</span><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
          <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Signing in…' : <><Bike className="h-4 w-4" /> Sign in</>}</button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Default: 8888888881 / delivery123</p>
        <p className="mt-2 text-center text-xs"><Link to="/" className="text-brand-700">← Back to store</Link></p>
      </div>
    </div>
  );
}
