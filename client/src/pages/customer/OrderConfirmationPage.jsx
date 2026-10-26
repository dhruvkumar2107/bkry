import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { CheckCircle2, Package, Home, Copy, CreditCard, AlertCircle, RefreshCw } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { inr, dateTime } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { PageLoader, StatusBadge } from '../../components/ui.jsx';

// Loads Razorpay checkout.js and resolves when window.Razorpay is ready.
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay payment gateway'));
    document.body.appendChild(script);
  });

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const routerState = useLocation();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [trackingToken, setTrackingToken] = useState(
    routerState.state?.token || localStorage.getItem(`track_${orderNumber}`)
  );

  const trackHref = `/track-order/${orderNumber}${trackingToken ? `?t=${trackingToken}` : ''}`;

  const loadOrder = useCallback(() => {
    const token = trackingToken || localStorage.getItem(`track_${orderNumber}`);
    return api
      .get(`/track/${orderNumber}`, { params: token ? { t: token } : {} })
      .then(({ data }) => {
        setOrder(data.order);
        if (data.order && token) localStorage.setItem(`track_${orderNumber}`, token);
      })
      .catch(() => setOrder(null));
  }, [orderNumber, trackingToken]);

  useEffect(() => {
    if (routerState.state?.token) {
      localStorage.setItem(`track_${orderNumber}`, routerState.state.token);
    }
  }, [orderNumber, routerState.state]);

  useEffect(() => { loadOrder(); }, [loadOrder]);

  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${trackHref}`);
      toast.success('Tracking link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Opens the Razorpay modal for a pending/failed online payment.
  const retryPayment = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      await loadRazorpayScript();
      const { data: rz } = await api.post('/payments/razorpay/create', {
        orderNumber: order.orderNumber,
      });

      await new Promise((resolve) => {
        const options = {
          key: rz.keyId,
          amount: Math.round(rz.amount * 100),
          currency: 'INR',
          name: 'Chotulal Sweets',
          description: `Order ${order.orderNumber}`,
          image: `${window.location.origin}/logo.png`,
          order_id: rz.razorpayOrderId,
          handler: async (response) => {
            try {
              await api.post('/payments/razorpay/verify', response);
              toast.success('Payment successful! 🎉');
              await loadOrder(); // refresh order status
            } catch (e) {
              toast.error(`Verification failed: ${apiError(e)}`);
            }
            resolve();
          },
          prefill: {
            name: order.customerName || user?.name || '',
            contact: order.customerPhone || user?.phone || '',
          },
          theme: { color: '#b45309' },
          modal: { ondismiss: resolve },
        };
        // eslint-disable-next-line no-undef
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
          toast.error(`Payment failed: ${resp.error?.description || 'Unknown error'}`);
          resolve();
        });
        rzp.open();
      });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setRetrying(false);
    }
  };

  if (!order) return <PageLoader label="Loading your order…" />;

  const paymentPending =
    order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID';
  const paymentPaid = order.paymentStatus === 'PAID';

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6 text-center sm:p-8">
        {/* Success icon */}
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="mt-4 font-brand text-2xl font-bold">Order placed successfully!</h1>
        <p className="mt-1 text-sm text-slate-500">Thank you for ordering from Chotulal Sweets.</p>

        {/* Order number + status */}
        <div className="mt-5 inline-flex flex-col items-center rounded-2xl bg-cream-100 px-6 py-4">
          <span className="text-xs uppercase tracking-wide text-slate-500">Order number</span>
          <span className="font-brand text-xl font-bold text-brand-700">{order.orderNumber}</span>
          <div className="mt-2"><StatusBadge status={order.status} /></div>
        </div>

        {/* Payment status banner */}
        {paymentPaid && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>Payment of {inr(order.total)} received · Razorpay</span>
          </div>
        )}
        {paymentPending && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-center justify-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Payment not completed
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Your order is saved. Complete payment now or we&apos;ll contact you shortly.
            </p>
            <button
              onClick={retryPayment}
              disabled={retrying}
              className="btn-primary mt-3 w-full py-2.5 text-sm"
            >
              {retrying ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Opening payment…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Pay {inr(order.total)} Now (Razorpay)</>
              )}
            </button>
          </div>
        )}

        {/* Items list */}
        <div className="mt-6 text-left">
          <h3 className="mb-2 text-sm font-semibold">Items</h3>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {order.items.map((it) => (
              <li key={it.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span>
                  {it.name}{' '}
                  <span className="text-slate-400">({it.variantLabel}) × {it.quantity}</span>
                </span>
                <span className="font-medium">{inr(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{inr(order.total)}</span>
          </div>
          <p className="text-xs text-slate-400">
            Payment: {order.paymentMethod} ·{' '}
            <span className={paymentPaid ? 'text-green-600' : paymentPending ? 'text-amber-600' : ''}>
              {order.paymentStatus}
            </span>
          </p>
        </div>

        {/* Delivery address */}
        {order.deliveryAddress && (
          <div className="mt-5 rounded-xl bg-cream-50 p-4 text-left text-sm">
            <p className="font-semibold">Delivering to</p>
            <p className="text-slate-500">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.landmark ? `, ${order.deliveryAddress.landmark}` : ''}
            </p>
            {order.deliveryAddress.lat != null && (
              <a
                href={`https://www.google.com/maps?q=${order.deliveryAddress.lat},${order.deliveryAddress.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-700"
              >
                View delivery location →
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link to={trackHref} className="btn-primary flex-1">
            <Package className="h-4 w-4" /> Track Order
          </Link>
          <button onClick={copyTracking} className="btn-outline flex-1">
            <Copy className="h-4 w-4" /> Copy tracking link
          </button>
          <Link to="/products" className="btn-outline flex-1">
            <Home className="h-4 w-4" /> Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
