import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function SeatMap() {
  const { eventId, showId } = useParams();
  const [seats, setSeats] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch initial state
    fetchApi(`/shows/${showId}/seats`).then(res => {
      setSeats(res.data);
      setLoading(false);
    });

    // Connect to websocket
    const newSocket = io((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
    setSocket(newSocket);

    // Join room
    newSocket.emit('join_room', showId);

    newSocket.on('seat_status_updated', (updatedSeat: any) => {
      setSeats(prev => prev.map(s => s.id === updatedSeat.id ? updatedSeat : s));
      // Update selected seat detail if it's the one currently viewed
      setSelectedSeat(prev => prev?.id === updatedSeat.id ? updatedSeat : prev);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [showId]);

  const handleHold = async () => {
    if (!selectedSeat) return;
    try {
      const res = await fetchApi(`/shows/${showId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ seat_ids: [selectedSeat.id] })
      });
      // The socket will update the UI, but we can optimistically update too
      setSeats(prev => prev.map(s => s.id === res.data[0].id ? res.data[0] : s));
      setSelectedSeat(res.data[0]);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRelease = async () => {
    if (!selectedSeat) return;
    try {
      await fetchApi(`/holds/${selectedSeat.id}`, { method: 'DELETE' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCheckout = async () => {
    // Find all seats held by user
    const heldSeats = seats.filter(s => s.status === 'held' && s.held_by === user?.id);
    if (heldSeats.length === 0) return alert('No seats held');
    
    try {
      const res = await fetchApi(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({ show_id: showId, seat_status_ids: heldSeats.map(s => s.id) })
      });
      alert(`Booking Confirmed! Reference: ${res.data.booking_reference}. Email with QR sent.`);
      navigate('/bookings');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleWaitlist = async () => {
    if (!selectedSeat) return;
    try {
      await fetchApi(`/shows/${showId}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({ category_id: selectedSeat.venue_seat.category_id })
      });
      alert('Joined waitlist for this category!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 font-mono text-2xl uppercase font-black">Loading Map...</div>;

  // Group seats by row (assuming row_label is A, B, C etc)
  const rows = Array.from(new Set(seats.map(s => s.venue_seat.row_label))).sort();

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      {/* SEAT MAP */}
      <div className="flex-grow neo-card p-8 overflow-auto flex flex-col items-center bg-seatzy-gray-grid">
        <h2 className="text-3xl font-black uppercase mb-8 bg-seatzy-black text-seatzy-white px-4 border-4 border-seatzy-black self-start">Live Seat Map</h2>
        
        <div className="w-2/3 h-8 bg-seatzy-black text-seatzy-white font-mono text-center mb-12 border-4 border-seatzy-black shadow-neo">SCREEN</div>

        <div className="flex flex-col gap-4">
          {rows.map(row => (
            <div key={row} className="flex gap-4 items-center">
              <span className="font-mono font-bold w-6 text-right">{row}</span>
              <div className="flex gap-2">
                {seats.filter(s => s.venue_seat.row_label === row).sort((a,b) => a.venue_seat.seat_number - b.venue_seat.seat_number).map(seat => {
                  let bgColor = 'bg-seatzy-white'; // available
                  if (seat.status === 'booked') bgColor = 'bg-seatzy-black';
                  else if (seat.status === 'held') {
                    if (seat.held_by === user?.id) bgColor = 'bg-seatzy-magenta';
                    else bgColor = 'bg-seatzy-acid-yellow';
                  }

                  const isSelected = selectedSeat?.id === seat.id;

                  return (
                    <button
                      key={seat.id}
                      onClick={() => setSelectedSeat(seat)}
                      className={`w-12 h-12 border-4 border-seatzy-black transition-transform ${bgColor} ${isSelected ? 'scale-110 shadow-neo z-10 ring-4 ring-seatzy-cyan' : 'hover:-translate-y-1 hover:shadow-neo'}`}
                      disabled={seat.status === 'booked'}
                    >
                      <span className={`font-mono text-xs font-bold ${seat.status === 'booked' ? 'text-seatzy-white' : ''}`}>
                        {seat.venue_seat.seat_number}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIDEBAR DETAIL */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        {selectedSeat ? (
          <div className="neo-card p-6 flex flex-col gap-4">
            <h3 className="text-2xl font-black uppercase bg-seatzy-acid-yellow inline-block px-2 border-2 border-seatzy-black self-start">
              Seat {selectedSeat.venue_seat.row_label}{selectedSeat.venue_seat.seat_number}
            </h3>
            
            <div className="font-mono text-sm border-y-4 border-seatzy-black py-4 flex flex-col gap-2">
              <div className="flex justify-between">
                <span>STATUS:</span>
                <span className="font-bold uppercase">{selectedSeat.status}</span>
              </div>
              <div className="flex justify-between">
                <span>CATEGORY:</span>
                <span className="font-bold uppercase">{selectedSeat.venue_seat.category_id}</span>
              </div>
            </div>

            {selectedSeat.status === 'available' && (
              <button onClick={handleHold} className="neo-btn bg-seatzy-acid-yellow py-4 text-xl">HOLD SEAT (10M)</button>
            )}

            {selectedSeat.status === 'held' && selectedSeat.held_by === user?.id && (
              <div className="flex flex-col gap-2">
                <div className="bg-seatzy-magenta text-seatzy-white p-2 font-mono font-bold border-2 border-seatzy-black text-center animate-pulse">
                  HELD BY YOU
                </div>
                <button onClick={handleRelease} className="neo-btn bg-seatzy-white py-2">RELEASE</button>
              </div>
            )}

            {selectedSeat.status === 'held' && selectedSeat.held_by !== user?.id && (
              <div className="bg-seatzy-black text-seatzy-white p-4 font-mono">
                Currently held by someone else. Join waitlist if you want this category.
                <button onClick={handleWaitlist} className="neo-btn bg-seatzy-white text-seatzy-black w-full mt-4 py-2">JOIN WAITLIST</button>
              </div>
            )}
            
            {selectedSeat.status === 'booked' && (
              <div className="bg-seatzy-black text-seatzy-white p-4 font-mono font-bold text-center">
                UNAVAILABLE
              </div>
            )}
          </div>
        ) : (
          <div className="neo-card p-6 flex items-center justify-center h-48 bg-seatzy-gray-grid text-seatzy-black font-mono font-bold text-center border-dashed">
            SELECT A SEAT ON THE MAP
          </div>
        )}

        {/* CART SUMMARY */}
        <div className="neo-card p-6 flex flex-col gap-4 mt-auto">
          <h3 className="text-xl font-black uppercase">Your Holds</h3>
          <div className="flex flex-col gap-2 font-mono text-sm">
            {seats.filter(s => s.status === 'held' && s.held_by === user?.id).length === 0 ? (
              <span>No active holds.</span>
            ) : (
              seats.filter(s => s.status === 'held' && s.held_by === user?.id).map(s => (
                <div key={s.id} className="flex justify-between border-b-2 border-seatzy-black pb-1">
                  <span>Seat {s.venue_seat.row_label}{s.venue_seat.seat_number}</span>
                  <span className="text-seatzy-magenta font-bold">10:00</span>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={handleCheckout}
            disabled={seats.filter(s => s.status === 'held' && s.held_by === user?.id).length === 0}
            className="neo-btn bg-seatzy-black text-seatzy-white py-4 text-xl disabled:opacity-50 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:shadow-neo"
          >
            CHECKOUT
          </button>
        </div>
      </div>
    </div>
  );
}
