import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api.js';
import ProductBrowser from '../../components/ProductBrowser.jsx';
import CategoryNav from '../../components/CategoryNav.jsx';
import { PageLoader } from '../../components/ui.jsx';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/catalog/categories')
      .then(({ data }) => setCategory(data.categories.find((c) => c.slug === slug) || null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <PageLoader />;

  return (
    <div>
      <nav className="mb-2 text-xs text-slate-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">Home</Link> / <span className="text-slate-600">{category?.name || slug}</span>
      </nav>
      <div className="mb-3"><CategoryNav /></div>
      {category?.bannerUrl && (
        <div className="mb-4 overflow-hidden rounded-2xl">
          <img src={category.bannerUrl} alt={category.name} className="h-36 w-full object-cover sm:h-48" />
        </div>
      )}
      <ProductBrowser
        title={category?.name || 'Category'}
        subtitle={category?.description}
        baseParams={{ category: slug }}
      />
    </div>
  );
}
