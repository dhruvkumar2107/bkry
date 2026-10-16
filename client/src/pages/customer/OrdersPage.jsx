import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, RefreshCw } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { inr, dateTime } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { PageLoader, EmptyState, StatusBadge } from '../../components/ui.jsx';

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

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const loadOrders = useCallback(() => {
    return api.get('/orders/mine').then(({ data }) => setOrders(data.orders));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) { setLoading(false); return; }
    loadOrders().finally(() => setLoading(false));
  }, [ready, user, loadOrders]);

  const retryPayment = async (order) => {
    setRetryingId(order.id);
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
          order_id: rz.razorpayOrderId,
          handler: async (response) => {
            try {
              await api.post('/payments/razorpay/verify', response);
              toast.success('Payment successful! 🎉');
              await loadOrders();
            } catch (e) {
              toast.error(`Verification failed: ${apiError(e)}`);
            }
            resolve();
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
      setRetryingId(null);
    }
  };

  if (loading) return <PageLoader />;
  if (!user)
    return (
      <EmptyState
        title="Please log in"
        subtitle="Login to view your order history."
        action={<Link to="/login" className="btn-primary">Login</Link>}
      />
    );
  if (!orders.length)
    return (
      <EmptyState
        title="No orders yet"
        action={<Link to="/products" className="btn-primary">Browse products</Link>}
      />
    );

  return (
    <div>
      <h1 className="mb-4 font-brand text-2xl font-bold">My Orders</h1>
      <ul className="space-y-3">
        {orders.map((o) => {
          const needsPayment =
            o.paymentMethod === 'ONLINE' && o.paymentStatus !== 'PAID' &&
            !['CANCELLED', 'FAILED_DELIVERY'].includes(o.status);
          const isPaying = retryingId === o.id;

          return (
            <li key={o.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.orderNumber}</p>
                  <p className="text-xs text-slate-400">
                    {dateTime(o.placedAt)} · {o.paymentMethod} · {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold">{inr(o.total)}</span>
                  {needsPayment && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Payment pending
                    </span>
                  )}
                  {o.paymentStatus === 'PAID' && o.paymentMethod === 'ONLINE' && (
                    <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Paid online
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {needsPayment && (
                    <button
                      onClick={() => retryPayment(o)}
                      disabled={isPaying}
                      className="btn-primary py-1.5 text-xs"
                    >
                      {isPaying ? (
                        <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Opening…</>
                      ) : (
                        <><CreditCard className="h-3.5 w-3.5" /> Pay Now</>
                      )}
                    </button>
                  )}
                  <Link to={`/track-order/${o.orderNumber}`} className="btn-outline py-1.5 text-xs">
                    Track
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
