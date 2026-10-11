import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Sparkles } from 'lucide-react';
import { inr, PLACEHOLDER } from '../lib/format.js';
import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';

export default function ProductCard({ product }) {
  const add = useCart((s) => s.add);
  const [busy, setBusy] = useState(false);

  const variants = product.variants?.length ? product.variants : [];
  const [variantId, setVariantId] = useState(() => {
    const inStock = variants.find((v) => v.stock > 0);
    return (inStock || variants[0])?.id;
  });

  const selected = useMemo(() => variants.find((v) => v.id === variantId) || variants[0], [variants, variantId]);
  const discount = selected?.originalPrice && selected.originalPrice > selected.price
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
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not add to cart');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:shadow-soft">
      <Link to={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-cream-100">
        <img
          src={product.images?.[0]?.url || PLACEHOLDER}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.isBestseller && <span className="chip bg-gold-500 text-white"><Star className="h-3 w-3" /> Bestseller</span>}
          {product.isNewArrival && <span className="chip bg-brand-600 text-white"><Sparkles className="h-3 w-3" /> New</span>}
        </div>
        {discount > 0 && <span className="absolute right-2 top-2 chip bg-red-500 text-white">{discount}% OFF</span>}
        {outOfStock && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <span className="chip bg-slate-800 text-white">Out of stock</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link to={`/product/${product.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800 hover:text-brand-700">
          {product.name}
        </Link>
        <p className="mt-0.5 text-xs text-slate-400">{product.unit || `${variants.length} options`}</p>

        {variants.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setVariantId(v.id)}
                disabled={v.stock <= 0}
                className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition ${
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

        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-slate-900">{inr(selected?.price ?? product.minPrice)}</span>
              {selected?.originalPrice > selected?.price && (
                <span className="text-xs text-slate-400 line-through">{inr(selected.originalPrice)}</span>
              )}
            </div>
            {selected && selected.stock > 0 && selected.stock <= 5 && (
              <span className="text-[11px] font-semibold text-orange-600">Only {selected.stock} left</span>
            )}
          </div>

          <button
            onClick={onAdd}
            disabled={busy || outOfStock || !selected || selected.stock <= 0}
            className="btn-primary px-3 py-2 text-xs"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
