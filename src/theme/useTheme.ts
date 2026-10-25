import { useSyncExternalStore } from 'react';
import { getActiveTheme, subscribeTheme, setTheme } from './themes';
export function useTheme() { const theme=useSyncExternalStore(subscribeTheme,getActiveTheme,getActiveTheme); return { theme, setTheme }; }
