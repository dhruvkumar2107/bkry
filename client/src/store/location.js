import { create } from 'zustand';

const saved = (() => {
  try { return JSON.parse(localStorage.getItem('chotulal_location') || 'null'); } catch { return null; }
})();

export const useLocation = create((set) => ({
  location: saved,
  setLocation: (loc) => {
    if (loc) localStorage.setItem('chotulal_location', JSON.stringify(loc));
    else localStorage.removeItem('chotulal_location');
    set({ location: loc });
  },
}));
