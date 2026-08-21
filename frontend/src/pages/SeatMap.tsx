import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';

export default function SeatMap() {
  const { showId } = useParams();
  const [seats, setSeats] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [showData, setShowData] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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
        setShowData(res.data.show || null);
      })
      .catch(err => console.error('Failed to fetch seats:', err))
      .finally(() => setLoading(false));

    const newSocket = io((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
    newSocket.emit('join_room', showId);
    newSocket.on('seat_status_updated', (updatedSeat: any) => {
      setSeats(prev => prev.map(s => s.id === updatedSeat.id ? { ...s, ...updatedSeat, venue_seat: updatedSeat.venue_seat || s.venue_seat } : s));
      setSelectedSeats(prev => prev.map(s => s.id === updatedSeat.id ? { ...s, ...updatedSeat, venue_seat: updatedSeat.venue_seat || s.venue_seat } : s));
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
        setSelectedSeats(prev => prev.filter(s => s.status !== 'held' || s.held_by !== user?.id));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [seats, user?.id]);

  const toggleSeatSelection = (seat: any) => {
    if (seat.status === 'booked' || (seat.status === 'held' && seat.held_by !== user?.id)) {
      setSelectedSeats([seat]);
      return;
    }
    
    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) return prev.filter(s => s.id !== seat.id);
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
      const updatedFromServer = res.data;
      setSeats(prev => prev.map(s => {
        const up = updatedFromServer.find((u: any) => u.id === s.id);
        return up ? { ...s, ...up, venue_seat: up.venue_seat || s.venue_seat } : s;
      }));
      setSelectedSeats(prev => prev.map(s => {
        const up = updatedFromServer.find((u: any) => u.id === s.id);
        return up ? { ...s, ...up, venue_seat: up.venue_seat || s.venue_seat } : s;
      }));
    } catch (err: any) {
      alert(err.message);
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
        const res = await fetchApi(`/holds/${hold.id}`, { method: 'DELETE' });
        setSeats(prev => prev.map(s => s.id === hold.id ? { ...s, ...res.data, venue_seat: res.data.venue_seat || s.venue_seat } : s));
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Failed to release hold');
      }
    }
    setSelectedSeats([]);
  };

  const handleReleaseSingle = async (holdId: string) => {
    try {
      const res = await fetchApi(`/holds/${holdId}`, { method: 'DELETE' });
      setSeats(prev => prev.map(s => s.id === holdId ? { ...s, ...res.data, venue_seat: res.data.venue_seat || s.venue_seat } : s));
      setSelectedSeats(prev => prev.filter(s => s.id !== holdId));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to release hold');
    }
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
        <p className="font-display-xl text-4xl uppercase tracking-tighter">Loading Seat Map...</p>
      </div>
    </div>
  );

  const rows = Array.from(new Set(seats.map(s => s.venue_seat.row_label))).sort();
  const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);

  const getPrice = (categoryId: string) => {
    const p = pricing.find(p => p.category_id === categoryId);
    return p ? Number(p.price) : 0;
  };

  const getCategoryName = (categoryId: string) => {
    const pricingItem = pricing.find(p => p.category_id === categoryId);
    if (pricingItem?.category?.name) return pricingItem.category.name;
    const seat = seats.find(s => s.venue_seat?.category_id === categoryId);
    if (seat?.venue_seat?.category?.name) return seat.venue_seat.category.name;

    // Smart fallbacks based on price
    const price = getPrice(categoryId);
    if (price >= 250) return 'VIP Pit';
    if (price >= 150) return 'Golden Circle / VIP Pavilion';
    if (price >= 100) return 'Lower Tier';
    if (price >= 50) return 'Upper Deck / Stand';
    if (price >= 30) return 'Executive Recliner / General Admission';
    if (price >= 20) return 'Premium Club';
    return 'Standard';
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

  const renderSeat = (seat: any, compact = false) => {
    const isZoneFiltered = selectedCategory !== 'all' && seat.venue_seat.category_id !== selectedCategory;

    return (
      <button
        key={seat.id}
        onClick={() => toggleSeatSelection(seat)}
        disabled={isZoneFiltered}
        className={`seat-btn ${compact ? '!w-7 !h-7 !text-[10px]' : ''} ${getSeatClass(seat)} ${
          isZoneFiltered ? 'opacity-20 grayscale pointer-events-none scale-90' : ''
        } ${
          !isZoneFiltered && selectedCategory !== 'all' ? 'ring-4 ring-primary-fixed scale-110 z-10' : ''
        }`}
        title={`${seat.venue_seat.row_label}${seat.venue_seat.seat_number} — ${seat.status} ($${getPrice(seat.venue_seat.category_id)})`}
      >
        {seat.venue_seat.seat_number}
      </button>
    );
  };

  // Dedicated 360-Degree Concert Arena Layout (Optimized Contrast)
  const renderConcertStadiumLayout = () => {
    const getRowSeats = (row: string, startNum?: number, endNum?: number) => {
      let rowSeats = seats
        .filter(s => s.venue_seat.row_label === row)
        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number);
      if (startNum !== undefined && endNum !== undefined) {
        rowSeats = rowSeats.filter(s => s.venue_seat.seat_number >= startNum && s.venue_seat.seat_number <= endNum);
      }
      return rowSeats;
    };

    return (
      <div className="flex flex-col gap-6 items-center w-full max-w-full px-2">
        {/* 1. NORTH: VIP PIT (Rows A & B) */}
        <div className="w-full max-w-4xl bg-amber-100 border-4 border-amber-600 p-3 neo-brutalism-shadow rounded-lg text-center">
          <div className="font-headline-lg-mobile text-amber-950 uppercase tracking-widest mb-2 flex items-center justify-center gap-2 text-xs font-black">
            <span className="material-symbols-outlined text-sm">star</span>
            <span>VIP STAGE PIT (FRONT ACCESS)</span>
            <span className="material-symbols-outlined text-sm">star</span>
          </div>
          <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
            {['A', 'B'].map(row => (
              <div key={row} className="flex gap-2 items-center justify-center">
                <span className="font-data-label text-xs text-amber-900 w-4 font-black">{row}</span>
                <div className="flex gap-1.5">
                  {getRowSeats(row).map(seat => renderSeat(seat, true))}
                </div>
                <span className="font-data-label text-xs text-amber-900 w-4 font-black">{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CENTER STAGE & SIDE WINGS HUB */}
        <div className="w-full max-w-4xl flex flex-col xl:flex-row gap-4 items-center justify-center">
          {/* WEST TIER (Left Wing - Rows F, G, H, seats 1-8) */}
          <div className="bg-teal-100 border-4 border-teal-600 p-3 neo-brutalism-shadow rounded-lg text-center shrink-0">
            <div className="font-headline-lg-mobile text-teal-950 uppercase tracking-wider mb-2 text-xs font-black flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">stadium</span>
              <span>WEST TIER WING</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              {['F', 'G', 'H'].map(row => (
                <div key={`west-${row}`} className="flex gap-1.5 items-center justify-center">
                  <span className="font-data-label text-xs text-teal-950 font-black w-4">{row}</span>
                  <div className="flex gap-1">
                    {getRowSeats(row, 1, 8).map(seat => renderSeat(seat, true))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 360 STAGE CENTER PIECE */}
          <div className="shrink-0 w-56 bg-on-background text-primary-fixed border-4 border-on-background neo-brutalism-shadow p-4 flex flex-col items-center justify-center text-center relative overflow-hidden my-2 xl:my-0">
            <div className="absolute top-1 left-1 text-[9px] font-mono text-amber-300 font-bold">AUDIO STACK</div>
            <div className="absolute top-1 right-1 text-[9px] font-mono text-amber-300 font-bold">AUDIO STACK</div>
            <span className="material-symbols-outlined text-3xl text-amber-400 mb-1 animate-bounce">graphic_eq</span>
            <span className="font-headline-lg text-xs uppercase tracking-widest text-primary-fixed leading-tight font-black">
              CENTRAL STAGE
            </span>
            <div className="w-full h-1.5 bg-amber-400 border border-on-background my-1.5 animate-pulse"></div>
            <span className="text-[10px] font-mono uppercase text-amber-300 font-bold tracking-wider">
              360° STADIUM HUB
            </span>
          </div>

          {/* EAST TIER (Right Wing - Rows F, G, H, seats 9-16) */}
          <div className="bg-teal-100 border-4 border-teal-600 p-3 neo-brutalism-shadow rounded-lg text-center shrink-0">
            <div className="font-headline-lg-mobile text-teal-950 uppercase tracking-wider mb-2 text-xs font-black flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">stadium</span>
              <span>EAST TIER WING</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              {['F', 'G', 'H'].map(row => (
                <div key={`east-${row}`} className="flex gap-1.5 items-center justify-center">
                  <div className="flex gap-1">
                    {getRowSeats(row, 9, 16).map(seat => renderSeat(seat, true))}
                  </div>
                  <span className="font-data-label text-xs text-teal-950 font-black w-4">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SOUTH INNER: GOLDEN CIRCLE GA FLOOR (Rows C, D & E) */}
        <div className="w-full max-w-4xl bg-purple-100 border-4 border-purple-600 p-3 neo-brutalism-shadow rounded-lg text-center">
          <div className="font-headline-lg-mobile text-purple-950 uppercase tracking-widest mb-2 flex items-center justify-center gap-2 text-xs font-black">
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>GOLDEN CIRCLE DANCE FLOOR</span>
            <span className="material-symbols-outlined text-sm">bolt</span>
          </div>
          <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
            {['C', 'D', 'E'].map(row => (
              <div key={row} className="flex gap-2 items-center justify-center">
                <span className="font-data-label text-xs text-purple-950 w-4 font-black">{row}</span>
                <div className="flex gap-1.5">
                  {getRowSeats(row).map(seat => renderSeat(seat, true))}
                </div>
                <span className="font-data-label text-xs text-purple-950 w-4 font-black">{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. SOUTH OUTER: UPPER DECK BLEACHERS (Rows I, J & K) */}
        <div className="w-full max-w-4xl bg-slate-900 border-4 border-slate-700 p-3 neo-brutalism-shadow rounded-lg text-center">
          <div className="font-headline-lg-mobile text-slate-100 uppercase tracking-widest mb-2 text-xs font-black flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">chair</span>
            <span>UPPER DECK BLEACHERS & REAR ARENA</span>
          </div>
          <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
            {['I', 'J', 'K'].map(row => (
              <div key={row} className="flex gap-2 items-center justify-center">
                <span className="font-data-label text-xs text-slate-200 w-4 font-bold">{row}</span>
                <div className="flex gap-1.5">
                  {getRowSeats(row).map(seat => renderSeat(seat, true))}
                </div>
                <span className="font-data-label text-xs text-slate-200 w-4 font-bold">{row}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Dedicated Intimate Comedy Club Layout (Optimized Contrast)
  const renderComedyLayout = () => {
    return (
      <div className="flex flex-col gap-6 items-center w-full max-w-4xl mx-auto px-2">
        <div className="w-full bg-amber-400 text-on-background border-4 border-on-background p-3 neo-brutalism-shadow font-black text-center uppercase tracking-widest text-xs flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">mic</span>
          <span>INTIMATE COMEDY CLUB — ALL SEATS FLAT $35.00</span>
          <span className="material-symbols-outlined text-base">mic</span>
        </div>

        {/* Center Mic Spotlight */}
        <div className="w-48 h-20 bg-yellow-200 border-4 border-dashed border-yellow-600 rounded-full flex flex-col items-center justify-center my-2 text-center neo-brutalism-shadow">
          <span className="material-symbols-outlined text-yellow-800 text-2xl animate-pulse">mic</span>
          <span className="font-mono text-[10px] text-amber-950 font-black uppercase tracking-wider">SPOTLIGHT MIC STAND</span>
        </div>

        {/* Club Seats in clustered layout */}
        <div className="flex flex-col gap-3 items-center w-full">
          {rows.map(row => (
            <div key={row as string} className="flex gap-2 items-center justify-center bg-surface border-2 border-on-background p-2 neo-brutalism-shadow-sm rounded-lg">
              <span className="font-data-label text-xs font-black text-on-background w-6 text-right">{row as string}</span>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {seats
                  .filter(s => s.venue_seat.row_label === row)
                  .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number)
                  .map(seat => renderSeat(seat, true))}
              </div>
              <span className="font-data-label text-xs font-black text-on-background w-6 text-left">{row as string}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Dedicated Sports Stadium Layout (Optimized Contrast)
  const renderSportsLayout = () => {
    const isCricket = showData?.event?.title?.toLowerCase().includes('cricket') || showData?.venue?.name?.toLowerCase().includes('cricket');

    const getRowSeats = (row: string, startNum?: number, endNum?: number) => {
      let rowSeats = seats
        .filter(s => s.venue_seat.row_label === row)
        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number);
      if (startNum !== undefined && endNum !== undefined) {
        rowSeats = rowSeats.filter(s => s.venue_seat.seat_number >= startNum && s.venue_seat.seat_number <= endNum);
      }
      return rowSeats;
    };

    return (
      <div className="flex flex-col gap-6 items-center w-full max-w-5xl mx-auto px-2">
        {/* 1. VIP PAVILION BOX (NORTH) */}
        <div className="w-full max-w-4xl bg-amber-100 border-4 border-amber-600 p-3 neo-brutalism-shadow rounded-lg text-center">
          <div className="font-headline-lg-mobile text-amber-950 uppercase tracking-widest mb-2 flex items-center justify-center gap-2 text-xs font-black">
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
            <span>VIP PAVILION & SUITE BOX ($150)</span>
            <span className="material-symbols-outlined text-sm">workspace_premium</span>
          </div>
          <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
            {['A', 'B'].map(row => (
              <div key={row} className="flex gap-2 items-center justify-center">
                <span className="font-data-label text-xs text-amber-900 w-4 font-black">{row}</span>
                <div className="flex gap-1.5">
                  {getRowSeats(row).map(seat => renderSeat(seat, true))}
                </div>
                <span className="font-data-label text-xs text-amber-900 w-4 font-black">{row}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CENTRAL SPORTS FIELD & SIDE WINGS */}
        <div className="w-full max-w-4xl flex flex-col xl:flex-row gap-4 items-center justify-center">
          {/* WEST TIER SIDE STAND (Rows C, D, E, seats 1-7) */}
          <div className="bg-teal-100 border-4 border-teal-600 p-3 neo-brutalism-shadow rounded-lg text-center shrink-0">
            <div className="font-headline-lg-mobile text-teal-950 uppercase tracking-wider mb-2 text-xs font-black flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">stadium</span>
              <span>WEST STAND WING ($85)</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              {['C', 'D', 'E'].map(row => (
                <div key={`west-${row}`} className="flex gap-1.5 items-center justify-center">
                  <span className="font-data-label text-xs text-teal-950 font-black w-4">{row}</span>
                  <div className="flex gap-1">
                    {getRowSeats(row, 1, 7).map(seat => renderSeat(seat, true))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTRAL FIELD VISIBILITY ENGINE */}
          {isCricket ? (
            /* CRICKET CIRCULAR OVAL FIELD */
            <div className="shrink-0 w-64 h-48 bg-emerald-900/40 border-4 border-emerald-600 rounded-full neo-brutalism-shadow p-3 flex flex-col items-center justify-center text-center relative overflow-hidden my-2 xl:my-0">
              <div className="w-48 h-32 border-2 border-dashed border-emerald-400 rounded-full flex flex-col items-center justify-center relative">
                {/* 22-Yard Pitch Strip */}
                <div className="w-20 h-20 bg-amber-100 border-2 border-amber-600 flex flex-col justify-between items-center py-1 rounded">
                  <div className="w-10 h-1 bg-amber-800"></div>
                  <span className="text-[10px] font-mono font-black text-amber-950">CRICKET PITCH</span>
                  <div className="w-10 h-1 bg-amber-800"></div>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase text-emerald-950 font-black bg-emerald-200 px-2.5 py-0.5 rounded border border-emerald-500 tracking-wider mt-1 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs">sports_cricket</span>
                <span>30-YARD CRICKET OVAL</span>
              </span>
            </div>
          ) : (
            /* FOOTBALL RECTANGULAR PITCH */
            <div className="shrink-0 w-64 h-48 bg-emerald-800 border-4 border-white neo-brutalism-shadow p-2 flex flex-col items-center justify-between text-center relative overflow-hidden my-2 xl:my-0">
              <div className="w-full flex justify-between items-center text-xs">
                <span className="material-symbols-outlined text-white">sports_soccer</span>
                <span className="text-[10px] font-mono text-white font-black">SOCCER FIELD</span>
                <span className="material-symbols-outlined text-white">sports_soccer</span>
              </div>
              <div className="w-full border-t-2 border-white relative flex items-center justify-center my-auto">
                <div className="w-16 h-16 border-2 border-white rounded-full absolute"></div>
              </div>
              <span className="text-[10px] font-mono uppercase text-white font-black tracking-wider flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-xs">sports_soccer</span>
                <span>TOUCHLINE & GOAL POSTS</span>
              </span>
            </div>
          )}

          {/* EAST TIER SIDE STAND (Rows C, D, E, seats 8-14) */}
          <div className="bg-teal-100 border-4 border-teal-600 p-3 neo-brutalism-shadow rounded-lg text-center shrink-0">
            <div className="font-headline-lg-mobile text-teal-950 uppercase tracking-wider mb-2 text-xs font-black flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-sm">stadium</span>
              <span>EAST STAND WING ($85)</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
              {['C', 'D', 'E'].map(row => (
                <div key={`east-${row}`} className="flex gap-1.5 items-center justify-center">
                  <div className="flex gap-1">
                    {getRowSeats(row, 8, 14).map(seat => renderSeat(seat, true))}
                  </div>
                  <span className="font-data-label text-xs text-teal-950 font-black w-4">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. SOUTH BLEACHERS (Rows F, G, H) */}
        <div className="w-full max-w-4xl bg-slate-900 border-4 border-slate-700 p-3 neo-brutalism-shadow rounded-lg text-center">
          <div className="font-headline-lg-mobile text-slate-100 uppercase tracking-widest mb-2 text-xs font-black flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">chair</span>
            <span>UPPER DECK STADIUM BLEACHERS ($35)</span>
          </div>
          <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
            {['F', 'G', 'H'].map(row => (
              <div key={row} className="flex gap-2 items-center justify-center">
                <span className="font-data-label text-xs text-slate-200 w-4 font-bold">{row}</span>
                <div className="flex gap-1.5">
                  {getRowSeats(row).map(seat => renderSeat(seat, true))}
                </div>
                <span className="font-data-label text-xs text-slate-200 w-4 font-bold">{row}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex-grow flex flex-col bg-background relative selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Header */}
      <header className="bg-on-background text-on-primary border-b-4 border-on-background flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} aria-label="Go Back" className="bg-surface text-on-surface hover:bg-primary-fixed hover:text-on-primary-fixed border-border-width border-on-background p-2 neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="font-headline-lg-mobile md:font-headline-lg uppercase text-primary-fixed tracking-tight leading-none">VENUE MAP</h1>
            {showData && (
              <div className="hidden md:flex flex-wrap gap-3 mt-2">
                <span className="font-data-label text-data-label uppercase bg-primary-fixed text-on-primary-fixed px-3 py-1 flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {new Date(showData.date).toLocaleDateString()}
                </span>
                <span className="font-data-label text-data-label uppercase bg-secondary-fixed text-on-secondary-fixed px-3 py-1 flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {showData.time}
                </span>
                <span className="font-data-label text-data-label uppercase bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  {showData.venue?.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {countdown !== null && (
          <div className="font-data-label text-data-label bg-error text-on-error border-border-width border-on-background px-4 py-2 neo-brutalism-shadow animate-pulse font-bold">
            HOLD EXPIRES IN {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
        )}
      </header>

      {/* Mobile Details Bar */}
      {showData && (
        <div className="md:hidden bg-surface border-b-4 border-on-background p-4 flex flex-wrap gap-2 justify-center">
          <span className="font-data-label text-data-label uppercase bg-primary-fixed text-on-primary-fixed border-border-width border-on-background px-3 py-1 flex items-center gap-1 neo-brutalism-shadow-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            {new Date(showData.date).toLocaleDateString()}
          </span>
          <span className="font-data-label text-data-label uppercase bg-secondary-fixed text-on-secondary-fixed border-border-width border-on-background px-3 py-1 flex items-center gap-1 neo-brutalism-shadow-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {showData.time}
          </span>
          <span className="font-data-label text-data-label uppercase bg-tertiary-fixed text-on-tertiary-fixed border-border-width border-on-background px-3 py-1 flex items-center gap-1 neo-brutalism-shadow-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {showData.venue?.name}
          </span>
        </div>
      )}

      <div className="flex-grow flex flex-col md:flex-row relative">
        {/* Main Seat Canvas */}
        <section className="flex-grow bg-surface-container blueprint-bg relative overflow-x-auto flex flex-col p-4 md:p-6 border-b-4 md:border-b-0 md:border-r-4 border-on-background">

          {/* Zone Selector Filter Bar */}
          {pricing.length > 0 && (
            <div className="max-w-5xl mx-auto w-full mb-6 bg-surface border-4 border-on-background p-3 neo-brutalism-shadow flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed text-lg">filter_alt</span>
                <span className="font-data-label text-data-label uppercase font-bold text-on-surface">SELECT ZONE:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 font-data-label text-data-label uppercase border-2 border-on-background transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-on-background text-on-primary font-bold neo-brutalism-shadow-sm'
                      : 'bg-surface text-on-surface hover:bg-surface-container'
                  }`}
                >
                  ALL ZONES
                </button>
                {pricing.map(p => {
                  const categoryName = getCategoryName(p.category_id);
                  const isSelected = selectedCategory === p.category_id;
                  return (
                    <button
                      key={p.category_id}
                      onClick={() => setSelectedCategory(isSelected ? 'all' : p.category_id)}
                      className={`px-3 py-1 font-data-label text-data-label uppercase border-2 border-on-background transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-primary-fixed text-on-primary-fixed font-bold scale-105 neo-brutalism-shadow-sm'
                          : 'bg-surface text-on-surface hover:bg-primary-container'
                      }`}
                    >
                      <span>{categoryName}</span>
                      <span className="bg-on-background text-on-primary px-1.5 py-0.5 text-[10px] font-mono">
                        ${Number(p.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seat Map Canvas Rendering */}
          <div className="seat-map-container overflow-x-auto flex-grow pb-24 w-full flex justify-center">
            {showData?.event?.type === 'concert' ? (
              renderConcertStadiumLayout()
            ) : showData?.event?.type === 'comedy' ? (
              renderComedyLayout()
            ) : showData?.event?.type === 'sports' ? (
              renderSportsLayout()
            ) : (
              <div className="flex flex-col gap-6 w-max mx-auto">
                {/* Cinema Screen Header */}
                {showData?.event?.type === 'movie' && (
                  <div className="max-w-4xl mx-auto w-full mb-8">
                    <div className="relative">
                      <div className="w-full h-10 bg-on-background text-primary-fixed font-headline-lg-mobile text-center flex items-center justify-center border-4 border-on-background neo-brutalism-shadow rounded-b-[40%] overflow-hidden bg-gradient-to-r from-on-background via-slate-800 to-on-background">
                        <span className="tracking-[0.25em] font-black text-sm text-yellow-300 animate-pulse">CINEMA CURVED SCREEN</span>
                      </div>
                      <div className="text-center text-[10px] uppercase font-mono font-black text-on-surface mt-2 tracking-widest flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-xs">arrow_drop_up</span>
                        <span>AUDIENCE FACING SCREEN</span>
                        <span className="material-symbols-outlined text-xs">arrow_drop_up</span>
                      </div>
                    </div>
                  </div>
                )}

                {rows.map(row => (
                  <div key={row as string} className="flex gap-4 items-center justify-center">
                    <span className="font-data-label text-data-label text-on-surface font-black w-8 text-right shrink-0">{row as string}</span>
                    <div className="flex gap-2">
                      {seats
                        .filter(s => s.venue_seat.row_label === row)
                        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number)
                        .map(seat => {
                          const isMovie = showData?.event?.type === 'movie';
                          const showAisleGap = isMovie && seat.venue_seat.seat_number === 8;

                          return (
                            <div key={seat.id} className="flex items-center">
                              {showAisleGap && (
                                <div className="w-8 h-full flex items-center justify-center font-mono text-[10px] text-on-surface font-bold opacity-60 uppercase px-1">
                                  AISLE
                                </div>
                              )}
                              {renderSeat(seat)}
                            </div>
                          );
                        })}
                    </div>
                    <span className="font-data-label text-data-label text-on-surface font-black w-8 text-left shrink-0">{row as string}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seat Status Legend */}
          <div className="absolute bottom-4 left-4 right-4 md:left-margin-desktop md:right-auto bg-surface border-border-width border-on-background p-4 neo-brutalism-shadow flex flex-wrap gap-4 items-center z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-surface"></div>
              <span className="font-data-label text-data-label uppercase font-bold">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-tertiary-fixed"></div>
              <span className="font-data-label text-data-label uppercase font-bold">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-secondary-container"></div>
              <span className="font-data-label text-data-label uppercase font-bold">Your Hold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-on-background bg-primary-fixed opacity-70"></div>
              <span className="font-data-label text-data-label uppercase font-bold">Unavailable</span>
            </div>
          </div>
        </section>

        {/* Sidebar */}
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
                        <div className="font-data-label text-data-label bg-tertiary-fixed text-on-tertiary-fixed px-2 py-1 border-2 border-on-background inline-block mb-2 font-bold">
                          {getCategoryName(s.venue_seat.category_id)}
                        </div>
                        <div className="font-headline-lg-mobile text-on-surface font-black">ROW {s.venue_seat.row_label} <br /> NUM {s.venue_seat.seat_number}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="font-headline-lg-mobile text-secondary font-black">${getPrice(s.venue_seat.category_id)}</div>
                        <button 
                          onClick={() => handleReleaseSingle(s.id)}
                          className="bg-error text-on-error p-1 border-2 border-on-background hover:bg-red-600 transition-colors"
                          title="Release Hold"
                        >
                          <span className="material-symbols-outlined text-[16px] block">close</span>
                        </button>
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
               <h3 className="font-headline-lg-mobile text-sm uppercase mb-3 text-on-surface font-bold">Guest Details</h3>
               <div className="flex flex-col gap-3">
                 <input 
                   type="text" 
                   placeholder="FULL NAME" 
                   value={customerName}
                   onChange={e => setCustomerName(e.target.value)}
                   className="w-full bg-surface border-2 border-on-background p-2 font-data-label text-data-label focus:outline-none focus:border-primary-fixed font-bold"
                 />
                 <input 
                   type="tel" 
                   placeholder="PHONE NUMBER" 
                   value={customerPhone}
                   onChange={e => setCustomerPhone(e.target.value)}
                   className="w-full bg-surface border-2 border-on-background p-2 font-data-label text-data-label focus:outline-none focus:border-primary-fixed font-bold"
                 />
               </div>
            </div>
          )}

          {/* Total & Checkout */}
          <div className="p-margin-mobile bg-surface mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="font-data-label text-data-label uppercase font-bold">Subtotal ({myHolds.length} Tickets)</span>
              <span className="font-headline-lg text-primary font-black">${subtotal.toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={myHolds.length === 0 || checkingOut}
              className="w-full bg-primary-fixed text-on-primary-fixed border-border-width border-on-background py-4 font-headline-lg uppercase neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-black"
            >
              <span>{checkingOut ? 'Processing...' : 'Checkout'}</span>
              <span className="material-symbols-outlined font-bold">arrow_forward</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
