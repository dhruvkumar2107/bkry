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
    <section className="section">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewAllLink && <Link to={viewAllLink} className="btn-outline btn-sm">View All</Link>}
          <div className="hidden gap-1 sm:flex lg:hidden">
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className="icon-btn h-8 w-8 border border-slate-200 bg-white"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className="icon-btn h-8 w-8 border border-slate-200 bg-white"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="scroll-x scroll-px-4 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:pb-0 xl:grid-cols-5"
        aria-label={`${title} products`}
      >
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 snap-item sm:w-48 lg:w-auto lg:shrink">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
