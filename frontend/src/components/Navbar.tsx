import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import CitySelectModal from './CitySelectModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('seatzy_selected_city') || 'All Cities';
  });
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem('seatzy_selected_city', city);
    window.dispatchEvent(new CustomEvent('seatzy_city_changed', { detail: city }));
  };

  useEffect(() => {
    const handleStorageChange = (e: CustomEvent) => {
      if (e.detail) setSelectedCity(e.detail);
    };
    window.addEventListener('seatzy_city_changed' as any, handleStorageChange);
    return () => window.removeEventListener('seatzy_city_changed' as any, handleStorageChange);
  }, []);

  return (
    <>
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 bg-on-background border-b-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/" className="font-headline-lg text-3xl md:text-4xl font-black text-primary-fixed italic tracking-tight">
            SEATZY
          </Link>

          {/* City Selection Trigger Badge */}
          <button
            onClick={() => setIsCityModalOpen(true)}
            className="flex items-center gap-1.5 bg-surface text-on-surface border-2 border-on-background px-3 py-1.5 font-data-label text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-primary-fixed neo-brutalism-shadow-sm transition-all"
            title="Click to change your city"
          >
            <span className="material-symbols-outlined text-base text-primary-fixed group-hover:text-on-primary-fixed">location_on</span>
            <span className="truncate max-w-[100px] md:max-w-[140px]">{selectedCity}</span>
            <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
          </button>

          {user && (
            <div className="hidden md:flex gap-8 ml-4">
              {user.role === 'admin' && (
                <Link to="/admin/venues" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/admin') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                  Venues
                </Link>
              )}
              {user.role === 'organiser' && (
                <>
                  <Link to="/organiser/dashboard" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/organiser') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                    Dashboard
                  </Link>
                  <Link to="/events" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname === '/events' ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                    Events
                  </Link>
                </>
              )}
              {user.role === 'customer' && (
                <>
                  <Link to="/explore" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname === '/explore' ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                    Explore
                  </Link>
                  <Link to="/events" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname === '/events' ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                    Events
                  </Link>
                  <Link to="/bookings" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/bookings') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px]'}`}>
                    My Bookings
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex gap-4">
              <Link to="/login" className="font-headline-lg text-lg md:text-xl uppercase text-on-primary font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">Login</Link>
              <Link to="/register" className="font-headline-lg text-lg md:text-xl uppercase text-primary-fixed font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">Register</Link>
            </div>
          ) : (
            <button onClick={logout} className="hidden md:block bg-primary-fixed text-on-background font-data-label text-data-label uppercase border-border-width border-on-background px-6 py-2 neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all font-bold">
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* City Selector Modal */}
      <CitySelectModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        selectedCity={selectedCity}
        onSelectCity={handleCitySelect}
      />
    </>
  );
}
