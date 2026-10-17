import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Star, Sparkles, ShieldCheck, Truck, Leaf } from 'lucide-react';
import api from '../../lib/api.js';
import { inr, PLACEHOLDER } from '../../lib/format.js';
import { useCart } from '../../store/cart.js';
import { toast } from '../../store/toast.js';
import { PageLoader, EmptyState, Badge } from '../../components/ui.jsx';
import ProductRow from '../../components/ProductRow.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variantId, setVariantId] = useState(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const add = useCart((s) => s.add);

  const loadProduct = () => {
    api.get(`/catalog/products/${slug}`)
      .then(({ data }) => {
        setData(data);
        const inStock = data.product.variants.find((v) => v.stock > 0);
        setVariantId((prev) => prev && data.product.variants.some((v) => v.id === prev) ? prev : (inStock || data.product.variants[0])?.id || null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadProduct();
    const onFocus = () => loadProduct();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [slug]);

  if (loading) return <PageLoader />;
  if (!data) return <EmptyState title="Product not found" subtitle="This product may have been removed." action={<Link to="/products" className="btn-primary">Browse products</Link>} />;

  const p = data.product;
  const selected = p.variants.find((v) => v.id === variantId) || p.variants[0];
  const discount = selected?.originalPrice > selected?.price
    ? Math.round(((selected.originalPrice - selected.price) / selected.originalPrice) * 100) : 0;

  const onAdd = async () => {
    if (!selected || selected.stock <= 0) return toast.error('This variant is out of stock');
    try {
      await add(selected.id, qty);
      toast.success(`${qty} × ${p.name} (${selected.label}) added to cart`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not add to cart');
    }
  };

  return (
    <div>
      <nav className="mb-4 text-xs text-slate-400">
        <Link to="/" className="hover:text-brand-700">Home</Link>
        {p.categories[0] && <> / <Link to={`/category/${p.categories[0].slug}`} className="hover:text-brand-700">{p.categories[0].name}</Link></>}
        {' '}/ <span className="text-slate-600">{p.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="card overflow-hidden">
            <img src={p.images[activeImg]?.url || PLACEHOLDER} alt={p.name} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} className="aspect-square w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((img, i) => (
                <button key={img.id} onClick={() => setActiveImg(i)} className={`h-16 w-16 overflow-hidden rounded-xl border-2 ${i === activeImg ? 'border-brand-600' : 'border-transparent'}`}>
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            {p.isBestseller && <Badge className="bg-gold-500 text-white"><Star className="h-3 w-3" /> Bestseller</Badge>}
            {p.isNewArrival && <Badge className="bg-brand-600 text-white"><Sparkles className="h-3 w-3" /> New Arrival</Badge>}
            {p.isFeatured && <Badge className="bg-slate-800 text-white">Featured</Badge>}
          </div>
          <h1 className="mt-2 font-brand text-2xl font-bold text-slate-900 sm:text-3xl">{p.name}</h1>
          {p.sku && <p className="text-xs text-slate-400">Code: {p.sku}</p>}
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{p.description}</p>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{inr(selected?.price)}</span>
            {selected?.originalPrice > selected?.price && <span className="text-base text-slate-400 line-through">{inr(selected.originalPrice)}</span>}
            {discount > 0 && <span className="chip bg-red-100 text-red-700">{discount}% OFF</span>}
          </div>

          <div className="mt-5">
            <p className="label">Select weight / pack</p>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  disabled={v.stock <= 0}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                    v.id === variantId ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : v.stock <= 0 ? 'border-slate-100 text-slate-300 line-through' : 'border-slate-200 text-slate-600 hover:border-brand-300'
                  }`}
                >
                  {v.label} · {inr(v.price)}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <p className={`mt-3 text-sm font-semibold ${selected.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {selected.stock > 0 ? (selected.stock <= 5 ? `Only ${selected.stock} left in stock` : 'In stock') : 'Out of stock'}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="text-slate-500"><Minus className="h-4 w-4" /></button>
              <span className="min-w-[20px] text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((n) => Math.min(selected?.stock || 1, n + 1))} className="text-slate-500"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={onAdd} disabled={!selected || selected.stock <= 0} className="btn-primary flex-1 py-3">
              <ShoppingCart className="h-4 w-4" /> Add to Cart
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            <div className="rounded-xl bg-cream-50 p-3"><Truck className="mx-auto mb-1 h-4 w-4 text-brand-600" /> Fast delivery</div>
            <div className="rounded-xl bg-cream-50 p-3"><Leaf className="mx-auto mb-1 h-4 w-4 text-brand-600" /> Freshly made</div>
            <div className="rounded-xl bg-cream-50 p-3"><ShieldCheck className="mx-auto mb-1 h-4 w-4 text-brand-600" /> Hygienic</div>
          </div>

          {(p.ingredients || p.allergens) && (
            <div className="mt-5 card p-4 text-sm">
              {p.ingredients && <p><span className="font-semibold">Ingredients:</span> {p.ingredients}</p>}
              {p.allergens && <p className="mt-1 text-slate-500"><span className="font-semibold">Allergens:</span> {p.allergens}</p>}
            </div>
          )}
        </div>
      </div>

      {data.related?.length > 0 && (
        <div className="mt-8">
          <ProductRow title="You may also like" products={data.related} />
        </div>
      )}
    </div>
  );
}
