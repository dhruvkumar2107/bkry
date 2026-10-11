import { useRef, useState } from 'react';
import { Upload, X, Loader2, Link2 } from 'lucide-react';
import api from '../lib/api.js';
import { toast } from '../store/toast.js';

export default function ImageUploader({ images = [], onChange, single = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));
      const { data } = await api.post('/uploads/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const next = data.urls.map((url, i) => ({ url, alt: '', sortOrder: images.length + i }));
      onChange(single ? next.slice(0, 1) : [...images, ...next]);
      toast.success(`${data.urls.length} image(s) uploaded`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const addUrl = () => {
    if (!urlInput.trim()) return;
    onChange(single ? [{ url: urlInput.trim() }] : [...images, { url: urlInput.trim(), sortOrder: images.length }]);
    setUrlInput('');
  };

  const remove = (idx) => onChange(images.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const next = [...images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next.map((im, i) => ({ ...im, sortOrder: i })));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, i) => (
          <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200">
            <img src={img.url} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.3; }} />
            <button type="button" onClick={() => remove(i)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-500 opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
            {i > 0 && <button type="button" onClick={() => move(i, -1)} className="absolute bottom-1 left-1 rounded bg-white/90 px-1 text-[10px] opacity-0 group-hover:opacity-100">←</button>}
            {i < images.length - 1 && <button type="button" onClick={() => move(i, 1)} className="absolute bottom-1 right-1 rounded bg-white/90 px-1 text-[10px] opacity-0 group-hover:opacity-100">→</button>}
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="grid h-24 w-24 place-items-center rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-brand-400 hover:text-brand-600">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple={!single} className="hidden" onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }} />
      <div className="mt-2 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Link2 className="h-4 w-4 text-slate-400" />
          <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Or paste an image URL" className="w-full bg-transparent py-2 text-sm outline-none" />
        </div>
        <button type="button" onClick={addUrl} className="btn-outline">Add URL</button>
      </div>
    </div>
  );
}
