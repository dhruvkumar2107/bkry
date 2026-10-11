import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { PageLoader, Modal, Field } from '../../components/ui.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';

const emptyBanner = () => ({ title: 'New banner', subtitle: '', description: '', imageUrl: '', ctaLabel: 'Shop now', ctaLink: '/products', bgColor: '', isActive: true, sortOrder: 0 });
const emptySection = () => ({ key: 'CUSTOM', title: 'New section', type: 'PRODUCT_CAROUSEL', categoryId: null, isActive: true, sortOrder: 0 });

const SECTION_PRESETS = [
  { key: 'FEATURED', title: 'Featured Sweets', type: 'PRODUCT_CAROUSEL' },
  { key: 'BESTSELLERS', title: 'Bestsellers', type: 'PRODUCT_CAROUSEL' },
  { key: 'NEW_ARRIVALS', title: 'New Arrivals', type: 'PRODUCT_CAROUSEL' },
  { key: 'OFFERS', title: 'Special Offers', type: 'PRODUCT_CAROUSEL' },
  { key: 'CATEGORIES', title: 'Shop by Category', type: 'CATEGORY_CAROUSEL' },
  { key: 'CUSTOM', title: 'Custom', type: 'PRODUCT_CAROUSEL' },
];

export default function AdminHomepage() {
  const [banners, setBanners] = useState([]);
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerEdit, setBannerEdit] = useState(null);
  const [sectionEdit, setSectionEdit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [b, s, c] = await Promise.all([
        api.get('/admin/homepage/banners'),
        api.get('/admin/homepage/sections'),
        api.get('/admin/categories'),
      ]);
      setBanners(b.data.banners);
      setSections(s.data.sections);
      setCategories(c.data.categories);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const persistBanner = async () => {
    try {
      if (bannerEdit.id) await api.put(`/admin/homepage/banners/${bannerEdit.id}`, bannerEdit);
      else await api.post('/admin/homepage/banners', bannerEdit);
      toast.success('Banner saved'); setBannerEdit(null); load();
    } catch (e) { toast.error(apiError(e)); }
  };
  const deleteBanner = async (id) => { try { await api.delete(`/admin/homepage/banners/${id}`); toast.success('Removed'); load(); } catch (e) { toast.error(apiError(e)); } };
  const moveBanner = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= banners.length) return;
    const next = [...banners]; [next[i], next[j]] = [next[j], next[i]]; setBanners(next);
    await api.post('/admin/homepage/banners/reorder', { orderedIds: next.map((b) => b.id) });
  };

  const persistSection = async () => {
    try {
      if (sectionEdit.id) await api.put(`/admin/homepage/sections/${sectionEdit.id}`, sectionEdit);
      else await api.post('/admin/homepage/sections', sectionEdit);
      toast.success('Section saved'); setSectionEdit(null); load();
    } catch (e) { toast.error(apiError(e)); }
  };
  const deleteSection = async (id) => { try { await api.delete(`/admin/homepage/sections/${id}`); toast.success('Removed'); load(); } catch (e) { toast.error(apiError(e)); } };
  const moveSection = async (i, dir) => {
    const j = i + dir; if (j < 0 || j >= sections.length) return;
    const next = [...sections]; [next[i], next[j]] = [next[j], next[i]]; setSections(next);
    await api.post('/admin/homepage/sections/reorder', { orderedIds: next.map((s) => s.id) });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 pb-20">
      <h1 className="font-brand text-2xl font-bold">Homepage Editor</h1>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Banners</h2>
          <button onClick={() => setBannerEdit(emptyBanner())} className="btn-outline py-1.5 text-xs"><Plus className="h-3 w-3" /> Add banner</button>
        </div>
        <div className="mt-4 space-y-3">
          {banners.length === 0 && <p className="text-sm text-slate-400">No banners yet.</p>}
          {banners.map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3">
              <div className="flex flex-col text-slate-300">
                <button onClick={() => moveBanner(i, -1)} disabled={i === 0} className="disabled:opacity-30">↑</button>
                <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} className="disabled:opacity-30">↓</button>
              </div>
              <img src={b.imageUrl} alt="" className="h-16 w-28 rounded-lg bg-cream-100 object-cover" />
              <div className="flex-1">
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-slate-400">{b.subtitle} {b.ctaLabel && `· ${b.ctaLabel}`}</p>
              </div>
              {b.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-slate-100 text-slate-500">Hidden</span>}
              <button onClick={() => setBannerEdit(b)} className="btn-outline py-1.5 text-xs">Edit</button>
              <button onClick={() => deleteBanner(b.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Home sections (top to bottom)</h2>
          <button onClick={() => setSectionEdit(emptySection())} className="btn-outline py-1.5 text-xs"><Plus className="h-3 w-3" /> Add section</button>
        </div>
        <div className="mt-4 space-y-2">
          {sections.length === 0 && <p className="text-sm text-slate-400">No sections yet.</p>}
          {sections.map((s, i) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3">
              <div className="flex flex-col text-slate-300">
                <button onClick={() => moveSection(i, -1)} disabled={i === 0} className="disabled:opacity-30">↑</button>
                <button onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1} className="disabled:opacity-30">↓</button>
              </div>
              <div className="flex-1">
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-slate-400">{s.type} · key: {s.key}{s.categoryId ? ` · ${categories.find((c) => c.id === s.categoryId)?.name || ''}` : ''}</p>
              </div>
              {s.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-slate-100 text-slate-500">Hidden</span>}
              <button onClick={() => setSectionEdit(s)} className="btn-outline py-1.5 text-xs">Edit</button>
              <button onClick={() => deleteSection(s.id)} className="rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <Modal open={!!bannerEdit} onClose={() => setBannerEdit(null)} title={bannerEdit?.id ? 'Edit banner' : 'Add banner'} size="lg">
        {bannerEdit && (
          <div className="space-y-3">
            <Field label="Image">
              <ImageUploader single images={bannerEdit.imageUrl ? [{ url: bannerEdit.imageUrl }] : []} onChange={(imgs) => setBannerEdit({ ...bannerEdit, imageUrl: imgs[0]?.url || '' })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title"><input className="input" value={bannerEdit.title} onChange={(e) => setBannerEdit({ ...bannerEdit, title: e.target.value })} /></Field>
              <Field label="Subtitle"><input className="input" value={bannerEdit.subtitle || ''} onChange={(e) => setBannerEdit({ ...bannerEdit, subtitle: e.target.value })} /></Field>
            </div>
            <Field label="Description"><input className="input" value={bannerEdit.description || ''} onChange={(e) => setBannerEdit({ ...bannerEdit, description: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="CTA label"><input className="input" value={bannerEdit.ctaLabel || ''} onChange={(e) => setBannerEdit({ ...bannerEdit, ctaLabel: e.target.value })} /></Field>
              <Field label="CTA link"><input className="input" value={bannerEdit.ctaLink || ''} onChange={(e) => setBannerEdit({ ...bannerEdit, ctaLink: e.target.value })} /></Field>
              <Field label="Background colour"><input className="input" value={bannerEdit.bgColor || ''} onChange={(e) => setBannerEdit({ ...bannerEdit, bgColor: e.target.value })} placeholder="#8a1c1c" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={bannerEdit.isActive} onChange={(e) => setBannerEdit({ ...bannerEdit, isActive: e.target.checked })} className="h-4 w-4" /> Active</label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setBannerEdit(null)} className="btn-outline">Cancel</button>
              <button onClick={persistBanner} className="btn-primary">Save</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!sectionEdit} onClose={() => setSectionEdit(null)} title={sectionEdit?.id ? 'Edit section' : 'Add section'} size="md">
        {sectionEdit && (
          <div className="space-y-3">
            <Field label="Preset">
              <select className="input" value={sectionEdit.key} onChange={(e) => {
                const preset = SECTION_PRESETS.find((p) => p.key === e.target.value);
                setSectionEdit({ ...sectionEdit, key: e.target.value, ...(preset && !sectionEdit.id ? { title: preset.title, type: preset.type } : {}) });
              }}>
                {SECTION_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.title} ({p.key})</option>)}
              </select>
            </Field>
            <Field label="Title"><input className="input" value={sectionEdit.title} onChange={(e) => setSectionEdit({ ...sectionEdit, title: e.target.value })} /></Field>
            <Field label="Type">
              <select className="input" value={sectionEdit.type} onChange={(e) => setSectionEdit({ ...sectionEdit, type: e.target.value })}>
                <option value="PRODUCT_CAROUSEL">Product carousel</option>
                <option value="CATEGORY_CAROUSEL">Category carousel</option>
              </select>
            </Field>
            <Field label="Filter by category (optional)">
              <select className="input" value={sectionEdit.categoryId || ''} onChange={(e) => setSectionEdit({ ...sectionEdit, categoryId: e.target.value || null })}>
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sectionEdit.isActive} onChange={(e) => setSectionEdit({ ...sectionEdit, isActive: e.target.checked })} className="h-4 w-4" /> Active</label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button onClick={() => setSectionEdit(null)} className="btn-outline">Cancel</button>
              <button onClick={persistSection} className="btn-primary">Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
