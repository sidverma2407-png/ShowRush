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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav className="w-full bg-on-background border-b-2 sm:border-b-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-4 md:px-margin-desktop py-3 md:py-4">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <Link to="/" className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-black text-primary-fixed italic tracking-tight flex items-center min-h-[44px] min-w-[44px]">
              SEATZY
            </Link>

            {/* High-Contrast City Selection Trigger Badge */}
            <button
              onClick={() => setIsCityModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary-fixed text-on-background border-2 border-black px-3 py-1.5 font-mono text-xs sm:text-sm uppercase font-black shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:bg-white hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(225,237,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all min-h-[44px] cursor-pointer group"
              title="Click to change your city"
            >
              <span className="material-symbols-outlined text-base font-black text-on-background group-hover:scale-110 transition-transform">location_on</span>
              <span className="truncate max-w-[90px] sm:max-w-[140px] tracking-wider font-extrabold">{selectedCity}</span>
              <span className="material-symbols-outlined text-sm font-black bg-black text-primary-fixed px-0.5 group-hover:bg-primary-fixed group-hover:text-black transition-colors">expand_more</span>
            </button>

            {/* Desktop Navigation Links */}
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

          <div className="flex items-center gap-2 sm:gap-4">
            {!user ? (
              <div className="hidden md:flex gap-4">
                <Link to="/login" className="font-headline-lg text-lg md:text-xl uppercase text-on-primary font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">Login</Link>
                <Link to="/register" className="font-headline-lg text-lg md:text-xl uppercase text-primary-fixed font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">Register</Link>
              </div>
            ) : (
              <button onClick={logout} className="hidden md:block bg-primary-fixed text-on-background font-data-label text-data-label uppercase border-2 border-on-background px-5 py-2 neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all font-bold min-h-[44px]">
                Logout
              </button>
            )}

            {/* Mobile Hamburger Toggle Button (44x44px min target) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center justify-center w-11 h-11 bg-primary-fixed text-on-background border-2 border-on-background shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-2xl font-black">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Neo-Brutalist Nav Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t-4 border-on-background bg-on-background px-4 py-6 flex flex-col gap-4 shadow-[0px_8px_16px_rgba(0,0,0,0.5)]">
            {user ? (
              <>
                <div className="bg-surface p-3 border-2 border-on-background mb-2">
                  <span className="font-data-label text-xs uppercase font-bold text-on-surface-variant block">LOGGED IN AS</span>
                  <span className="font-headline-lg text-base font-black text-on-surface uppercase truncate block">{user.name}</span>
                  <span className="inline-block bg-primary-fixed text-on-primary-fixed text-[10px] font-black uppercase px-2 py-0.5 mt-1 border border-on-background">
                    {user.role}
                  </span>
                </div>

                {user.role === 'customer' && (
                  <>
                    <Link
                      to="/explore"
                      className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname === '/explore' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                    >
                      <span>EXPLORE</span>
                      <span className="material-symbols-outlined">explore</span>
                    </Link>
                    <Link
                      to="/events"
                      className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname === '/events' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                    >
                      <span>ALL EVENTS</span>
                      <span className="material-symbols-outlined">event</span>
                    </Link>
                    <Link
                      to="/bookings"
                      className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname.startsWith('/bookings') ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                    >
                      <span>MY BOOKINGS</span>
                      <span className="material-symbols-outlined">confirmation_number</span>
                    </Link>
                  </>
                )}

                {user.role === 'organiser' && (
                  <>
                    <Link
                      to="/organiser/dashboard"
                      className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname.startsWith('/organiser') ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                    >
                      <span>DASHBOARD</span>
                      <span className="material-symbols-outlined">dashboard</span>
                    </Link>
                    <Link
                      to="/events"
                      className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname === '/events' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                    >
                      <span>EVENTS</span>
                      <span className="material-symbols-outlined">event</span>
                    </Link>
                  </>
                )}

                {user.role === 'admin' && (
                  <Link
                    to="/admin/venues"
                    className={`font-headline-lg text-xl uppercase font-black px-4 py-3 border-2 border-on-background flex items-center justify-between min-h-[48px] ${location.pathname.startsWith('/admin') ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface text-on-surface'}`}
                  >
                    <span>VENUES & SEATS</span>
                    <span className="material-symbols-outlined">stadium</span>
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="mt-2 w-full bg-red-400 text-on-background font-headline-lg text-lg uppercase font-black py-3 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span>LOGOUT</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  className="font-headline-lg text-xl uppercase font-black px-4 py-3 bg-surface text-on-surface border-2 border-on-background text-center min-h-[48px] flex items-center justify-center"
                >
                  LOGIN
                </Link>
                <Link
                  to="/register"
                  className="font-headline-lg text-xl uppercase font-black px-4 py-3 bg-primary-fixed text-on-primary-fixed border-2 border-on-background text-center min-h-[48px] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  REGISTER ACCOUNT
                </Link>
              </div>
            )}
          </div>
        )}
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
