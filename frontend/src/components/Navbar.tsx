import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import CitySelectModal from './CitySelectModal';
import AccountSettingsModal from './AccountSettingsModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('seatzy_selected_city') || 'All Cities';
  });
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
            <Link
              to={user?.role === 'organiser' ? '/organiser/dashboard' : user?.role === 'admin' ? '/admin/venues' : '/'}
              className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-black text-primary-fixed italic tracking-tight flex items-center min-h-[44px] min-w-[44px]"
            >
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
              <div className="hidden md:flex items-center gap-3">
                {/* Logged in email & Account settings trigger */}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="flex items-center gap-2 bg-surface text-on-surface border-2 border-on-background px-3 py-1.5 font-mono text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer group"
                  title="Click to view Account Settings & change password"
                >
                  <div className="w-6 h-6 rounded-full bg-primary-fixed border border-black flex items-center justify-center font-black text-black text-[11px] uppercase">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-extrabold text-xs text-on-surface truncate max-w-[160px] lg:max-w-[200px]">
                      {user.email}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-bold">
                      {user.role} • Settings
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-sm font-black text-neutral-700 group-hover:rotate-45 transition-transform">
                    settings
                  </span>
                </button>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="bg-primary-fixed text-on-background font-data-label text-data-label uppercase border-2 border-on-background px-4 py-2 neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all font-bold min-h-[40px] flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm font-black">logout</span>
                  Logout
                </button>
              </div>
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
                <div className="bg-surface p-4 border-3 border-on-background mb-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-data-label text-[10px] uppercase font-black text-neutral-500 block">LOGGED IN USER</span>
                      <span className="font-headline-lg text-base font-black text-on-surface uppercase truncate block">{user.name}</span>
                      <span className="font-mono text-xs font-bold text-neutral-700 break-all block">{user.email}</span>
                    </div>
                    <span className="inline-block bg-primary-fixed text-on-primary-fixed text-[10px] font-black uppercase px-2 py-0.5 border border-on-background">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full mt-2 bg-yellow-100 text-on-background border-2 border-black py-2 px-3 font-headline-lg text-xs uppercase font-black flex items-center justify-center gap-1.5 hover:bg-yellow-200"
                  >
                    <span className="material-symbols-outlined text-sm">settings</span>
                    ACCOUNT SETTINGS & SECURITY
                  </button>
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

      {/* Account Settings & Security Modal */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}
