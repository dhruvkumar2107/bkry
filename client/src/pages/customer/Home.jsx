import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import BannerSlider from '../../components/BannerSlider.jsx';
import CategoryCarousel from '../../components/CategoryCarousel.jsx';
import ProductRow from '../../components/ProductRow.jsx';
import LocationModal from '../../components/LocationModal.jsx';
import { ProductCardSkeleton, EmptyState } from '../../components/ui.jsx';
import { useLocation } from '../../store/location.js';
import { Sparkles, Truck, BadgePercent, MapPin, ChevronRight } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, title: 'Freshly Made', text: 'Pure ingredients, made daily' },
  { icon: Truck, title: 'Fast Delivery', text: 'Right to your doorstep' },
  { icon: BadgePercent, title: 'Great Value', text: 'Honest prices, real offers' },
];

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-48 w-full rounded-2xl sm:h-64 lg:h-80" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locOpen, setLocOpen] = useState(false);
  const { location } = useLocation();

  const loadHome = () => {
    api.get('/catalog/home')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHome();
    const onFocus = () => loadHome();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading) return <div className="container-app py-5"><HomeSkeleton /></div>;
  if (!data) return <EmptyState title="Could not load the store" subtitle="Please refresh the page." />;

  const locLabel = location?.line1 || location?.city;

  return (
    <>
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
      {/* Desktop category sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 card p-3">
          <h3 className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Categories</h3>
          <CategoryCarousel categories={data.categories} vertical />
          <Link to="/products" className="mt-2 block rounded-xl bg-cream-100 px-3 py-2 text-center text-xs font-semibold text-brand-700 hover:bg-cream-200">View all products</Link>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Delivery / location info (desktop & tablet) */}
        <button
          onClick={() => setLocOpen(true)}
          className="mb-3 hidden sm:flex w-full items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-left text-sm shadow-card transition hover:border-brand-200"
        >
          <MapPin className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            <span className="text-slate-500">Deliver to </span>
            <span className="font-semibold text-slate-800">{locLabel || 'your location'}</span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-brand-700">Change</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
        </button>

        <BannerSlider banners={data.banners} />

        {/* Category cards (horizontal scrollable navigation) */}
        <div className="mt-2">
          <CategoryCarousel categories={data.categories} />
        </div>

        {/* Compact key-benefits strip */}
        <div className="my-2 grid grid-cols-3 gap-2 sm:gap-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-2.5 py-2.5 shadow-card sm:gap-3 sm:px-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 sm:h-10 sm:w-10"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-slate-800 sm:text-sm">{title}</span>
                <span className="hidden text-xs text-slate-400 sm:block">{text}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Product sections (category carousel handled above) */}
        {data.sections.map((s) => {
          if (s.type === 'CATEGORY_CAROUSEL') return null;
          return (
            <ProductRow
              key={s.id}
              title={s.title}
              products={s.products || []}
              viewAllLink={s.categoryId ? `/category/${(s.products?.[0]?.categories || []).find((c) => c.id === s.categoryId)?.slug || ''}` : '/products'}
            />
          );
        })}
      </div>
    </div>

      <LocationModal open={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}
