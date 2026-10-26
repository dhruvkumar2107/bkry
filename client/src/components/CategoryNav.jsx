import { useEffect, useRef, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import api from '../lib/api.js';

let cache = null;

export default function CategoryNav({ categories: provided, sticky = false, className = '' }) {
  const { slug } = useParams();
  const [categories, setCategories] = useState(provided || cache || []);
  const scroller = useRef(null);

  useEffect(() => {
    if (provided || cache) return;
    api.get('/catalog/categories')
      .then(({ data }) => { cache = data.categories; setCategories(data.categories); })
      .catch(() => {});
  }, [provided]);

  if (!categories.length) return null;

  const base = 'shrink-0 snap-item rounded-full border px-3.5 py-1.5 text-sm font-medium transition whitespace-nowrap';
  const idle = 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700';
  const active = 'border-brand-600 bg-brand-600 text-white';

  return (
    <nav aria-label="Product categories" className={`${sticky ? 'sticky top-[104px] z-30 md:top-[60px]' : ''} ${className}`}>
      <div ref={scroller} className="scroll-x border-b border-slate-100 bg-cream-50/60 py-2">
        <NavLink to="/products" end className={({ isActive }) => `${base} ${isActive && !slug ? active : idle}`}>All</NavLink>
        {categories.map((c) => (
          <NavLink
            key={c.id}
            to={`/category/${c.slug}`}
            className={() => `${base} ${slug === c.slug ? active : idle}`}
          >
            {c.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
