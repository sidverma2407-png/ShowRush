import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function SeatMap() {
  const { showId } = useParams();
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi(`/shows/${showId}/seats`)
      .then(res => setSeats(res.data))
      .catch(err => console.error('Failed to fetch seats:', err))
      .finally(() => setLoading(false));

    const newSocket = io((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
    newSocket.emit('join_room', showId);
    newSocket.on('seat_status_updated', (updatedSeat: any) => {
      setSeats(prev => prev.map(s => s.id === updatedSeat.id ? updatedSeat : s));
      setSelectedSeat((prev: any) => prev?.id === updatedSeat.id ? updatedSeat : prev);
    });
    return () => { newSocket.disconnect(); };
  }, [showId]);

  const handleHold = async () => {
    if (!selectedSeat) return;
    setHolding(true);
    try {
      const res = await fetchApi(`/shows/${showId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ seat_ids: [selectedSeat.id] })
      });
      setSeats(prev => prev.map(s => s.id === res.data[0].id ? res.data[0] : s));
      setSelectedSeat(res.data[0]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setHolding(false);
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

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-seatzy-cyan border-4 border-seatzy-black shadow-neo-xl px-12 py-8">
        <p className="font-black text-4xl uppercase tracking-tighter">Loading Map...</p>
      </div>
    </div>
  );

  const rows = Array.from(new Set(seats.map(s => s.venue_seat.row_label))).sort();
  const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);

  const getSeatStyle = (seat: any) => {
    const isSelected = selectedSeat?.id === seat.id;
    const isMyHold = seat.status === 'held' && seat.held_by === user?.id;
    const isOtherHold = seat.status === 'held' && seat.held_by !== user?.id;
    const isBooked = seat.status === 'booked';

    let base = 'w-14 h-14 border-4 border-seatzy-black font-black text-sm font-mono transition-all duration-150 relative flex items-center justify-center';

    if (isBooked) return `${base} bg-seatzy-black text-seatzy-white cursor-not-allowed opacity-70`;
    if (isMyHold) return `${base} bg-seatzy-magenta text-seatzy-white cursor-pointer ${isSelected ? 'shadow-neo-lg scale-110 z-10' : 'shadow-neo hover:-translate-y-1'}`;
    if (isOtherHold) return `${base} bg-seatzy-acid-yellow text-seatzy-black cursor-pointer ${isSelected ? 'shadow-neo-lg scale-110 z-10' : 'shadow-neo-sm hover:-translate-y-1'}`;
    // available
    return `${base} bg-seatzy-white text-seatzy-black cursor-pointer ${isSelected ? 'bg-seatzy-cyan shadow-neo-lg scale-110 z-10 ring-4 ring-seatzy-black' : 'shadow-neo-sm hover:-translate-y-1 hover:shadow-neo'}`;
  };

  return (
    <div className="w-full flex flex-col gap-0">
      {/* Full-bleed page title band */}
      <div className="bg-seatzy-black text-seatzy-white -mx-4 md:-mx-8 px-4 md:px-8 py-5 mb-6 border-b-4 border-seatzy-black flex items-center justify-between gap-4 shadow-neo-lg">
        <div>
          <p className="font-mono text-seatzy-cyan text-xs tracking-widest uppercase mb-0.5">// Live Seat Map</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">Pick Your Seat</h1>
        </div>
        <div className="flex items-center gap-3">
          {myHolds.length > 0 && (
            <div className="stamp-badge-magenta hidden md:block">
              {myHolds.length} Held
            </div>
          )}
          <button onClick={() => navigate(-1)} className="neo-btn bg-seatzy-white text-seatzy-black px-4 py-2 text-sm border-2 shadow-neo-sm">
            ← Back
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 w-full">
        {/* ====== MAIN SEAT MAP ====== */}
        <div className="flex-grow flex flex-col neo-card-lg overflow-hidden">
          {/* Screen indicator */}
          <div className="bg-seatzy-black border-b-4 border-seatzy-black flex items-center justify-center py-2">
            <div className="font-mono text-seatzy-acid-yellow text-xs tracking-widest uppercase font-bold">— SCREEN —</div>
          </div>

          {/* Grid area */}
          <div className="flex-grow p-6 md:p-10 overflow-auto flex flex-col items-center gap-8">
            {/* Rows of seats */}
            <div className="flex flex-col gap-5 w-full max-w-2xl">
              {rows.map(row => (
                <div key={row} className="flex gap-4 items-center">
                  <span className="font-black font-mono text-lg w-8 text-right shrink-0">{row}</span>
                  <div className="flex gap-3 flex-wrap">
                    {seats
                      .filter(s => s.venue_seat.row_label === row)
                      .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number)
                      .map(seat => (
                        <button
                          key={seat.id}
                          onClick={() => seat.status !== 'booked' && setSelectedSeat(seat)}
                          className={getSeatStyle(seat)}
                          title={`${seat.venue_seat.row_label}${seat.venue_seat.seat_number} — ${seat.status}`}
                        >
                          {seat.venue_seat.seat_number}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Color-key legend — fills the lower space */}
            <div className="w-full max-w-2xl mt-4 border-t-4 border-seatzy-black pt-6">
              <p className="font-black text-xs uppercase tracking-widest mb-4">Seat Legend</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { color: 'bg-seatzy-white border-4 border-seatzy-black shadow-neo-sm', label: 'Available' },
                  { color: 'bg-seatzy-cyan border-4 border-seatzy-black shadow-neo', label: 'Selected' },
                  { color: 'bg-seatzy-acid-yellow border-4 border-seatzy-black shadow-neo-sm', label: 'Held — Other' },
                  { color: 'bg-seatzy-magenta border-4 border-seatzy-black shadow-neo', label: 'Your Hold' },
                  { color: 'bg-seatzy-black border-4 border-seatzy-black', label: 'Booked' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-8 h-8 shrink-0 ${item.color}`} />
                    <span className="font-mono text-xs uppercase font-bold">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ====== RIGHT SIDEBAR ====== */}
        <div className="w-full xl:w-96 shrink-0 flex flex-col gap-5">

          {/* Seat Detail Panel */}
          {selectedSeat ? (
            <div className="neo-card-lg flex flex-col overflow-hidden">
              {/* Coloured header band */}
              {selectedSeat.status === 'available' && (
                <div className="bg-seatzy-cyan border-b-4 border-seatzy-black px-5 py-3 flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-tight">
                    Seat {selectedSeat.venue_seat.row_label}{selectedSeat.venue_seat.seat_number}
                  </h3>
                  <span className="font-mono text-xs font-bold uppercase">Available</span>
                </div>
              )}
              {selectedSeat.status === 'held' && selectedSeat.held_by === user?.id && (
                <div className="bg-seatzy-magenta text-seatzy-white border-b-4 border-seatzy-black px-5 py-3 flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-tight">
                    Seat {selectedSeat.venue_seat.row_label}{selectedSeat.venue_seat.seat_number}
                  </h3>
                  <span className="stamp-badge border-seatzy-white bg-seatzy-acid-yellow text-seatzy-black text-xs border-2">Held by You</span>
                </div>
              )}
              {selectedSeat.status === 'held' && selectedSeat.held_by !== user?.id && (
                <div className="bg-seatzy-acid-yellow border-b-4 border-seatzy-black px-5 py-3 flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-tight">
                    Seat {selectedSeat.venue_seat.row_label}{selectedSeat.venue_seat.seat_number}
                  </h3>
                  <span className="font-mono text-xs font-bold">Held</span>
                </div>
              )}
              {selectedSeat.status === 'booked' && (
                <div className="bg-seatzy-black text-seatzy-white border-b-4 border-seatzy-black px-5 py-3 flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-tight">
                    Seat {selectedSeat.venue_seat.row_label}{selectedSeat.venue_seat.seat_number}
                  </h3>
                  <span className="stamp-badge-magenta text-xs border-2">Booked</span>
                </div>
              )}

              <div className="p-5 flex flex-col gap-4">
                {/* Seat data rows */}
                <div className="font-mono text-sm border-4 border-seatzy-black">
                  <div className="flex justify-between border-b-4 border-seatzy-black px-3 py-2">
                    <span className="font-bold uppercase">Row</span>
                    <span>{selectedSeat.venue_seat.row_label}</span>
                  </div>
                  <div className="flex justify-between border-b-4 border-seatzy-black px-3 py-2">
                    <span className="font-bold uppercase">Number</span>
                    <span>{selectedSeat.venue_seat.seat_number}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="font-bold uppercase">Status</span>
                    <span className="uppercase font-bold">{selectedSeat.status}</span>
                  </div>
                </div>

                {/* Action buttons */}
                {selectedSeat.status === 'available' && (
                  <button
                    onClick={handleHold}
                    disabled={holding}
                    className="neo-btn-hero bg-seatzy-acid-yellow text-seatzy-black py-4 text-xl w-full disabled:opacity-50"
                  >
                    {holding ? 'Holding...' : 'Hold Seat (10 min)'}
                  </button>
                )}

                {selectedSeat.status === 'held' && selectedSeat.held_by === user?.id && (
                  <div className="flex flex-col gap-2">
                    <div className="bg-seatzy-magenta text-seatzy-white px-4 py-3 border-4 border-seatzy-black font-black text-center uppercase tracking-wider animate-pulse">
                      ⚡ Held by You
                    </div>
                    <button onClick={handleRelease} className="neo-btn bg-seatzy-white text-seatzy-black py-3 w-full border-2 shadow-neo-sm">
                      Release Hold
                    </button>
                  </div>
                )}

                {selectedSeat.status === 'held' && selectedSeat.held_by !== user?.id && (
                  <div className="flex flex-col gap-3">
                    <div className="bg-seatzy-black text-seatzy-white px-4 py-3 border-4 border-seatzy-black font-mono text-sm text-center">
                      Held by someone else
                    </div>
                    <button onClick={handleWaitlist} className="neo-btn bg-seatzy-cyan text-seatzy-black py-3 w-full">
                      Join Waitlist
                    </button>
                  </div>
                )}

                {selectedSeat.status === 'booked' && (
                  <div className="relative overflow-hidden">
                    <div className="bg-seatzy-black text-seatzy-white px-4 py-4 border-4 border-seatzy-black font-black text-center text-xl uppercase">
                      Unavailable
                    </div>
                    <div className="absolute top-1 right-1 stamp-badge-magenta text-xs border-2 opacity-90">SOLD</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="neo-card-lg flex flex-col overflow-hidden">
              <div className="bg-seatzy-gray-grid border-b-4 border-seatzy-black px-5 py-3">
                <h3 className="font-black text-xl uppercase tracking-tight">Select a Seat</h3>
              </div>
              <div className="p-8 hash-pattern flex items-center justify-center min-h-[160px]">
                <p className="font-mono text-sm font-bold uppercase text-center opacity-60">
                  Click any seat on the map to see details
                </p>
              </div>
            </div>
          )}

          {/* Your Holds Cart */}
          <div className="neo-card-lg flex flex-col overflow-hidden">
            <div className="bg-seatzy-black text-seatzy-white border-b-4 border-seatzy-black px-5 py-3 flex items-center justify-between">
              <h3 className="font-black text-xl uppercase tracking-tight">Your Holds</h3>
              {myHolds.length > 0 && (
                <span className="bg-seatzy-magenta text-seatzy-white border-2 border-seatzy-white px-2 py-0.5 font-mono text-xs font-bold">
                  {myHolds.length} seat{myHolds.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="p-4 flex flex-col gap-3">
              {myHolds.length === 0 ? (
                <p className="font-mono text-sm opacity-50 py-2 text-center uppercase">No active holds</p>
              ) : (
                myHolds.map(s => (
                  <div key={s.id} className="flex justify-between items-center border-4 border-seatzy-black px-3 py-2 shadow-neo-sm bg-seatzy-magenta text-seatzy-white">
                    <span className="font-black uppercase">
                      Seat {s.venue_seat.row_label}{s.venue_seat.seat_number}
                    </span>
                    <span className="font-mono text-xs font-bold bg-seatzy-black text-seatzy-white px-2 py-1">10:00</span>
                  </div>
                ))
              )}

              <button
                onClick={handleCheckout}
                disabled={myHolds.length === 0}
                className="neo-btn-hero bg-seatzy-acid-yellow text-seatzy-black py-4 text-xl w-full mt-2 disabled:opacity-40 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
              >
                Checkout →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
