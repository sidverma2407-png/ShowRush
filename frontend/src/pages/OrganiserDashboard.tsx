import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function OrganiserDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    // In a real app we'd fetch only organiser's events and summaries.
    // For simplicity using /events and filtering locally if endpoint isn't fully ready.
    fetchApi('/events').then(res => {
      // Assuming event object has organiser_id (if not, we'd need a specific endpoint)
      setEvents(res.data);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <h1 className="text-4xl font-black uppercase bg-seatzy-black text-seatzy-white inline-block px-4 py-2 border-4 border-seatzy-black self-start">
        Organiser Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="neo-card p-6 flex flex-col items-center text-center bg-seatzy-acid-yellow">
          <span className="font-mono text-sm uppercase">Total Events</span>
          <span className="text-6xl font-black mt-2">{events.length}</span>
        </div>
        <div className="neo-card p-6 flex flex-col items-center text-center bg-seatzy-cyan">
          <span className="font-mono text-sm uppercase">Total Revenue</span>
          <span className="text-6xl font-black mt-2">$0</span>
        </div>
      </div>
    </div>
  );
}
