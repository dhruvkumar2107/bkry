import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../store/cart.js';
import { inr, PLACEHOLDER } from '../lib/format.js';
import { toast } from '../store/toast.js';

export default function CartDrawer() {
  const { open, setOpen, cart, updateQty, remove, fetch } = useCart();
  const nav = useNavigate();

  useEffect(() => { if (open) fetch(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, setOpen]);

  const change = async (item, delta) => {
    try {
      if (item.quantity + delta <= 0) await remove(item.id);
      else await updateQty(item.id, item.quantity + delta);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not update');
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-soft transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold">Your Cart</h3>
            <span className="chip bg-cream-100 text-slate-600">{cart.items.length} items</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close cart" className="icon-btn h-9 w-9"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
              <ShoppingBag className="h-12 w-12" />
              <p className="mt-3 text-sm">Your cart is empty</p>
              <button onClick={() => { setOpen(false); nav('/products'); }} className="btn-primary mt-4">Start Shopping</button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.items.map((it) => (
                <li key={it.id} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                  <img src={it.image || PLACEHOLDER} alt="" className="h-16 w-16 rounded-lg object-cover bg-cream-100" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold leading-snug">{it.name}</p>
                        <p className="text-xs text-slate-400">{it.variantLabel}</p>
                      </div>
                      <button onClick={() => remove(it.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-1">
                        <button onClick={() => change(it, -1)} className="p-1 text-brand-700"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="min-w-[18px] text-center text-sm font-semibold text-brand-700">{it.quantity}</span>
                        <button onClick={() => change(it, 1)} className="p-1 text-brand-700"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <span className="text-sm font-bold">{inr(it.lineTotal)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4">
            {(() => {
              const afterDiscount = Math.max(0, (cart.subtotal || 0) - (cart.discount || 0));
              const threshold = cart.codFreeDeliveryAbove || 999;
              if (afterDiscount < threshold) {
                const diff = threshold - afterDiscount;
                return (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                    <p className="font-medium">Add {inr(diff)} more to get Free Delivery!</p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                      <div
                        className="h-full bg-amber-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.round((afterDiscount / threshold) * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              }
              return (
                <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-800 flex items-center justify-between">
                  <span>🎉 Free Delivery unlocked!</span>
                  <span className="text-[11px] text-green-600">On orders ₹{threshold}+</span>
                </div>
              );
            })()}
            <div className="space-y-1 text-sm">
              <Row label="Subtotal" value={inr(cart.subtotal)} />
              {cart.discount > 0 && <Row label={`Discount ${cart.coupon ? `(${cart.coupon.code})` : ''}`} value={`− ${inr(cart.discount)}`} green />}
              <Row label="Delivery" value={cart.deliveryFee === 0 ? 'Free Delivery' : inr(cart.deliveryFee)} green={cart.deliveryFee === 0} />
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-base font-bold">
                <span>Total</span><span>{inr(cart.total)}</span>
              </div>
            </div>
            <button onClick={() => { setOpen(false); nav('/checkout'); }} className="btn-primary mt-4 w-full">Proceed to Checkout</button>
          </div>
        )}
      </aside>
    </>
  );
}

const Row = ({ label, value, green }) => (
  <div className="flex justify-between text-slate-500">
    <span>{label}</span>
    <span className={green ? 'font-semibold text-green-600' : 'font-medium text-slate-700'}>{value}</span>
  </div>
);
