import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard.jsx';

export default function ProductRow({ title, subtitle, products = [], viewAllLink }) {
  const scroller = useRef(null);
  if (!products.length) return null;

  const scroll = (dir) => {
    if (!scroller.current) return;
    scroller.current.scrollBy({ left: dir * (scroller.current.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-brand text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {viewAllLink && <Link to={viewAllLink} className="btn-outline px-3 py-1.5 text-xs">View All</Link>}
          <div className="hidden gap-1 sm:flex">
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="rounded-full border border-slate-200 bg-white p-1.5 hover:border-brand-300"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="rounded-full border border-slate-200 bg-white p-1.5 hover:border-brand-300"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-start sm:w-48 lg:w-52">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
