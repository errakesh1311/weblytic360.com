import { useEffect } from 'react';
import '../styles/globals.css';
import { getUser } from '../lib/api';

/** Applies the saved dark-mode preference to the <html> element. */
export function applyTheme(darkMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
}

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const user = getUser();
    applyTheme(!!user?.preferences?.darkMode);
  }, []);

  return <Component {...pageProps} />;
}