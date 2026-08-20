import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function SeatMap() {
  const { showId } = useParams();
  const [seats, setSeats] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Customer details for checkout
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi(`/shows/${showId}/seats`)
      .then(res => {
        setSeats(res.data.seats || []);
        setPricing(res.data.pricing || []);
      })
      .catch(err => console.error('Failed to fetch seats:', err))
      .finally(() => setLoading(false));

    const newSocket = io((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
    newSocket.emit('join_room', showId);
    newSocket.on('seat_status_updated', (updatedSeat: any) => {
      setSeats(prev => prev.map(s => s.id === updatedSeat.id ? updatedSeat : s));
      setSelectedSeats(prev => {
        // If an externally updated seat is in our selection and it became unavailable/booked by someone else, we might want to remove it
        // Or if we held it successfully, we want to reflect the updated state (hold_expires_at)
        return prev.map(s => s.id === updatedSeat.id ? updatedSeat : s);
      });
    });
    return () => { newSocket.disconnect(); };
  }, [showId]);

  // Timer logic
  useEffect(() => {
    const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id && s.hold_expires_at);
    if (myHolds.length === 0) {
      setCountdown(null);
      return;
    }

    const minExpiry = Math.min(...myHolds.map(h => new Date(h.hold_expires_at).getTime()));
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((minExpiry - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        // Auto clear selection on frontend when expired
        setSelectedSeats(prev => prev.filter(s => s.status !== 'held' || s.held_by !== user?.id));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seats, user?.id]);

  const toggleSeatSelection = (seat: any) => {
    if (seat.status === 'booked' || (seat.status === 'held' && seat.held_by !== user?.id)) {
      // It's taken or held by someone else, but allow selecting ONE taken seat for waitlisting
      setSelectedSeats([seat]);
      return;
    }
    
    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) return prev.filter(s => s.id !== seat.id);
      // Ensure we don't mix available/own-held seats with other-held/booked seats in selection
      const filteredPrev = prev.filter(s => s.status === 'available' || (s.status === 'held' && s.held_by === user?.id));
      return [...filteredPrev, seat];
    });
  };

  const handleHold = async () => {
    const seatsToHold = selectedSeats.filter(s => s.status === 'available');
    if (seatsToHold.length === 0) return;
    setHolding(true);
    try {
      const res = await fetchApi(`/shows/${showId}/hold`, {
        method: 'POST',
        body: JSON.stringify({ seat_ids: seatsToHold.map(s => s.id) })
      });
      // The socket will update 'seats', but we can manually update to avoid lag
      const updatedFromServer = res.data;
      setSeats(prev => prev.map(s => {
        const up = updatedFromServer.find((u: any) => u.id === s.id);
        return up || s;
      }));
      setSelectedSeats(prev => prev.map(s => {
        const up = updatedFromServer.find((u: any) => u.id === s.id);
        return up || s;
      }));
    } catch (err: any) {
      alert(err.message); // Should clearly say 409 Conflict if someone grabbed it
      // Refresh seats to clear dirty state
      fetchApi(`/shows/${showId}/seats`).then(res => setSeats(res.data.seats || []));
      setSelectedSeats([]);
    } finally {
      setHolding(false);
    }
  };

  const handleReleaseAll = async () => {
    const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);
    for (const hold of myHolds) {
      try {
        await fetchApi(`/holds/${hold.id}`, { method: 'DELETE' });
      } catch (err: any) {
        console.error(err);
      }
    }
    setSelectedSeats([]);
  };

  const handleCheckout = async () => {
    const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);
    if (myHolds.length === 0) return alert('No seats held');
    if (!customerName || !customerPhone) return alert('Please enter your name and phone number');
    
    setCheckingOut(true);
    try {
      const res = await fetchApi(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({ 
          show_id: showId, 
          seat_status_ids: myHolds.map(s => s.id),
          customer_name: customerName,
          customer_phone: customerPhone
        })
      });
      alert(`Booking Confirmed! Reference: ${res.data.booking_reference}. Email with QR sent.`);
      navigate('/bookings');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  const handleWaitlist = async (seat: any) => {
    try {
      await fetchApi(`/shows/${showId}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({ category_id: seat.venue_seat.category_id })
      });
      alert('Joined waitlist for this category!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-primary-container text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8">
        <p className="font-display-xl text-4xl uppercase tracking-tighter">Loading Map...</p>
      </div>
    </div>
  );

  const rows = Array.from(new Set(seats.map(s => s.venue_seat.row_label))).sort();
  const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);

  const getPrice = (categoryId: string) => {
    const p = pricing.find(p => p.category_id === categoryId);
    return p ? Number(p.price) : 0;
  };

  const subtotal = myHolds.reduce((sum, s) => sum + getPrice(s.venue_seat.category_id), 0);

  const getSeatClass = (seat: any) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isMyHold = seat.status === 'held' && seat.held_by === user?.id;
    const isBooked = seat.status === 'booked';
    const isOtherHold = seat.status === 'held' && seat.held_by !== user?.id;

    if (isBooked) return isSelected ? 'seat-selected opacity-50' : 'seat-sold';
    if (isMyHold) return 'seat-hold';
    if (isOtherHold) return isSelected ? 'seat-selected opacity-50' : 'seat-sold';
    if (isSelected) return 'seat-selected';
    return 'seat-available';
  };

  const hasAvailableSelected = selectedSeats.some(s => s.status === 'available');
  const onlyOtherHeldSelected = selectedSeats.length === 1 && (selectedSeats[0].status === 'booked' || (selectedSeats[0].status === 'held' && selectedSeats[0].held_by !== user?.id));

  return (
    <div className="w-full flex-grow flex flex-col bg-background relative selection:bg-primary-fixed selection:text-on-primary-fixed">
      <header className="bg-on-background text-on-primary border-b-4 border-on-background flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Go Back" className="bg-surface text-on-surface hover:bg-primary-fixed hover:text-on-primary-fixed border-border-width border-on-background p-2 neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
          </button>
          <h1 className="font-headline-lg-mobile md:font-headline-lg uppercase text-primary-fixed tracking-tight">VENUE MAP</h1>
        </div>
        {countdown !== null && (
          <div className="font-data-label text-data-label bg-error text-on-error border-border-width border-on-background px-4 py-2 neo-brutalism-shadow animate-pulse">
            HOLD EXPIRES IN {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
        )}
      </header>

      <div className="flex-grow flex flex-col md:flex-row relative">
        <section className="flex-grow bg-surface-container blueprint-bg relative overflow-hidden flex flex-col p-margin-mobile md:p-margin-desktop border-b-4 md:border-b-0 md:border-r-4 border-on-background">
          <div className="max-w-4xl mx-auto w-full mb-8">
            <div className="stage-area neo-brutalism-shadow">STAGE</div>
          </div>
          <div className="seat-map-container overflow-auto flex-grow pb-24">
            <div className="flex flex-col gap-6 w-max mx-auto">
              {rows.map(row => (
                <div key={row as string} className="flex gap-4 items-center justify-center">
                  <span className="font-data-label text-data-label text-on-surface-variant w-8 text-right shrink-0">{row as string}</span>
                  <div className="flex gap-2">
                    {seats
                      .filter(s => s.venue_seat.row_label === row)
                      .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number)
                      .map(seat => (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeatSelection(seat)}
                          className={`seat-btn ${getSeatClass(seat)}`}
                          title={`${seat.venue_seat.row_label}${seat.venue_seat.seat_number} — ${seat.status} ($${getPrice(seat.venue_seat.category_id)})`}
                        >
                          {seat.venue_seat.seat_number}
                        </button>
                      ))}
                  </div>
                  <span className="font-data-label text-data-label text-on-surface-variant w-8 text-left shrink-0">{row as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 md:left-margin-desktop md:right-auto bg-surface border-border-width border-on-background p-4 neo-brutalism-shadow flex flex-wrap gap-4 items-center z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-surface"></div>
              <span className="font-data-label text-data-label uppercase">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-tertiary-fixed"></div>
              <span className="font-data-label text-data-label uppercase">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-secondary-container"></div>
              <span className="font-data-label text-data-label uppercase">Your Hold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-primary-fixed opacity-70"></div>
              <span className="font-data-label text-data-label uppercase">Unavailable</span>
            </div>
          </div>
        </section>

        <aside className="w-full md:w-[400px] flex-shrink-0 bg-surface flex flex-col h-auto md:h-[calc(100vh-80px)] md:sticky md:top-[80px]">
          <div className="p-margin-mobile border-b-4 border-on-background bg-on-background text-on-primary">
            {selectedSeats.length > 0 ? (
               <>
                <h2 className="font-headline-lg-mobile uppercase mb-2">
                  {selectedSeats.length} SEAT(S) SELECTED
                </h2>
                
                {hasAvailableSelected && (
                   <button onClick={handleHold} disabled={holding} className="mt-4 w-full bg-primary-fixed text-on-primary-fixed border-border-width border-on-background py-2 font-headline-lg-mobile text-sm uppercase neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all disabled:opacity-50">
                     {holding ? 'Holding...' : 'Hold Selected'}
                   </button>
                )}
                
                {onlyOtherHeldSelected && (
                  <button onClick={() => handleWaitlist(selectedSeats[0])} className="mt-4 w-full bg-tertiary-fixed text-on-tertiary-fixed border-border-width border-on-background py-2 font-headline-lg-mobile text-sm uppercase neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all">
                    Join Waitlist for Category
                  </button>
                )}
               </>
            ) : (
               <>
                 <h2 className="font-headline-lg-mobile uppercase mb-2 text-on-surface-variant">Select Seats</h2>
                 <p className="font-data-label text-data-label text-on-surface-variant opacity-70">Click seats on the map to view details.</p>
               </>
            )}
            
            {myHolds.length > 0 && (
               <button onClick={handleReleaseAll} className="mt-4 w-full bg-secondary-container text-on-primary border-border-width border-on-background py-2 font-headline-lg-mobile text-sm uppercase neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all">
                 Release All Holds
               </button>
            )}
          </div>

          <div className="flex-grow p-margin-mobile overflow-y-auto blueprint-bg bg-surface-container border-b-4 border-on-background">
            <h3 className="font-headline-lg-mobile uppercase mb-4 text-on-surface border-b-4 border-on-background pb-2 inline-block">Your Holds</h3>
            <div className="flex flex-col gap-4">
              {myHolds.length === 0 ? (
                 <div className="text-center p-8 bg-surface border-4 border-on-background opacity-50">
                   <span className="font-data-label text-data-label uppercase">No active holds</span>
                 </div>
              ) : (
                myHolds.map(s => (
                  <div key={s.id} className="bg-surface border-border-width border-on-background p-4 neo-brutalism-shadow relative overflow-hidden group">
                    <div className="absolute left-[-10px] top-1/2 transform -translate-y-1/2 w-[20px] h-[20px] rounded-full bg-surface-container border-r-4 border-on-background"></div>
                    <div className="flex justify-between items-start ml-4">
                      <div>
                        <div className="font-data-label text-data-label bg-tertiary-fixed text-on-tertiary-fixed px-2 py-1 border-2 border-on-background inline-block mb-2">SEAT</div>
                        <div className="font-headline-lg-mobile text-on-surface">ROW {s.venue_seat.row_label} <br /> NUM {s.venue_seat.seat_number}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-headline-lg-mobile text-secondary">${getPrice(s.venue_seat.category_id)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Details Form */}
          {myHolds.length > 0 && (
            <div className="p-margin-mobile bg-surface-variant border-b-4 border-on-background">
               <h3 className="font-headline-lg-mobile text-sm uppercase mb-3 text-on-surface">Guest Details</h3>
               <div className="flex flex-col gap-3">
                 <input 
                   type="text" 
                   placeholder="FULL NAME" 
                   value={customerName}
                   onChange={e => setCustomerName(e.target.value)}
                   className="w-full bg-surface border-2 border-on-background p-2 font-data-label text-data-label focus:outline-none focus:border-primary-fixed"
                 />
                 <input 
                   type="tel" 
                   placeholder="PHONE NUMBER" 
                   value={customerPhone}
                   onChange={e => setCustomerPhone(e.target.value)}
                   className="w-full bg-surface border-2 border-on-background p-2 font-data-label text-data-label focus:outline-none focus:border-primary-fixed"
                 />
               </div>
            </div>
          )}

          <div className="p-margin-mobile bg-surface z-20">
            <div className="flex justify-between items-end mb-4">
              <span className="font-data-label text-data-label uppercase text-on-surface-variant">Subtotal ({myHolds.length} tickets)</span>
              <span className="font-headline-lg-mobile text-on-background">${subtotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={myHolds.length === 0 || !customerName || !customerPhone || checkingOut}
              className="w-full bg-primary-fixed text-on-primary-fixed border-border-width border-on-background py-4 font-headline-lg-mobile uppercase neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {checkingOut ? 'PROCESSING...' : 'CHECKOUT'}
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_forward</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
