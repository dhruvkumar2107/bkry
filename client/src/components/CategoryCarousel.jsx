import { NavLink } from 'react-router-dom';
import { PLACEHOLDER } from '../lib/format.js';

export default function CategoryCarousel({ categories = [], title = 'Shop by Category', vertical = false }) {
  if (!categories.length) return null;

  if (vertical) {
    return (
      <nav aria-label="Categories" className="flex flex-col gap-0.5">
        {categories.map((c) => (
          <NavLink
            key={c.id}
            to={`/category/${c.slug}`}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-cream-100 hover:text-brand-700'
              }`
            }
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-cream-100 text-lg">
              {c.imageUrl ? (
                <img src={c.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (c.icon || '🍬')}
            </span>
            <span className="line-clamp-1">{c.name}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <section className="section">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="scroll-x gap-2.5 sm:gap-4 pb-1">
        {categories.map((c) => (
          <NavLink
            key={c.id}
            to={`/category/${c.slug}`}
            className={({ isActive }) =>
              `group snap-item flex flex-col items-center w-[78px] sm:w-28 shrink-0 text-center rounded-2xl p-1.5 transition ${
                isActive ? 'bg-brand-50/70' : 'hover:bg-slate-50'
              }`
            }
          >
            <div className="aspect-square w-16 sm:w-20 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-xs transition duration-300 group-hover:scale-105 group-hover:border-brand-400 group-hover:shadow-card">
              <img
                src={c.imageUrl || PLACEHOLDER}
                alt={c.name}
                loading="lazy"
                decoding="async"
                width="160"
                height="160"
                onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="mt-1.5 line-clamp-2 w-full text-[11px] sm:text-xs font-semibold leading-tight text-slate-800 group-hover:text-brand-700">
              {c.name}
            </span>
          </NavLink>
        ))}
      </div>
    </section>
  );
}
