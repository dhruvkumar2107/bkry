import { useEffect, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import api from '../lib/api.js';
import ProductCard from './ProductCard.jsx';
import { PageLoader, EmptyState, Pagination } from './ui.jsx';

const SORTS = [
  { value: 'popular', label: 'Popularity' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

export default function ProductBrowser({ title, subtitle, baseParams = {}, showTitle = true }) {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sort: 'popular', minPrice: '', maxPrice: '', inStock: false });
  const [openFilters, setOpenFilters] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = { ...baseParams, page, limit: 24 };
      if (filters.sort) params.sort = filters.sort;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.inStock) params.inStock = 'true';
      const { data } = await api.get('/catalog/products', { params });
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Reload whenever the base query (category/search) or filters change.
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [JSON.stringify(baseParams), filters.sort, filters.inStock, filters.minPrice, filters.maxPrice]);

  const clearFilters = () => setFilters({ sort: 'popular', minPrice: '', maxPrice: '', inStock: false });
  const activeFilters = filters.minPrice || filters.maxPrice || filters.inStock;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {showTitle && <h1 className="font-brand text-2xl font-bold text-slate-900">{title}</h1>}
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          <p className="text-xs text-slate-400">{pagination.total} products</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="input w-auto py-2 text-sm">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setOpenFilters((v) => !v)} className="btn-outline py-2 text-sm">
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilters && <span className="ml-1 h-2 w-2 rounded-full bg-brand-600" />}
          </button>
        </div>
      </div>

      {openFilters && (
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm">
            <span className="label">Min price</span>
            <input type="number" className="input w-28 py-2" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} placeholder="₹" />
          </label>
          <label className="text-sm">
            <span className="label">Max price</span>
            <input type="number" className="input w-28 py-2" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} placeholder="₹" />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
            <input type="checkbox" checked={filters.inStock} onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })} className="h-4 w-4 rounded" />
            In stock only
          </label>
          {activeFilters && <button onClick={clearFilters} className="btn-ghost py-2 text-sm"><X className="h-4 w-4" /> Clear filters</button>}
        </div>
      )}

      {loading ? (
        <PageLoader label="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyState title="No products found" subtitle="Try changing your filters or search for something else."
          action={activeFilters ? <button onClick={clearFilters} className="btn-primary">Clear filters</button> : null} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} onChange={load} />
        </>
      )}
    </div>
  );
}
