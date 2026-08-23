export const getImageUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  // Frontend public static assets (e.g. /event_pics/..., /images/...) are served directly by frontend
  if (
    trimmed.startsWith('/event_pics') ||
    trimmed.startsWith('/images') ||
    trimmed.startsWith('/icons') ||
    trimmed.startsWith('event_pics/') ||
    trimmed.startsWith('images/')
  ) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // Uploaded organizer assets (/uploads/...) live on the backend server
  const serverBase = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? 'https://seatzy-oqbv.onrender.com'
    : 'http://localhost:3000';

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${serverBase}${cleanPath}`;
};
