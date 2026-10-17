import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, LocateFixed, Check, Lock, Wallet, CreditCard } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { useLocation } from '../../store/location.js';
import { toast } from '../../store/toast.js';
import { inr } from '../../lib/format.js';
import { Field, PageLoader, EmptyState } from '../../components/ui.jsx';

// Loads the Razorpay checkout.js script once, returns a promise that resolves
// when the global Razorpay constructor is available.
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay payment gateway'));
    document.body.appendChild(script);
  });

// Opens the Razorpay payment modal and waits for success or dismissal.
// Returns { paid: true } on success, { paid: false } otherwise.
const openRazorpayModal = (rz, orderNumber) =>
  new Promise((resolve) => {
    const options = {
      key: rz.keyId,
      amount: Math.round(rz.amount * 100),
      currency: 'INR',
      name: 'Chotulal Sweets',
      description: `Order ${orderNumber}`,
      order_id: rz.razorpayOrderId,
      handler: async (response) => {
        try {
          await api.post('/payments/razorpay/verify', response);
          toast.success('Payment successful! 🎉');
          resolve({ paid: true });
        } catch (e) {
          toast.error(`Payment verification failed: ${apiError(e)}`);
          resolve({ paid: false });
        }
      },
      prefill: {},
      theme: { color: '#b45309' }, // brand amber
      modal: {
        ondismiss: () => resolve({ paid: false }),
        escape: true,
        backdropclose: false,
      },
    };
    // eslint-disable-next-line no-undef
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
      resolve({ paid: false });
    });
    rzp.open();
  });

