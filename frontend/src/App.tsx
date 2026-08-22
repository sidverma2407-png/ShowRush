import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Events from './pages/Events';
import Explore from './pages/Explore';
import SeatMap from './pages/SeatMap';
import Bookings from './pages/Bookings';
import WaitlistOffer from './pages/WaitlistOffer';
import AdminVenues from './pages/AdminVenues';
import OrganiserDashboard from './pages/OrganiserDashboard';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { NeoModal } from './components/NeoModal';

import EventDetail from './pages/EventDetail';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col font-body-md blueprint-bg">
        <NeoModal />
        <Routes>
          {/* Auth pages — full viewport, no padding, no global nav/footer */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/events/:eventId/shows/:showId/map" element={
            <ProtectedRoute allowedRoles={['customer']}><SeatMap /></ProtectedRoute>
          } />
          
          {/* App pages — standard layout with Nav and Footer */}
          <Route path="/*" element={
            <>
              <Navbar />
              <main className="flex-grow w-full max-w-[1440px] mx-auto flex flex-col">
                <Routes>
                  <Route path="/" element={<Navigate to="/explore" />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:id" element={<EventDetail />} />
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
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
