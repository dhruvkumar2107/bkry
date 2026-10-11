import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, TicketPercent, ArrowRight } from 'lucide-react';
import { useCart } from '../../store/cart.js';
import { inr, PLACEHOLDER } from '../../lib/format.js';
import { toast } from '../../store/toast.js';
import { EmptyState, PageLoader } from '../../components/ui.jsx';

export default function CartPage() {
  const { cart, loading, fetch, updateQty, remove, applyCoupon, couponCode } = useCart();
  const [code, setCode] = useState(couponCode || '');
  const nav = useNavigate();

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  const change = async (item, delta) => {
    try {
      if (item.quantity + delta <= 0) await remove(item.id);
      else await updateQty(item.id, item.quantity + delta);
    } catch (e) { toast.error(e?.response?.data?.error || 'Could not update'); }
  };

  const tryCoupon = async () => {
    try {
      const c = await applyCoupon(code.trim().toUpperCase());
      if (code && !c.coupon) toast.error('Coupon could not be applied');
      else if (c.coupon) toast.success(`Coupon ${c.coupon.code} applied`);
    } catch (e) { toast.error(e?.response?.data?.error || 'Invalid coupon'); }
  };

  if (loading && !cart.items.length) return <PageLoader />;

  if (!cart.items.length) {
    return <EmptyState title="Your cart is empty" subtitle="Add some delicious sweets to get started." action={<Link to="/products" className="btn-primary">Browse products</Link>} />;
  }

  const belowMin = cart.subtotal < (cart.minOrderAmount || 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-4 font-brand text-2xl font-bold">Shopping Cart</h1>
        <ul className="space-y-3">
          {cart.items.map((it) => (
            <li key={it.id} className="card flex gap-4 p-3">
              <img src={it.image || PLACEHOLDER} alt="" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} className="h-20 w-20 rounded-xl object-cover bg-cream-100 sm:h-24 sm:w-24" />
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/product/${it.slug}`} className="font-semibold text-slate-800 hover:text-brand-700">{it.name}</Link>
                    <p className="text-xs text-slate-400">{it.variantLabel} · {inr(it.unitPrice)} each</p>
                  </div>
                  <button onClick={() => remove(it.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-2 py-1">
                    <button onClick={() => change(it, -1)} className="p-1 text-brand-700"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-[20px] text-center font-semibold text-brand-700">{it.quantity}</span>
                    <button onClick={() => change(it, 1)} className="p-1 text-brand-700 disabled:opacity-40" disabled={it.quantity >= it.stock}><Plus className="h-4 w-4" /></button>
                  </div>
                  <span className="font-bold">{inr(it.lineTotal)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="card p-5">
          <h3 className="font-semibold">Order Summary</h3>
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <TicketPercent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className="input pl-9 uppercase" />
            </div>
            <button onClick={tryCoupon} className="btn-outline">Apply</button>
          </div>
          <p className="mt-1 text-xs text-slate-400">Try SWEET10, FIRST50 or FESTIVE15</p>

          <div className="mt-4 space-y-1.5 border-t border-dashed border-slate-200 pt-4 text-sm">
            <Row label="Subtotal" value={inr(cart.subtotal)} />
            {cart.discount > 0 && <Row label="Discount" value={`− ${inr(cart.discount)}`} green />}
            <Row label="Delivery" value={cart.deliveryFee === 0 ? 'FREE' : inr(cart.deliveryFee)} />
            {cart.taxAmount > 0 && <Row label="Tax" value={inr(cart.taxAmount)} />}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-bold">
              <span>Total</span><span>{inr(cart.total)}</span>
            </div>
          </div>

          {belowMin && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Add {inr((cart.minOrderAmount || 0) - cart.subtotal)} more to reach the minimum order of {inr(cart.minOrderAmount)}.
            </p>
          )}

          <button disabled={belowMin} onClick={() => nav('/checkout')} className="btn-primary mt-4 w-full py-3">
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const Row = ({ label, value, green }) => (
  <div className="flex justify-between text-slate-500">
    <span>{label}</span>
    <span className={green ? 'font-semibold text-green-600' : 'font-medium text-slate-700'}>{value}</span>
  </div>
);