export default function CheckoutPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { cart, fetch: fetchCart, couponCode } = useCart();
  const { location, setLocation } = useLocation();

  const [settings, setSettings] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState('new');
  const [manual, setManual] = useState({
    line1: location?.line1 || '',
    line2: location?.line2 || '',
    landmark: location?.landmark || '',
    city: location?.city || 'Bijapur',
    pincode: location?.pincode || '',
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
  });
  const [instructions, setInstructions] = useState(location?.instructions || '');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [payment, setPayment] = useState('COD');
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/catalog/settings/public'),
      api.get('/cart', { params: { coupon: couponCode || undefined } }),
      user ? api.get('/auth/addresses') : Promise.resolve({ data: { addresses: [] } }),
    ]).then(([s, c, a]) => {
      setSettings(s.data.settings);
      setAddresses(a.data.addresses);
      // Default to ONLINE if COD is off but online is on.
      if (!s.data.settings.codEnabled && s.data.settings.onlinePaymentEnabled) {
        setPayment('ONLINE');
      }
      const def = a.data.addresses.find((x) => x.isDefault) || a.data.addresses[0];
      if (def) setSelectedAddrId(def.id);
    }).finally(() => setLoading(false));
    fetchCart();
  }, []); // eslint-disable-line

  // Use native window.fetch (not the cart's fetch) for the reverse-geocode call.
  const currentLoc = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await window.fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const d = await res.json();
          const a = d.address || {};
          const line1 =
            [a.road, a.suburb, a.neighbourhood, a.village].filter(Boolean).join(', ') ||
            d.display_name ||
            '';
          setManual((m) => ({
            ...m,
            lat,
            lng,
            line1,
            city: a.city || a.town || a.county || m.city,
            pincode: a.postcode || m.pincode,
          }));
          toast.success('Location captured');
        } catch {
          setManual((m) => ({ ...m, lat, lng }));
          toast.info('Coordinates captured — please fill in the address');
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === 1
            ? 'Location permission denied. Enter address manually.'
            : 'Could not fetch location'
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const placeOrder = async () => {
    const useSaved = selectedAddrId !== 'new';
    let address;
    if (useSaved) {
      const a = addresses.find((x) => x.id === selectedAddrId);
      if (!a) return toast.error('Please select an address');
      address = { addressId: a.id };
    } else {
      if (!manual.line1) return toast.error('Please enter your delivery address');
      address = { address: manual, deliveryInstructions: instructions };
    }
    // Persist the chosen location locally for next visit.
    if (!useSaved) setLocation({ ...location, ...manual, instructions });

    setPlacing(true);
    try {
      const payload = {
        customerName: name || user?.name,
        customerPhone: phone || user?.phone,
        paymentMethod: payment,
        couponCode: couponCode || undefined,
        deliveryInstructions: instructions || undefined,
        ...address,
      };
      const { data } = await api.post('/orders/checkout', payload);
      const order = data.order;

      if (payment === 'ONLINE' && settings?.onlinePaymentEnabled) {
        try {
          // Pre-load the Razorpay script while creating the server-side order.
          await loadRazorpayScript();
          const rz = await api.post('/payments/razorpay/create', {
            orderNumber: order.orderNumber,
          });
          const { paid } = await openRazorpayModal(rz.data, order.orderNumber);
          if (!paid) {
            toast.info('Payment was not completed. You can retry from your order page.');
          }
        } catch (e) {
          toast.error(
            `Order saved but payment failed: ${apiError(e)}. You can retry from your order page.`
          );
        }
      } else {
        toast.success('Order placed successfully!');
      }

      nav(`/order/${order.orderNumber}`, { state: { token: order.trackingToken } });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!cart.items.length)
    return (
      <EmptyState
        title="Your cart is empty"
        action={<Link to="/products" className="btn-primary">Browse products</Link>}
      />
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <h1 className="font-brand text-2xl font-bold">Checkout</h1>

        {!user && settings?.guestCheckoutEnabled && (
          <div className="card p-5">
            <h3 className="font-semibold">Contact details</h3>
            <p className="mb-3 text-xs text-slate-400">
              You&apos;re checking out as a guest.{' '}
              <Link to="/login" className="text-brand-700">Log in</Link> to save your addresses.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Mobile number">
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4 text-brand-600" /> Delivery address
            </h3>
            <button onClick={currentLoc} disabled={locating} className="btn-outline py-1.5 text-xs">
              <LocateFixed className="h-3.5 w-3.5" /> {locating ? 'Locating…' : 'Use My Current Location'}
            </button>
          </div>

          {addresses.length > 0 && (
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    selectedAddrId === a.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="addr"
                    checked={selectedAddrId === a.id}
                    onChange={() => setSelectedAddrId(a.id)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {a.label || 'Address'}{' '}
                      {a.isDefault && <span className="chip bg-brand-100 text-brand-700">Default</span>}
                    </p>
                    <p className="text-slate-500">
                      {a.line1}{a.line2 ? `, ${a.line2}` : ''}{a.city ? `, ${a.city}` : ''} {a.pincode}
                    </p>
                  </div>
                </label>
              ))}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${
                  selectedAddrId === 'new' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="addr"
                  checked={selectedAddrId === 'new'}
                  onChange={() => setSelectedAddrId('new')}
                />
                <span className="text-sm font-medium">Use a new address</span>
              </label>
            </div>
          )}

          {(selectedAddrId === 'new' || !addresses.length) && (
            <div className="mt-3 space-y-3">
              <Field label="Address line 1">
                <input
                  className="input"
                  value={manual.line1}
                  onChange={(e) => setManual({ ...manual, line1: e.target.value })}
                  placeholder="House / street"
                />
              </Field>
              <Field label="Address line 2">
                <input
                  className="input"
                  value={manual.line2}
                  onChange={(e) => setManual({ ...manual, line2: e.target.value })}
                  placeholder="Area / locality"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Landmark">
                  <input
                    className="input"
                    value={manual.landmark}
                    onChange={(e) => setManual({ ...manual, landmark: e.target.value })}
                  />
                </Field>
                <Field label="Pincode">
                  <input
                    className="input"
                    value={manual.pincode}
                    onChange={(e) => setManual({ ...manual, pincode: e.target.value })}
                  />
                </Field>
              </div>
              {manual.lat != null && (
                <p className="flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700">
                  <Check className="h-3.5 w-3.5" /> GPS: {manual.lat.toFixed(5)}, {manual.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}

          <div className="mt-3">
            <Field label="Delivery instructions (optional)">
              <textarea
                className="input"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Call on arrival, ring the bell"
              />
            </Field>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold">Payment method</h3>
          <div className="mt-3 space-y-2">
            {settings?.codEnabled && (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  payment === 'COD' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                }`}
              >
                <input type="radio" name="pay" checked={payment === 'COD'} onChange={() => setPayment('COD')} />
                <Wallet className="h-5 w-5 text-brand-600" />
                <div className="text-sm flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Cash on Delivery</p>
                    <span className="text-xs font-medium text-brand-700">
                      {Math.max(0, (cart.subtotal || 0) - (cart.discount || 0)) >= 999 ? 'Free Delivery' : '₹40 Delivery'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Pay cash upon delivery at your doorstep</p>
                </div>
              </label>
            )}
            {settings?.onlinePaymentEnabled ? (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  payment === 'ONLINE' ? 'border-brand-500 bg-brand-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={payment === 'ONLINE'}
                  onChange={() => setPayment('ONLINE')}
                />
                <CreditCard className="h-5 w-5 text-brand-600" />
                <div className="text-sm flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Online Payment (Razorpay)</p>
                    <span className="text-xs font-medium text-brand-700">
                      {(() => {
                        const sub = Math.max(0, (cart.subtotal || 0) - (cart.discount || 0));
                        const freeOnline = settings?.freeDeliveryAbove && sub >= settings.freeDeliveryAbove;
                        return freeOnline ? 'Free Delivery' : (settings?.deliveryFee ? inr(settings.deliveryFee) : 'Free Delivery');
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">UPI, Credit/Debit Cards, Net Banking & Wallets</p>
                </div>
              </label>
            ) : (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
                Online payment is not configured yet. Add Razorpay keys in server/.env to enable it.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Order summary sidebar */}
      {(() => {
        const afterDiscount = Math.max(0, (cart.subtotal || 0) - (cart.discount || 0));
        let deliveryCharge = 0;
        let isFree = false;
        let diffToFree = 0;

        if (payment === 'COD') {
          const threshold = 999;
          if (afterDiscount >= threshold) {
            deliveryCharge = 0;
            isFree = true;
          } else {
            deliveryCharge = 40;
            diffToFree = threshold - afterDiscount;
          }
        } else {
          // ONLINE
          const threshold = settings?.freeDeliveryAbove || 0;
          if (threshold && afterDiscount >= threshold) {
            deliveryCharge = 0;
            isFree = true;
          } else {
            deliveryCharge = settings?.deliveryFee ?? 0;
            if (deliveryCharge === 0) isFree = true;
            else if (threshold) diffToFree = threshold - afterDiscount;
          }
        }

        const payableTotal = Math.round((afterDiscount + deliveryCharge) * 100) / 100;

        return (
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="card p-5">
              <h3 className="font-semibold">Order summary</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {cart.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="text-slate-600">
                      {it.name} <span className="text-slate-400">× {it.quantity}</span>
                    </span>
                    <span className="font-medium">{inr(it.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              {diffToFree > 0 ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  <p className="font-medium">
                    Add {inr(diffToFree)} more to get Free Delivery!
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                    <div
                      className="h-full bg-amber-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round((afterDiscount / (afterDiscount + diffToFree)) * 100))}%` }}
                    />
                  </div>
                </div>
              ) : isFree ? (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800 flex items-center justify-between">
                  <span>🎉 Free Delivery</span>
                  <span className="text-[11px] text-green-600">{payment === 'COD' ? 'COD on ₹999+' : 'Free Delivery'}</span>
                </div>
              ) : null}

              <div className="mt-4 space-y-1.5 border-t border-dashed border-slate-200 pt-4 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span><span>{inr(cart.subtotal)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>− {inr(cart.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Delivery ({payment})</span>
                  <span className={isFree ? 'font-semibold text-green-600' : 'font-medium text-slate-700'}>
                    {isFree ? 'Free Delivery' : inr(deliveryCharge)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
                  <span>Total</span><span>{inr(payableTotal)}</span>
                </div>
              </div>

              <button onClick={placeOrder} disabled={placing} className="btn-primary mt-4 w-full py-3">
                {placing ? (
                  'Placing order…'
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Place Order · {inr(payableTotal)}
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Prices and delivery fees are verified on the server.
              </p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
