import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Star, Sparkles, Loader2 } from 'lucide-react';
import { inr, PLACEHOLDER } from '../lib/format.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';

export default function ProductCard({ product, className = '' }) {
  const cart = useCart((s) => s.cart);
  const add = useCart((s) => s.add);
  const updateQty = useCart((s) => s.updateQty);
  const remove = useCart((s) => s.remove);
  const [busy, setBusy] = useState(false);

  const variants = product.variants?.length ? product.variants : [];
  const [variantId, setVariantId] = useState(() => {
    const inStock = variants.find((v) => v.stock > 0);
    return (inStock || variants[0])?.id;
  });

  const selected = useMemo(() => variants.find((v) => v.id === variantId) || variants[0], [variants, variantId]);
  const inCart = cart.items.find((i) => i.variantId === selected?.id);

  const discount =
    selected?.originalPrice && selected.originalPrice > selected.price
      ? Math.round(((selected.originalPrice - selected.price) / selected.originalPrice) * 100)
      : product.originalPrice && product.originalPrice > product.minPrice
        ? Math.round(((product.originalPrice - product.minPrice) / product.originalPrice) * 100)
        : 0;

  const outOfStock = !product.inStock;

  const onAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selected || selected.stock <= 0) return toast.error('This variant is out of stock');
    setBusy(true);
    try {
      await add(selected.id, 1);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not add to cart');
    } finally {
      setBusy(false);
    }
  };

  const changeQty = async (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inCart) return;
    setBusy(true);
    try {
      if (inCart.quantity + delta <= 0) await remove(inCart.id);
      else await updateQty(inCart.id, inCart.quantity + delta);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not update cart');
    } finally {
      setBusy(false);
    }
  };

  const price = selected?.price ?? product.minPrice;

  return (
    <article className={`group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition duration-200 hover:shadow-lift ${className}`}>
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-cream-100">
        <img
          src={product.images?.[0]?.url || PLACEHOLDER}
          alt={product.name}
          loading="lazy"
          decoding="async"
          width="400"
          height="400"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-1.5 top-1.5 flex flex-col items-start gap-1">
          {product.isBestseller && <span className="chip bg-gold-500/95 text-white shadow-sm"><Star className="h-3 w-3" /> Bestseller</span>}
          {product.isNewArrival && <span className="chip bg-brand-600/95 text-white shadow-sm"><Sparkles className="h-3 w-3" /> New</span>}
        </div>
        {discount > 0 && (
          <span className="absolute right-1.5 top-1.5 chip bg-red-500 text-white shadow-sm">{discount}% OFF</span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <span className="chip bg-slate-800 text-white">Out of stock</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <Link to={`/product/${product.slug}`} title={product.name} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-800 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-0.5 truncate text-xs text-slate-400">{product.unit || (variants.length > 1 ? `${variants.length} sizes` : 'Freshly made')}</p>

        {variants.length > 1 && (
          <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                disabled={v.stock <= 0}
                aria-label={`Select ${v.label}${v.stock <= 0 ? ' (out of stock)' : ''}`}
                className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[11px] font-medium transition ${
                  v.id === variantId
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : v.stock <= 0
                      ? 'border-slate-100 text-slate-300 line-through'
                      : 'border-slate-200 text-slate-500 hover:border-brand-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-900">{inr(price)}</span>
              {selected?.originalPrice > selected?.price && (
                <span className="text-xs text-slate-400 line-through">{inr(selected.originalPrice)}</span>
              )}
            </div>
            {selected && selected.stock > 0 && selected.stock <= 5 && (
              <span className="text-[11px] font-semibold text-orange-600">Only {selected.stock} left</span>
            )}
          </div>

          {inCart ? (
            <div className="flex items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-0.5">
              <button onClick={(e) => changeQty(e, -1)} disabled={busy} aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center rounded-lg text-brand-700 hover:bg-brand-100">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[16px] text-center text-sm font-bold text-brand-700">{inCart.quantity}</span>
              <button onClick={(e) => changeQty(e, 1)} disabled={busy || (selected && inCart.quantity >= selected.stock)} aria-label="Increase quantity" className="grid h-7 w-7 place-items-center rounded-lg text-brand-700 hover:bg-brand-100 disabled:opacity-40">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAdd}
              disabled={busy || outOfStock || !selected || selected.stock <= 0}
              aria-label={`Add ${product.name} to cart`}
              className="btn-primary btn-sm gap-1"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
