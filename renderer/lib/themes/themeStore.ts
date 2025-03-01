import { createStore } from 'zustand';

interface ThemeState {
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
}

const useThemeStore = createStore<ThemeState>((set) => ({
  colorMode: 'light',
  toggleColorMode: () => set((state) => ({ colorMode: state.colorMode === 'light' ? 'dark' : 'light' })),
}));

export default useThemeStore;
