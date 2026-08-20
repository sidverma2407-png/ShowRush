import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import SeatMap from './pages/SeatMap';
import Bookings from './pages/Bookings';
import WaitlistOffer from './pages/WaitlistOffer';
import AdminVenues from './pages/AdminVenues';
import OrganiserDashboard from './pages/OrganiserDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return <>{children}</>;
}

function App() {
  const { user, logout } = useAuthStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-seatzy-black text-seatzy-white border-b-4 border-seatzy-black p-4 flex justify-between items-center z-10">
          <div className="text-3xl font-black uppercase tracking-tighter text-seatzy-acid-yellow">Seatzy</div>
          <div className="space-x-4">
            {user ? (
              <>
                <span className="font-mono text-sm">Hi, {user.name}</span>
                {user.role === 'admin' && <a href="/admin/venues" className="hover:text-seatzy-cyan font-bold uppercase">Venues</a>}
                {user.role === 'organiser' && <a href="/organiser/dashboard" className="hover:text-seatzy-cyan font-bold uppercase">Dashboard</a>}
                {user.role === 'customer' && (
                  <>
                    <a href="/events" className="hover:text-seatzy-cyan font-bold uppercase">Events</a>
                    <a href="/bookings" className="hover:text-seatzy-cyan font-bold uppercase">My Bookings</a>
                  </>
                )}
                <button onClick={logout} className="neo-btn bg-seatzy-magenta text-seatzy-white px-4 py-1 text-sm border-2">Logout</button>
              </>
            ) : (
              <>
                <a href="/login" className="hover:text-seatzy-cyan font-bold uppercase">Login</a>
                <a href="/register" className="neo-btn bg-seatzy-acid-yellow text-seatzy-black px-4 py-1 text-sm border-2">Register</a>
              </>
            )}
          </div>
        </nav>

        {/* Main Content — no padding here; each page manages its own bleed */}
        <main className="flex-grow px-4 md:px-8 pt-6 pb-12">
          <Routes>
            <Route path="/" element={<Navigate to="/events" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId/shows/:showId/map" element={
              <ProtectedRoute allowedRoles={['customer']}><SeatMap /></ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute allowedRoles={['customer']}><Bookings /></ProtectedRoute>
            } />
            <Route path="/waitlist/offer/:token" element={<WaitlistOffer />} />
            <Route path="/organiser/dashboard" element={
              <ProtectedRoute allowedRoles={['organiser']}><OrganiserDashboard /></ProtectedRoute>
            } />
            <Route path="/admin/venues" element={
              <ProtectedRoute allowedRoles={['admin']}><AdminVenues /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
