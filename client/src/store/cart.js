import { create } from 'zustand';
import api from '../lib/api.js';

export const useCart = create((set, get) => ({
  cart: { items: [], subtotal: 0, total: 0, discount: 0, deliveryFee: 0, taxAmount: 0 },
  couponCode: '',
  loading: false,
  open: false,

  setOpen: (open) => set({ open }),

  fetch: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/cart', { params: { coupon: get().couponCode || undefined } });
      set({ cart: data.cart, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  applyCoupon: async (code) => {
    set({ couponCode: code });
    const { data } = await api.get('/cart', { params: { coupon: code || undefined } });
    set({ cart: data.cart });
    return data.cart;
  },

  add: async (variantId, quantity = 1) => {
    const { data } = await api.post('/cart/items', { variantId, quantity }, { params: { coupon: get().couponCode || undefined } });
    set({ cart: data.cart, open: true });
    return data.cart;
  },

  updateQty: async (itemId, quantity) => {
    const { data } = await api.patch(`/cart/items/${itemId}`, { quantity }, { params: { coupon: get().couponCode || undefined } });
    set({ cart: data.cart });
  },

  remove: async (itemId) => {
    const { data } = await api.delete(`/cart/items/${itemId}`, { params: { coupon: get().couponCode || undefined } });
    set({ cart: data.cart });
  },

  clear: async () => {
    const { data } = await api.delete('/cart');
    set({ cart: data.cart, couponCode: '' });
  },

  count: () => get().cart.items.reduce((s, i) => s + i.quantity, 0),
}));
