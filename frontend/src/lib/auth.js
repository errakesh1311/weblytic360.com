import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getToken, getUser, clearSession } from './api';

/** Redirects to /login when there is no session. */
export function useAuth({ redirect = true } = {}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      if (redirect) router.replace('/login');
      setReady(true);
      return;
    }
    setUser(getUser());
    setReady(true);
  }, []);

  return { user, ready, isAuthenticated: !!user };
}

export function logout(router) {
  clearSession();
  router.replace('/login');
}
