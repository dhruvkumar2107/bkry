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
    timer.current = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5500);
    return () => clearInterval(timer.current);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-cream-100 shadow-card"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => clearInterval(timer.current)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 50) go(index - 1);
        if (dx < -50) go(index + 1);
        touchX.current = null;
      }}
    >
      <div className="relative h-44 w-full sm:h-56 md:h-64 lg:h-72">
        {banners.map((bn, i) => (
          <Link
            key={bn.id}
            to={bn.ctaLink || '/products'}
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
            style={bn.bgColor ? { backgroundColor: bn.bgColor } : undefined}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <img
              src={bn.imageUrl}
              alt={bn.imageAlt || bn.title || ''}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
              className="h-full w-full object-cover"
            />
            {/* Layered scrim keeps the overlaid text legible on any photo. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-0 flex max-w-xl flex-col justify-end gap-2 p-5 text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.6)] sm:justify-center sm:p-10">
              {bn.subtitle && (
                <span className="w-fit rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white [text-shadow:none] shadow-sm">{bn.subtitle}</span>
              )}
              <h2 className="font-brand text-2xl font-bold text-white leading-tight sm:text-3xl lg:text-4xl">{bn.title}</h2>
              {bn.description && <p className="line-clamp-2 max-w-md text-sm text-white/95 sm:text-base">{bn.description}</p>}
              {bn.ctaLabel && (
                <span className="mt-1 w-fit rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-brand-700 [text-shadow:none]">{bn.ctaLabel}</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => go(index - 1)} aria-label="Previous slide" className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-700 shadow-sm backdrop-blur hover:bg-white sm:block">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => go(index + 1)} aria-label="Next slide" className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-slate-700 shadow-sm backdrop-blur hover:bg-white sm:block">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
