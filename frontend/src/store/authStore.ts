import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (u: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: localStorage.getItem('vm_user') ? JSON.parse(localStorage.getItem('vm_user')!) : null,
  token: localStorage.getItem('vm_token'),
  setAuth: (user, token) => {
    localStorage.setItem('vm_token', token);
    localStorage.setItem('vm_user', JSON.stringify(user));
    set({ user, token });
  },
  updateUser: (u) => set(s => {
    const updated = { ...s.user!, ...u };
    localStorage.setItem('vm_user', JSON.stringify(updated));
    return { user: updated };
  }),
  logout: () => {
    localStorage.removeItem('vm_token');
    localStorage.removeItem('vm_user');
    set({ user: null, token: null });
  },
}));
