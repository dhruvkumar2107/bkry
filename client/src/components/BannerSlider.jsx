import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLACEHOLDER } from '../lib/format.js';

export default function BannerSlider({ banners = [] }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const touchX = useRef(null);

  const go = (i) => setIndex((i + banners.length) % banners.length);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer.current);
  }, [banners.length]);

  if (!banners.length) return null;

  const b = banners[index];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 50) go(index - 1);
        if (dx < -50) go(index + 1);
        touchX.current = null;
      }}
    >
      <div className="relative h-44 sm:h-64 lg:h-80 w-full">
        {banners.map((bn, i) => (
          <Link
            key={bn.id}
            to={bn.ctaLink || '/products'}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img src={bn.imageUrl} alt={bn.title} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-2 p-6 sm:p-10 text-white max-w-xl">
              {bn.subtitle && <span className="w-fit rounded-full bg-gold-500/90 px-3 py-1 text-xs font-bold uppercase tracking-wide">{bn.subtitle}</span>}
              <h2 className="font-brand text-2xl font-bold leading-tight drop-shadow sm:text-3xl lg:text-4xl">{bn.title}</h2>
              {bn.description && <p className="hidden max-w-md text-sm text-white/90 sm:block">{bn.description}</p>}
              {bn.ctaLabel && <span className="mt-1 w-fit rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold">{bn.ctaLabel}</span>}
            </div>
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 backdrop-blur hover:bg-white">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(index + 1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-700 backdrop-blur hover:bg-white">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
