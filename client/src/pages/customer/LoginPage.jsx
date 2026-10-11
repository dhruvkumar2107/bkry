import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Phone, KeyRound, ArrowRight } from 'lucide-react';
import { useAuth } from '../../store/auth.js';
import { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';

export default function LoginPage() {
  const nav = useNavigate();
  const routerLoc = useLocation();
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!/^\d{10,15}$/.test(phone)) return toast.error('Enter a valid mobile number');
    setBusy(true);
    try {
      const data = await requestOtp(phone);
      if (data.devCode) { setDevCode(data.devCode); setCode(data.devCode); }
      toast.success(data.devCode ? `Development OTP: ${data.devCode}` : 'OTP sent');
      setStep('otp');
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyOtp(phone, code, name || undefined);
      toast.success('Logged in successfully');
      nav(routerLoc.state?.from || '/account', { replace: true });
    } catch (err) {
      toast.error(apiError(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="card p-6 sm:p-8">
        <div className="text-center">
          <img src="/logo.svg" alt="" className="mx-auto h-14 w-14" />
          <h1 className="mt-3 font-brand text-2xl font-bold">Welcome to Chotulal Sweets</h1>
          <p className="mt-1 text-sm text-slate-400">Login or create an account with your mobile number</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={send} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Mobile number</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand-500">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">+91</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className="w-full bg-transparent py-2.5 text-sm outline-none" placeholder="10-digit number" inputMode="numeric" />
              </div>
            </label>
            <label className="block">
              <span className="label">Your name (for new accounts)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Optional" />
            </label>
            <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Sending…' : 'Send OTP'} <ArrowRight className="h-4 w-4" /></button>
          </form>
        ) : (
          <form onSubmit={verify} className="mt-6 space-y-4">
            <label className="block">
              <span className="label">Enter OTP sent to +91 {phone}</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-brand-500">
                <KeyRound className="h-4 w-4 text-slate-400" />
                <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-transparent py-2.5 text-sm tracking-[0.3em] outline-none" placeholder="______" inputMode="numeric" />
              </div>
            </label>
            {devCode && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Development mode — your OTP is <b>{devCode}</b>.</p>}
            <button disabled={busy} className="btn-primary w-full py-3">{busy ? 'Verifying…' : 'Verify & Login'}</button>
            <button type="button" onClick={() => setStep('phone')} className="btn-ghost w-full">Change number</button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Staff? <Link to="/admin/login" className="text-brand-700">Admin login</Link> · <Link to="/delivery/login" className="text-brand-700">Delivery login</Link>
        </p>
      </div>
    </div>
  );
}
