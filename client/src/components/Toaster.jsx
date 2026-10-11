import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToast } from '../store/toast.js';

const cfg = {
  success: { icon: CheckCircle2, cls: 'bg-green-50 text-green-800 border-green-200' },
  error: { icon: AlertCircle, cls: 'bg-red-50 text-red-800 border-red-200' },
  info: { icon: Info, cls: 'bg-blue-50 text-blue-800 border-blue-200' },
};

export default function Toaster() {
  const { toasts, remove } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => {
        const { icon: Icon, cls } = cfg[t.type] || cfg.info;
        return (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-soft ${cls}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100"><X className="h-4 w-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
