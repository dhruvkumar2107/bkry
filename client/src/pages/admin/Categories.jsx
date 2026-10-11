import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import api, { apiError } from '../../lib/api.js';
import { toast } from '../../store/toast.js';
import { Modal, ConfirmDialog, PageLoader, Field, EmptyState } from '../../components/ui.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';

const empty = () => ({ name: '', description: '', imageUrl: '', icon: '', isActive: true, showOnHome: true, sortOrder: 0 });

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty());
  const [delId, setDelId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/admin/categories').then(({ data }) => setItems(data.categories)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openCreate = () => { setForm({ ...empty(), sortOrder: items.length }); setEditing('new'); };
  const openEdit = (c) => { setForm({ name: c.name, description: c.description || '', imageUrl: c.imageUrl || '', icon: c.icon || '', isActive: c.isActive, showOnHome: c.showOnHome, sortOrder: c.sortOrder }); setEditing(c.id); };

  const save = async () => {
    if (!form.name) return toast.error('Name is required');
    setSaving(true);
    try {
      if (editing === 'new') await api.post('/admin/categories', form);
      else await api.put(`/admin/categories/${editing}`, form);
      toast.success('Saved'); setEditing(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };
  const remove = async (id) => { try { await api.delete(`/admin/categories/${id}`); toast.success('Deleted'); load(); } catch (e) { toast.error(apiError(e)); } };

  const move = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    await api.post('/admin/categories/reorder', { orderedIds: next.map((c) => c.id) });
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-brand text-2xl font-bold">Categories</h1>
        <button onClick={openCreate} className="btn-primary py-2 text-sm"><Plus className="h-4 w-4" /> Add Category</button>
      </div>

      {items.length === 0 ? <EmptyState title="No categories yet" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Category</th><th>Products</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((c, i) => (
                <tr key={c.id}>
                  <td>
                    <div className="flex items-center gap-1 text-slate-300">
                      <GripVertical className="h-4 w-4" />
                      <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 disabled:opacity-30">↑</button>
                      <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-slate-400 disabled:opacity-30">↓</button>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover bg-cream-100" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-cream-100 text-lg">{c.icon || '🍬'}</div>}
                      <div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-400">{c.slug}</p></div>
                    </div>
                  </td>
                  <td className="text-slate-500">{c._count?.products ?? 0}</td>
                  <td>{c.isActive ? <span className="chip bg-green-100 text-green-700">Active</span> : <span className="chip bg-slate-100 text-slate-500">Hidden</span>}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDelId(c.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add Category' : 'Edit Category'} size="md">
        <div className="space-y-3">
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Icon (emoji)"><input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🍬" /></Field>
            <Field label="Sort order"><input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></Field>
          </div>
          <div>
            <p className="label">Image</p>
            <ImageUploader single images={form.imageUrl ? [{ url: form.imageUrl }] : []} onChange={(imgs) => setForm({ ...form, imageUrl: imgs[0]?.url || '' })} />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showOnHome} onChange={(e) => setForm({ ...form, showOnHome: e.target.checked })} className="h-4 w-4" /> Show on home</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => remove(delId)} title="Delete category?" message="Products in this category won't be deleted but will be unlinked." confirmLabel="Delete" danger />
    </div>
  );
}
