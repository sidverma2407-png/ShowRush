import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
// Placeholder imports for now
const Events = () => <div className="p-8">Events</div>;
const SeatMap = () => <div className="p-8">Seat Map</div>;
const Dashboard = () => <div className="p-8">Organiser Dashboard</div>;
const Venues = () => <div className="p-8">Admin Venues</div>;

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
                {user.role === 'customer' && <a href="/events" className="hover:text-seatzy-cyan font-bold uppercase">Events</a>}
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

        {/* Main Content */}
        <main className="flex-grow p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/events" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:eventId/shows/:showId/map" element={
              <ProtectedRoute allowedRoles={['customer']}><SeatMap /></ProtectedRoute>
            } />
            <Route path="/organiser/dashboard" element={
              <ProtectedRoute allowedRoles={['organiser']}><Dashboard /></ProtectedRoute>
            } />
            <Route path="/admin/venues" element={
              <ProtectedRoute allowedRoles={['admin']}><Venues /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
