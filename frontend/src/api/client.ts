export const getApiBase = () => {
  let envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (!envUrl.endsWith('/api')) {
      envUrl = `${envUrl}/api`;
    }
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://seatzy-oqbv.onrender.com/api';
    }
    // Dynamic host: works seamlessly on localhost, 127.0.0.1, LAN IP (192.168.x.x), etc.
    return `http://${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

export const getSocketUrl = () => {
  let envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://seatzy-oqbv.onrender.com';
    }
    // Dynamic host: connects to the same backend host
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const apiBase = getApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${apiBase}${cleanEndpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
    }
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.message || 'API request failed';
    if (response.status === 401 && (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('no longer exists'))) {
      msg = 'Your session has expired. Please sign in again to continue.';
    }
    const err: any = new Error(msg);
    err.data = errorData;
    err.status = response.status;
    throw err;
  }

  return response.json();
};
