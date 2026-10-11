import { useState } from 'react';
import { MapPin, LocateFixed, Loader2, Check } from 'lucide-react';
import api from '../lib/api.js';
import { useLocation } from '../store/location.js';
import { useAuth } from '../store/auth.js';
import { toast } from '../store/toast.js';
import { Field, Modal } from './ui.jsx';

export default function LocationModal({ open, onClose }) {
  const { location, setLocation } = useLocation();
  const { user } = useAuth();
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    label: location?.label || 'Home',
    line1: location?.line1 || '',
    line2: location?.line2 || '',
    landmark: location?.landmark || '',
    city: location?.city || 'Bijapur',
    pincode: location?.pincode || '',
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
    instructions: location?.instructions || '',
  });

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported on this device');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({ ...f, lat: latitude, lng: longitude }));
        try {
          // Reverse geocoding via OpenStreetMap Nominatim (no key required).
          // Swap for Google Geocoding API by supplying GOOGLE_MAPS_API_KEY server-side.
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' },
          });
          const data = await res.json();
          const a = data.address || {};
          const line1 = [a.road, a.suburb, a.neighbourhood, a.village].filter(Boolean).join(', ') || data.display_name || '';
          setForm((f) => ({ ...f, line1, city: a.city || a.town || a.county || f.city, pincode: a.postcode || f.pincode }));
          toast.success('Location detected. Please confirm your address.');
        } catch {
          toast.info('Got your coordinates. Please enter the address details.');
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === 1 ? 'Location permission denied. Please enter your address manually.' : 'Could not get your location. Please enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const save = async () => {
    if (!form.line1) return toast.error('Please enter your delivery address');
    const loc = { ...form, confirmedAt: new Date().toISOString() };
    setLocation(loc);
    if (user) {
      try {
        await api.post('/auth/addresses', loc);
        toast.success('Address saved to your account');
      } catch { /* non-fatal */ }
    }
    toast.success('Delivery location set');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Select delivery location">
      <button onClick={useCurrentLocation} disabled={locating} className="btn-primary w-full">
        {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
        {locating ? 'Detecting your location…' : 'Use My Current Location'}
      </button>
      <p className="mt-2 text-center text-xs text-slate-400">
        We use your location only to deliver your order. Permission is requested each time.
      </p>

      {form.lat != null && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
          <MapPin className="h-4 w-4" /> Coordinates captured: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <Field label="Address line 1">
          <input className="input" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} placeholder="House / street" />
        </Field>
        <Field label="Address line 2">
          <input className="input" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} placeholder="Area / locality" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Landmark">
            <input className="input" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Near…" />
          </Field>
          <Field label="Pincode">
            <input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </Field>
        </div>
        <Field label="Delivery instructions (optional)">
          <textarea className="input" rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="e.g. Ring the bell twice" />
        </Field>
      </div>

      <button onClick={save} className="btn-primary mt-5 w-full">
        <Check className="h-4 w-4" /> Confirm & Save Location
      </button>
    </Modal>
  );
}
