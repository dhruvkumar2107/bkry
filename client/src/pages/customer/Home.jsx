import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api.js';
import BannerSlider from '../../components/BannerSlider.jsx';
import CategoryCarousel from '../../components/CategoryCarousel.jsx';
import ProductRow from '../../components/ProductRow.jsx';
import { PageLoader, EmptyState } from '../../components/ui.jsx';
import { BadgePercent, Sparkles, TrendingUp } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, title: 'Freshly Made', text: 'Prepared daily with pure ingredients' },
  { icon: TrendingUp, title: 'Fast Delivery', text: 'To your door in Bijapur Locality' },
  { icon: BadgePercent, title: 'Best Prices', text: 'Offers & combos on every order' },
];

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/catalog/home')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader label="Loading Chotulal Sweets…" />;
  if (!data) return <EmptyState title="Could not load the store" subtitle="Please refresh the page." />;

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-6">
      {/* Desktop category sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 card p-3">
          <h3 className="px-2 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Categories</h3>
          <CategoryCarousel categories={data.categories} vertical />
          <Link to="/products" className="mt-2 block rounded-xl bg-cream-100 px-3 py-2 text-center text-xs font-semibold text-brand-700">View all products</Link>
        </div>
      </aside>

      <div className="min-w-0">
        <BannerSlider banners={data.banners} />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card flex items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{title}</p>
                <p className="text-xs text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 lg:hidden">
          <CategoryCarousel categories={data.categories} />
        </div>

        {data.sections.map((s) => {
          if (s.type === 'CATEGORY_CAROUSEL') {
            return <CategoryCarousel key={s.id} categories={data.categories} title={s.title} />;
          }
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
  );
}
