import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Copy, Search, Download, Upload, Minus } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { inr } from '../../lib/format.js';
import { Modal, ConfirmDialog, PageLoader, Pagination, Field, EmptyState } from '../../components/ui.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';

const emptyVariant = () => ({ label: '250 g', weightGrams: 250, price: 0, originalPrice: null, stock: 0, isActive: true, sortOrder: 0 });
const emptyForm = () => ({
  name: '', slug: '', description: '', sku: '', basePrice: 0, originalPrice: null, unit: 'per kg',
  ingredients: '', allergens: '', isActive: true, isFeatured: false, isBestseller: false, isNewArrival: false,
  categoryIds: [], images: [], variants: [emptyVariant()],
});

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [selected, setSelected] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({ priceMode: 'NONE', priceValue: 0, stockMode: 'NONE', stockValue: 0 });

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/products', { params: { page, limit: 20, q: q || undefined, categoryId: catFilter || undefined } });
      setProducts(data.products);
      setPagination(data.pagination);
    } finally { setLoading(false); }
  };

  useEffect(() => { api.get('/admin/categories').then(({ data }) => setCategories(data.categories)); }, []);
  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [q, catFilter]); // eslint-disable-line

  const openCreate = () => { setForm(emptyForm()); setEditing('new'); };
  const openEdit = (p) => {
    setForm({
      name: p.name, slug: p.slug, description: p.description || '', sku: p.sku || '', basePrice: p.basePrice,
      originalPrice: p.originalPrice, unit: p.unit || '', ingredients: p.ingredients || '', allergens: p.allergens || '',
      isActive: p.isActive, isFeatured: p.isFeatured, isBestseller: p.isBestseller, isNewArrival: p.isNewArrival,
      categoryIds: p.categoryIds, images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
      variants: p.variants.map((v) => ({ id: v.id, label: v.label, weightGrams: v.weightGrams, price: v.price, originalPrice: v.originalPrice, stock: v.stock, isActive: v.isActive, sortOrder: v.sortOrder })),
    });
    setEditing(p.id);
  };

  const save = async () => {
    if (!form.name) return toast.error('Product name is required');
    setSaving(true);
    try {
      if (editing === 'new') await api.post('/admin/products', form);
      else await api.put(`/admin/products/${editing}`, form);
      toast.success('Product saved');
      setEditing(null);
      load(pagination.page);
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const togglePublish = async (p) => {
    try {
      await api.put(`/admin/products/${p.id}`, { isActive: !p.isActive });
      toast.success(p.isActive ? `"${p.name}" hidden` : `"${p.name}" published`);
      setProducts((prev) => prev.map((item) => (item.id === p.id ? { ...item, isActive: !item.isActive } : item)));
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (id) => { try { await api.delete(`/admin/products/${id}`); toast.success('Product deleted'); load(pagination.page); } catch (e) { toast.error(apiError(e)); } };
  const duplicate = async (id) => { try { await api.post(`/admin/products/${id}/duplicate`); toast.success('Duplicated'); load(); } catch (e) { toast.error(apiError(e)); } };

  const exportCsv = async () => {
    const res = await api.get('/admin/products/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'chotulal-products.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    try { const { data } = await api.post('/admin/products/import/csv', { csv: importText }); toast.success(`Imported: ${data.created} new, ${data.updated} updated`); setImportOpen(false); setImportText(''); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const onImportFile = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setImportText(r.result); r.readAsText(f); };

  const runBulk = async () => {
    try {
      await api.post('/admin/products/bulk-update', {
        confirm: true, variantIds: selected,
        price: { mode: bulk.priceMode, value: Number(bulk.priceValue) },
        stock: { mode: bulk.stockMode, value: Number(bulk.stockValue) },
      });
      toast.success('Bulk update applied'); setBulkOpen(false); setSelected([]); load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const toggleSelect = (vid) => setSelected((s) => (s.includes(vid) ? s.filter((x) => x !== vid) : [...s, vid]));
  const setVariant = (i, patch) => setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { ...emptyVariant(), sortOrder: f.variants.length }] }));
  const addPresetVariant = (label, weightGrams, multiplier = 1) => {
    const baseP = Number(form.basePrice) || 100;
    const price = Math.round(baseP * multiplier);
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { label, weightGrams, price, originalPrice: null, stock: 20, isActive: true, sortOrder: f.variants.length }],
    }));
  };
  const removeVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-brand text-2xl font-bold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="btn-outline py-2 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
          <button onClick={() => setImportOpen(true)} className="btn-outline py-2 text-sm"><Upload className="h-4 w-4" /> Import CSV</button>
          <button onClick={openCreate} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> Add Product</button>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="w-full bg-transparent py-2 text-sm outline-none" />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input w-auto py-2 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {selected.length > 0 && <button onClick={() => setBulkOpen(true)} className="btn-gold py-2 text-sm">Bulk update ({selected.length})</button>}
      </div>

      {loading ? <PageLoader /> : products.length === 0 ? <EmptyState title="No products found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th></th><th>Product</th><th>Categories</th><th>Price</th><th>Variants / Stock</th><th>Flags</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      {p.variants.map((v) => (
                        <input key={v.id} type="checkbox" checked={selected.includes(v.id)} onChange={() => toggleSelect(v.id)} title={`${v.label}: ${v.stock}`} className="h-3.5 w-3.5" />
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={p.images[0]?.url} alt="" className="h-10 w-10 rounded-lg object-cover bg-cream-100" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs text-slate-500">{p.categories.map((c) => c.name).join(', ') || '—'}</td>
                  <td className="font-medium">{inr(p.basePrice)}</td>
                  <td className="text-xs">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex items-center gap-1">
                        <span className="text-slate-500">{v.label}</span>
                        <span className={`font-semibold ${v.stock <= 0 ? 'text-red-500' : v.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>{v.stock}</span>
                      </div>
                    ))}
                    <span className="text-slate-400">Total: {p.totalStock}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.isFeatured && <span className="chip bg-slate-800 text-white text-[10px]">Featured</span>}
                      {p.isBestseller && <span className="chip bg-amber-100 text-amber-700 text-[10px]">Bestseller</span>}
                      {p.isNewArrival && <span className="chip bg-brand-100 text-brand-700 text-[10px]">New</span>}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => togglePublish(p)}
                      title={p.isActive ? 'Click to hide from store' : 'Click to publish on store'}
                      className={`chip cursor-pointer transition font-medium text-xs ${
                        p.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {p.isActive ? '● Published' : '○ Hidden'}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700" title="Edit Product"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => duplicate(p.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Duplicate Product"><Copy className="h-4 w-4" /></button>
                      <button onClick={() => setDelId(p.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete Product"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={pagination.page} pages={pagination.pages} onChange={load} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Product' : 'Edit Product'} size="xl">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="SKU / code"><input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Base price (₹)"><input type="number" className="input" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} /></Field>
            <Field label="Original price (₹)"><input type="number" className="input" value={form.originalPrice ?? ''} onChange={(e) => setForm({ ...form, originalPrice: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Unit"><input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field>
          </div>

          <div>
            <p className="label">Categories</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label key={c.id} className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm ${form.categoryIds.includes(c.id) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'}`}>
                  <input type="checkbox" className="hidden" checked={form.categoryIds.includes(c.id)} onChange={(e) => setForm({ ...form, categoryIds: e.target.checked ? [...form.categoryIds, c.id] : form.categoryIds.filter((x) => x !== c.id) })} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="label">Images</p>
            <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="label mb-0 font-medium text-slate-800">Product Variants (Weights / Packs)</p>
                <p className="text-[11px] text-slate-400">Quick add standard Indian sweet packs:</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => addPresetVariant('250 g', 250, 0.25)} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition">+ 250 g</button>
                <button type="button" onClick={() => addPresetVariant('500 g', 500, 0.5)} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition">+ 500 g</button>
                <button type="button" onClick={() => addPresetVariant('1 kg', 1000, 1)} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition">+ 1 kg</button>
                <button type="button" onClick={() => addPresetVariant('1 piece', null, 0.1)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition">+ 1 pc</button>
                <button type="button" onClick={addVariant} className="btn-outline py-1 text-xs"><Plus className="h-3 w-3" /> Custom</button>
              </div>
            </div>

            <div className="mt-2.5 hidden grid-cols-6 gap-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sm:grid">
              <span>Label</span>
              <span>Weight (g)</span>
              <span>Selling (₹)</span>
              <span>MRP (₹)</span>
              <span>Stock</span>
              <span></span>
            </div>

            <div className="mt-1 space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 p-3 sm:grid-cols-6">
                  <input className="input" value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} placeholder="Label (e.g. 500 g)" />
                  <input type="number" className="input" value={v.weightGrams ?? ''} onChange={(e) => setVariant(i, { weightGrams: e.target.value ? Number(e.target.value) : null })} placeholder="Weight in g" />
                  <input type="number" className="input" value={v.price} onChange={(e) => setVariant(i, { price: Math.max(0, Number(e.target.value)) })} placeholder="Selling ₹" />
                  <input type="number" className="input" value={v.originalPrice ?? ''} onChange={(e) => setVariant(i, { originalPrice: e.target.value ? Math.max(0, Number(e.target.value)) : null })} placeholder="MRP ₹" />
                  <input type="number" className="input" value={v.stock} onChange={(e) => setVariant(i, { stock: Math.max(0, Number(e.target.value)) })} placeholder="Stock qty" />
                  <button type="button" onClick={() => removeVariant(i)} className="rounded-lg text-slate-400 hover:text-red-500 transition" title="Remove variant"><Minus className="mx-auto h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ingredients (optional)"><input className="input" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} /></Field>
            <Field label="Allergens (optional)"><input className="input" value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })} /></Field>
          </div>

          <div className="flex flex-wrap gap-4">
            {[['isActive', 'Active / visible'], ['isFeatured', 'Featured'], ['isBestseller', 'Bestseller'], ['isNewArrival', 'New arrival']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4" /> {label}</label>
            ))}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save product'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import products from CSV" size="lg">
        <p className="mb-3 text-sm text-slate-500">Columns: sku,name,slug,categories,description,basePrice,originalPrice,unit,isActive,isFeatured,isBestseller,isNewArrival,variantLabel,variantPrice,variantStock. Categories separated by <code>|</code>.</p>
        <input type="file" accept=".csv" onChange={onImportFile} className="input" />
        <textarea className="input mt-2 font-mono text-xs" rows={6} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste CSV here…" />
        <div className="mt-3 flex justify-end gap-2"><button onClick={() => setImportOpen(false)} className="btn-outline">Cancel</button><button onClick={runImport} className="btn-primary">Import</button></div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={`Bulk update ${selected.length} variant(s)`} size="sm">
        <div className="space-y-4">
          <div>
            <p className="label">Price</p>
            <div className="flex gap-2">
              <select className="input" value={bulk.priceMode} onChange={(e) => setBulk({ ...bulk, priceMode: e.target.value })}>
                <option value="NONE">No change</option><option value="PERCENT">Adjust by %</option><option value="FLAT">Adjust by ₹</option><option value="SET">Set to</option>
              </select>
              <input type="number" className="input w-28" value={bulk.priceValue} onChange={(e) => setBulk({ ...bulk, priceValue: e.target.value })} />
            </div>
          </div>
          <div>
            <p className="label">Stock</p>
            <div className="flex gap-2">
              <select className="input" value={bulk.stockMode} onChange={(e) => setBulk({ ...bulk, stockMode: e.target.value })}>
                <option value="NONE">No change</option><option value="DELTA">Adjust by</option><option value="SET">Set to</option>
              </select>
              <input type="number" className="input w-28" value={bulk.stockValue} onChange={(e) => setBulk({ ...bulk, stockValue: e.target.value })} />
            </div>
          </div>
          <button onClick={runBulk} className="btn-gold w-full">Apply bulk update</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => remove(delId)} title="Delete product?" message="This removes the product and all its variants. This cannot be undone." confirmLabel="Delete" danger />
    </div>
  );
}
