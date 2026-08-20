import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return (
      <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 bg-on-background border-b-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-headline-lg text-3xl md:text-4xl font-black text-primary-fixed italic">SEATZY</Link>
        </div>
        <div className="flex gap-4">
          <Link to="/login" className="font-headline-lg text-lg md:text-xl uppercase text-on-primary font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">Login</Link>
          <Link to="/register" className="font-headline-lg text-lg md:text-xl uppercase text-primary-fixed font-bold hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all">Register</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 bg-on-background border-b-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-headline-lg text-3xl md:text-4xl font-black text-primary-fixed italic">SEATZY</Link>
        <div className="hidden md:flex gap-8 ml-4">
          {user.role === 'admin' && (
            <Link to="/admin/venues" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/admin') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
              Venues
            </Link>
          )}
          {user.role === 'organiser' && (
            <>
              <Link to="/organiser/dashboard" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/organiser') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                Dashboard
              </Link>
              <Link to="/events" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname === '/events' ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                Events
              </Link>
            </>
          )}
          {user.role === 'customer' && (
            <>
              <Link to="/events" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname === '/events' ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                Browse
              </Link>
              <Link to="/bookings" className={`font-headline-lg text-lg md:text-xl uppercase font-bold transition-all ${location.pathname.startsWith('/bookings') ? 'text-primary-fixed underline decoration-4 underline-offset-8' : 'text-on-primary hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`}>
                My Bookings
              </Link>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={logout} className="hidden md:block bg-primary-fixed text-on-background font-data-label text-data-label uppercase border-border-width border-on-background px-6 py-2 neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all">
          Logout
        </button>
        <button className="md:hidden text-primary-fixed">
          <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu</span>
        </button>
      </div>
    </nav>
  );
}
