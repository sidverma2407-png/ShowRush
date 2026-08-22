export const getApiBase = () => {
  let envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    envUrl = envUrl.trim().replace(/\/+$/, '');
    if (!envUrl.endsWith('/api')) {
      envUrl = `${envUrl}/api`;
    }
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://seatzy-oqbv.onrender.com/api';
  }
  return 'http://localhost:3000/api';
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
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.message || 'API request failed');
    err.data = errorData;
    err.status = response.status;
    throw err;
  }

  return response.json();
};
