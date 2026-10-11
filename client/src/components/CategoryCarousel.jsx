import { Link } from 'react-router-dom';
import { PLACEHOLDER } from '../lib/format.js';

export default function CategoryCarousel({ categories = [], title = 'Shop by Category', vertical = false }) {
  if (!categories.length) return null;

  if (vertical) {
    return (
      <div className="flex flex-col gap-1">
        {categories.map((c) => (
          <Link key={c.id} to={`/category/${c.slug}`} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-cream-100 text-lg">
              {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : (c.icon || '🍬')}
            </span>
            <span className="line-clamp-1">{c.name}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 font-brand text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {categories.map((c) => (
          <Link key={c.id} to={`/category/${c.slug}`} className="group w-24 shrink-0 text-center sm:w-28">
            <div className="mx-auto aspect-square overflow-hidden rounded-2xl border border-slate-100 bg-cream-100 shadow-card transition group-hover:shadow-soft">
              <img src={c.imageUrl || PLACEHOLDER} alt={c.name} loading="lazy" onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            </div>
            <span className="mt-2 block text-xs font-semibold leading-tight text-slate-700 group-hover:text-brand-700">{c.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
