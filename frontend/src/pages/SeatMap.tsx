import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { fetchApi, getSocketUrl } from '../api/client';
import { useAuthStore } from '../store/auth';
import { useModalStore } from '../store/modal';
import { AddonSelectionModal } from '../components/AddonSelectionModal';

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
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);

  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const { showError, showSuccess, showAlert } = useModalStore();

  useEffect(() => {
    fetchApi(`/shows/${showId}/seats`)
      .then(res => {
        setSeats(res.data.seats || []);
        setPricing(res.data.pricing || []);
        setShowData(res.data.show || null);
      })
      .catch(err => console.error('Failed to fetch seats:', err))
      .finally(() => setLoading(false));

    const newSocket = io(getSocketUrl());
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
    if (!user) {
      showAlert('Please log in to your Seatzy account to hold seats and proceed to checkout.', {
        title: 'SIGN IN REQUIRED',
        type: 'warning',
        buttonText: 'SIGN IN NOW',
        onClose: () => navigate('/login')
      });
      return;
    }

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
      if (err.status === 401) {
        showError(err.message || 'Session expired. Please sign in again.', {
          title: 'SESSION EXPIRED',
          buttonText: 'SIGN IN NOW',
          onClose: () => navigate('/login')
        });
      } else {
        showError(err.message || 'Failed to hold seat');
      }
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
        showError(err.message || 'Failed to release hold');
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
      showError(err.message || 'Failed to release hold');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      return showAlert('Please log in to your Seatzy account to complete your booking.', {
        title: 'SIGN IN REQUIRED',
        type: 'warning',
        buttonText: 'SIGN IN NOW',
        onClose: () => navigate('/login')
      });
    }

    const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);
    if (myHolds.length === 0) return showAlert('No seats held. Please select and hold seats before checkout.', { title: 'HOLD SEATS FIRST', type: 'warning' });
    
    if (!customerName || !customerName.trim()) {
      return showAlert('Please enter your full name to complete booking.', { title: 'NAME REQUIRED', type: 'warning' });
    }

    const digitsOnly = customerPhone.replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      return showAlert('Please enter a valid 10-digit mobile number (e.g. 9876543210) to proceed.', { title: 'INVALID PHONE NUMBER', type: 'warning' });
    }

    setIsAddonModalOpen(true);
  };

  const executeFinalBooking = async (selectedAddons: { addon_item_id: string; quantity: number }[], couponCode?: string) => {
    if (!user) {
      return showAlert('Please sign in to complete your booking.', {
        title: 'SIGN IN REQUIRED',
        type: 'warning',
        buttonText: 'SIGN IN NOW',
        onClose: () => navigate('/login')
      });
    }

    setIsAddonModalOpen(false);
    const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);
    setCheckingOut(true);
    try {
      const res = await fetchApi(`/bookings`, {
        method: 'POST',
        body: JSON.stringify({ 
          show_id: showId, 
          seat_status_ids: myHolds.map(s => s.id),
          customer_name: customerName,
          customer_phone: customerPhone,
          addons: selectedAddons,
          coupon_code: couponCode
        })
      });
      showSuccess(`Booking Confirmed!\n\nReference Code: ${res.data.booking_reference}\n\nYour QR Code ticket has been sent to your email.`, {
        title: 'TICKET BOOKED!',
        buttonText: 'VIEW MY TICKETS',
        onClose: () => navigate('/bookings')
      });
    } catch (err: any) {
      if (err.status === 401) {
        showError(err.message || 'Session expired. Please sign in again.', {
          title: 'SESSION EXPIRED',
          buttonText: 'SIGN IN NOW',
          onClose: () => navigate('/login')
        });
      } else {
        showError(err.message || 'Checkout failed');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  const handleWaitlist = async (seat: any) => {
    if (!user) {
      return showAlert('Please log in to your Seatzy account to join the priority waitlist.', {
        title: 'SIGN IN REQUIRED',
        type: 'warning',
        buttonText: 'SIGN IN NOW',
        onClose: () => navigate('/login')
      });
    }

    try {
      await fetchApi(`/shows/${showId}/waitlist`, {
        method: 'POST',
        body: JSON.stringify({ category_id: seat.venue_seat.category_id })
      });
      showSuccess('You have successfully joined the waitlist for this seat category!\n\nIf a ticket becomes available, you will receive an exclusive email link.', { title: 'WAITLIST JOINED' });
    } catch (err: any) {
      if (err.status === 401) {
        showError(err.message || 'Session expired. Please sign in again.', {
          title: 'SESSION EXPIRED',
          buttonText: 'SIGN IN NOW',
          onClose: () => navigate('/login')
        });
      } else {
        showError(err.message || 'Failed to join waitlist');
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-primary-container text-on-background border-2 sm:border-4 border-on-background neo-brutalist-shadow px-8 py-6 text-center">
        <p className="font-display-xl text-xl sm:text-3xl md:text-4xl uppercase tracking-tighter">Loading Seat Map...</p>
      </div>
    </div>
  );

  const rows = Array.from(new Set(seats.map(s => s.venue_seat.row_label))).sort();
  const myHolds = seats.filter(s => s.status === 'held' && s.held_by === user?.id);

  const getPrice = (categoryId: string) => {
    const p = pricing.find(p => p.category_id === categoryId);
    if (p) return Number(p.price);
    // Fallback for seed data mismatch
    if (pricing.length > 0) return Number(pricing[0].price);
    return 0;
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

  const getSeatCategoryColor = (seat: any) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isMyHold = seat.status === 'held' && seat.held_by === user?.id;
    const isBooked = seat.status === 'booked';
    const isOtherHold = seat.status === 'held' && seat.held_by !== user?.id;

    if (isBooked || isOtherHold || isMyHold || isSelected) return '';

    const categoryName = getCategoryName(seat.venue_seat.category_id).toLowerCase();
    const price = getPrice(seat.venue_seat.category_id);

    if (categoryName.includes('recliner') || price >= 400) {
      return '!bg-amber-300 !text-amber-950 !border-amber-900 hover:!bg-amber-400 font-black shadow-sm';
    }
    if (categoryName.includes('premium') || price >= 300) {
      return '!bg-cyan-300 !text-cyan-950 !border-cyan-900 hover:!bg-cyan-400 font-black shadow-sm';
    }
    return '!bg-slate-200 !text-slate-900 !border-slate-700 hover:!bg-slate-300 font-bold';
  };

  const renderSeat = (seat: any, compact = false) => {
    const isZoneFiltered = selectedCategory !== 'all' && seat.venue_seat.category_id !== selectedCategory;
    const categoryClass = getSeatCategoryColor(seat);

    return (
      <button
        key={seat.id}
        onClick={() => toggleSeatSelection(seat)}
        disabled={isZoneFiltered}
        className={`seat-btn ${compact ? '!w-8 !h-8 sm:!w-7 sm:!h-7 !text-[11px] sm:!text-[10px]' : '!w-9 !h-9 sm:!w-8 sm:!h-8 text-xs'} ${getSeatClass(seat)} ${categoryClass} ${
          isZoneFiltered ? 'opacity-20 grayscale pointer-events-none scale-90' : ''
        } ${
          !isZoneFiltered && selectedCategory !== 'all' ? 'ring-4 ring-primary-fixed scale-110 z-10' : ''
        } touch-manipulation min-w-[32px] min-h-[32px]`}
        title={`${seat.venue_seat.row_label}${seat.venue_seat.seat_number} — ${getCategoryName(seat.venue_seat.category_id)} (₹${getPrice(seat.venue_seat.category_id)})`}
      >
        {seat.venue_seat.seat_number}
      </button>
    );
  };

  // Dedicated 360-Degree Concert Arena Layout
  const renderConcertStadiumLayout = () => {
    const vipRows = rows.slice(0, 2) as string[];
    const goldenRows = rows.slice(2, 5) as string[];
    const tierRows = rows.slice(5, 8) as string[];
    const upperRows = rows.slice(8) as string[];

    const getRowSeats = (row: string, startNum?: number, endNum?: number) => {
      let rowSeats = seats
        .filter(s => s.venue_seat.row_label === row)
        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number);
      if (startNum !== undefined && endNum !== undefined) {
        rowSeats = rowSeats.filter(s => s.venue_seat.seat_number >= startNum && s.venue_seat.seat_number <= endNum);
      }
      return rowSeats;
    };

    const getBlockCategoryInfo = (blockRows: string[]) => {
      if (blockRows.length === 0) return { name: '', price: 0 };
      const firstSeat = getRowSeats(blockRows[0])[0];
      if (!firstSeat) return { name: '', price: 0 };
      const catId = firstSeat.venue_seat.category_id;
      return { name: getCategoryName(catId), price: getPrice(catId) };
    };

    const vipInfo = getBlockCategoryInfo(vipRows);
    const goldenInfo = getBlockCategoryInfo(goldenRows);
    const tierInfo = getBlockCategoryInfo(tierRows);
    const upperInfo = getBlockCategoryInfo(upperRows);

    return (
      <div className="flex flex-col gap-4 sm:gap-5 items-center w-full max-w-full min-w-[640px] px-2 py-2">

        {/* 1. VIP FRONT STAGE PIT */}
        {vipRows.length > 0 && (
          <div className="w-full max-w-4xl relative overflow-hidden rounded-xl border-2 sm:border-4 border-on-background shadow-md bg-gradient-to-br from-[#faffcc] to-[#e1ed00]">
            <div className="relative p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black text-primary-fixed border-2 border-black flex items-center justify-center rounded">
                    <span className="material-symbols-outlined text-base font-black">star</span>
                  </div>
                  <div>
                    <div className="font-black text-black uppercase tracking-widest text-[11px] sm:text-xs">{vipInfo.name || 'VIP FRONT STAGE PIT'}</div>
                    <div className="text-[9px] font-mono text-slate-800 font-bold">ROWS {vipRows[0]}–{vipRows[vipRows.length - 1]} · CLOSEST TO STAGE</div>
                  </div>
                </div>
                <div className="bg-black text-primary-fixed font-mono text-[10px] sm:text-xs font-black px-2.5 py-1 border border-black tracking-widest shadow-sm">₹{vipInfo.price} / SEAT</div>
              </div>
              <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
                {vipRows.map(row => (
                  <div key={row} className="flex gap-2 items-center justify-center">
                    <span className="font-data-label text-xs text-black font-black w-5 text-right shrink-0">{row}</span>
                    <div className="flex gap-1.5">
                      {getRowSeats(row).map(seat => renderSeat(seat, true))}
                    </div>
                    <span className="font-data-label text-xs text-black font-black w-5 text-left shrink-0">{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. CENTER SECTION — STAGE + SIDE WINGS */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4 items-stretch justify-center">

          {/* WEST TIER WING */}
          {tierRows.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border-2 sm:border-4 border-teal-500 shadow-md shrink-0" style={{background: 'linear-gradient(160deg, #ccfbf1 0%, #99f6e4 60%, #5eead4 100%)'}}>
              <div className="p-3 pt-4">
                <div className="flex items-center gap-1.5 mb-2 justify-center">
                  <span className="material-symbols-outlined text-teal-900 text-sm">stadium</span>
                  <div className="text-center">
                    <div className="font-black text-teal-950 uppercase text-[11px] tracking-widest">{tierInfo.name || 'WEST TIER'}</div>
                    <div className="text-[9px] font-mono text-teal-800 font-bold">ROWS {tierRows[0]}–{tierRows[tierRows.length - 1]} · ₹{tierInfo.price}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-center">
                  {tierRows.map(row => (
                    <div key={`west-${row}`} className="flex gap-1 items-center justify-center">
                      <span className="font-data-label text-[11px] text-teal-950 font-black w-4 text-right">{row}</span>
                      <div className="flex gap-1">
                        {getRowSeats(row, 1, 8).map(seat => renderSeat(seat, true))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CENTRAL STAGE CENTERPIECE */}
          <div className="shrink-0 flex-grow max-w-xs flex flex-col">
            <div className="relative flex-grow overflow-hidden rounded-xl border-2 sm:border-4 border-gray-800 shadow-md flex flex-col items-center justify-center p-4 text-center min-h-[140px]" style={{background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%)'}}>
              <div className="relative z-10 flex flex-col items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-400 text-2xl animate-pulse">graphic_eq</span>
                <span className="font-black text-white uppercase tracking-[0.2em] text-xs sm:text-sm">MAIN STAGE</span>
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                  <span className="text-[9px] font-mono text-amber-300 font-bold tracking-widest">LIVE CONCERT ARENA</span>
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* EAST TIER WING */}
          {tierRows.length > 0 && (
            <div className="relative overflow-hidden rounded-xl border-2 sm:border-4 border-teal-500 shadow-md shrink-0" style={{background: 'linear-gradient(200deg, #ccfbf1 0%, #99f6e4 60%, #5eead4 100%)'}}>
              <div className="p-3 pt-4">
                <div className="flex items-center gap-1.5 mb-2 justify-center">
                  <span className="material-symbols-outlined text-teal-900 text-sm">stadium</span>
                  <div className="text-center">
                    <div className="font-black text-teal-950 uppercase text-[11px] tracking-widest">{tierInfo.name || 'EAST TIER'}</div>
                    <div className="text-[9px] font-mono text-teal-800 font-bold">ROWS {tierRows[0]}–{tierRows[tierRows.length - 1]} · ₹{tierInfo.price}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-center">
                  {tierRows.map(row => (
                    <div key={`east-${row}`} className="flex gap-1 items-center justify-center">
                      <div className="flex gap-1">
                        {getRowSeats(row, 9, 16).map(seat => renderSeat(seat, true))}
                      </div>
                      <span className="font-data-label text-[11px] text-teal-950 font-black w-4 text-left">{row}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. GOLDEN CIRCLE DANCE FLOOR */}
        {goldenRows.length > 0 && (
          <div className="w-full max-w-4xl relative overflow-hidden rounded-xl border-2 sm:border-4 border-purple-500 shadow-md" style={{background: 'linear-gradient(135deg, #faf5ff 0%, #e9d5ff 50%, #d8b4fe 100%)'}}>
            <div className="relative p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 border-2 border-purple-900 flex items-center justify-center rounded">
                    <span className="material-symbols-outlined text-white text-base font-black">bolt</span>
                  </div>
                  <div>
                    <div className="font-black text-purple-950 uppercase tracking-widest text-[11px] sm:text-xs">{goldenInfo.name || 'GOLDEN CIRCLE DANCE FLOOR'}</div>
                    <div className="text-[9px] font-mono text-purple-800 font-bold">ROWS {goldenRows[0]}–{goldenRows[goldenRows.length - 1]} · BEST ATMOSPHERE</div>
                  </div>
                </div>
                <div className="bg-purple-800 text-purple-200 font-mono text-[10px] sm:text-xs font-black px-2.5 py-1 border border-purple-500 tracking-widest shadow-[2px_2px_0px_0px_rgba(88,28,135,1)]">₹{goldenInfo.price} / SEAT</div>
              </div>
              <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
                {goldenRows.map(row => (
                  <div key={row} className="flex gap-2 items-center justify-center">
                    <span className="font-data-label text-xs text-purple-950 font-black w-5 text-right shrink-0">{row}</span>
                    <div className="flex gap-1.5">
                      {getRowSeats(row).map(seat => renderSeat(seat, true))}
                    </div>
                    <span className="font-data-label text-xs text-purple-950 font-black w-5 text-left shrink-0">{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. UPPER DECK BLEACHERS */}
        {upperRows.length > 0 && (
          <div className="w-full max-w-4xl relative overflow-hidden rounded-xl border-2 sm:border-4 border-slate-600 shadow-md" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)'}}>
            <div className="relative p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-600 border-2 border-slate-400 flex items-center justify-center rounded">
                    <span className="material-symbols-outlined text-slate-200 text-base">chair</span>
                  </div>
                  <div>
                    <div className="font-black text-slate-100 uppercase tracking-widest text-[11px] sm:text-xs">{upperInfo.name || 'UPPER DECK BLEACHERS'}</div>
                    <div className="text-[9px] font-mono text-slate-400 font-bold">ROWS {upperRows[0]}–{upperRows[upperRows.length - 1]} · ELEVATED ARENA</div>
                  </div>
                </div>
                <div className="bg-slate-800 text-slate-300 font-mono text-[10px] sm:text-xs font-black px-2.5 py-1 border border-slate-500 tracking-widest shadow-[2px_2px_0px_0px_rgba(30,41,59,1)]">₹{upperInfo.price} / SEAT</div>
              </div>
              <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
                {upperRows.map(row => (
                  <div key={row} className="flex gap-2 items-center justify-center">
                    <span className="font-data-label text-xs text-slate-300 font-black w-5 text-right shrink-0">{row}</span>
                    <div className="flex gap-1.5">
                      {getRowSeats(row).map(seat => renderSeat(seat, true))}
                    </div>
                    <span className="font-data-label text-xs text-slate-300 font-black w-5 text-left shrink-0">{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // Dedicated Intimate Comedy Club Layout
  const renderComedyLayout = () => {
    return (
      <div className="flex flex-col gap-4 sm:gap-6 items-center w-full max-w-4xl min-w-[500px] mx-auto px-2">
        <div className="w-full bg-primary-fixed text-on-primary-fixed border-4 border-on-background p-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-center uppercase tracking-widest text-[11px] sm:text-xs flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">mic</span>
          <span>INTIMATE COMEDY CLUB — ALL SEATS FLAT ₹{getPrice('club')}</span>
          <span className="material-symbols-outlined text-base">mic</span>
        </div>

        {/* Center Mic Spotlight */}
        <div className="w-40 sm:w-48 h-16 sm:h-20 bg-primary-fixed/30 border-2 sm:border-4 border-dashed border-black rounded-full flex flex-col items-center justify-center my-1 text-center">
          <span className="material-symbols-outlined text-black text-xl sm:text-2xl animate-pulse">mic</span>
          <span className="font-mono text-[9px] sm:text-[10px] text-black font-black uppercase tracking-wider">SPOTLIGHT MIC STAND</span>
        </div>

        {/* Club Seats */}
        <div className="flex flex-col gap-2.5 items-center w-full">
          {rows.map(row => (
            <div key={row as string} className="flex gap-2 items-center justify-center bg-surface border-2 border-on-background p-2 rounded-lg">
              <span className="font-data-label text-xs font-black text-on-background w-5 text-right">{row as string}</span>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {seats
                  .filter(s => s.venue_seat.row_label === row)
                  .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number)
                  .map(seat => renderSeat(seat, true))}
              </div>
              <span className="font-data-label text-xs font-black text-on-background w-5 text-left">{row as string}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Dedicated Sports Stadium Layout
  const renderSportsLayout = () => {
    const isCricket = showData?.event?.title?.toLowerCase().includes('cricket') || showData?.venue?.name?.toLowerCase().includes('cricket');
    const vipRows = rows.slice(0, 2) as string[];
    const standRows = rows.slice(2, 5) as string[];
    const upperRows = rows.slice(5) as string[];

    const getRowSeats = (row: string, startNum?: number, endNum?: number) => {
      let rowSeats = seats
        .filter(s => s.venue_seat.row_label === row)
        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number);
      if (startNum !== undefined && endNum !== undefined) {
        rowSeats = rowSeats.filter(s => s.venue_seat.seat_number >= startNum && s.venue_seat.seat_number <= endNum);
      }
      return rowSeats;
    };

    const getBlockCategoryInfo = (blockRows: string[]) => {
      if (blockRows.length === 0) return { name: '', price: 0 };
      const firstSeat = getRowSeats(blockRows[0])[0];
      if (!firstSeat) return { name: '', price: 0 };
      const catId = firstSeat.venue_seat.category_id;
      return { name: getCategoryName(catId), price: getPrice(catId) };
    };

    const vipInfo = getBlockCategoryInfo(vipRows);
    const standInfo = getBlockCategoryInfo(standRows);
    const upperInfo = getBlockCategoryInfo(upperRows);

    return (
      <div className="flex flex-col gap-4 sm:gap-6 items-center w-full max-w-5xl min-w-[640px] mx-auto px-2">
        {/* 1. VIP PAVILION BOX */}
        {vipRows.length > 0 && (
          <div className="w-full max-w-4xl relative overflow-hidden rounded-xl border-2 sm:border-4 border-on-background shadow-md bg-gradient-to-br from-[#faffcc] to-[#e1ed00]">
            <div className="relative p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black text-primary-fixed border-2 border-black flex items-center justify-center rounded">
                    <span className="material-symbols-outlined text-base font-black">workspace_premium</span>
                  </div>
                  <div>
                    <div className="font-black text-black uppercase tracking-widest text-[11px] sm:text-xs">{vipInfo.name || 'VIP PAVILION & SUITE BOX'}</div>
                    <div className="text-[9px] font-mono text-slate-800 font-bold">ROWS {vipRows[0]}–{vipRows[vipRows.length - 1]} · PREMIUM HOSPITALITY</div>
                  </div>
                </div>
                <div className="bg-black text-primary-fixed font-mono text-[10px] sm:text-xs font-black px-2.5 py-1 border border-black tracking-widest shadow-sm">₹{vipInfo.price} / SEAT</div>
              </div>
              <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
                {vipRows.map(row => (
                  <div key={row} className="flex gap-2 items-center justify-center">
                    <span className="font-data-label text-xs text-black font-black w-5 text-right shrink-0">{row}</span>
                    <div className="flex gap-1.5">
                      {getRowSeats(row).map(seat => renderSeat(seat, true))}
                    </div>
                    <span className="font-data-label text-xs text-black font-black w-5 text-left shrink-0">{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. CENTRAL FIELD + SIDE STANDS */}
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4 items-stretch justify-center">
          {/* North Stand */}
          <div className="flex-1 bg-surface border-2 sm:border-4 border-on-background p-3 rounded-xl shadow-md">
            <div className="font-headline-lg text-xs sm:text-sm text-on-background uppercase font-black tracking-widest mb-2 flex items-center justify-between pb-1 border-b border-on-background/30">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">stadium</span>
                NORTH STAND
              </span>
              <span className="font-mono text-[10px] font-black text-primary">₹{standInfo.price}</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
              {standRows.map(row => (
                <div key={row} className="flex gap-1.5 items-center">
                  <span className="font-data-label text-[10px] font-black text-on-surface-variant w-4 text-right shrink-0">{row}</span>
                  <div className="flex gap-1">
                    {getRowSeats(row, 1, 8).map(seat => renderSeat(seat, true))}
                  </div>
                  <span className="font-data-label text-[10px] font-black text-on-surface-variant w-4 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Central Ground Graphic */}
          <div className="w-full md:w-48 h-28 md:h-auto bg-emerald-700 border-2 sm:border-4 border-on-background rounded-xl flex flex-col items-center justify-center p-2 shadow-inner relative overflow-hidden shrink-0">
            <div className="w-20 h-20 rounded-full border-2 border-emerald-400/50 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-emerald-400/70" />
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="material-symbols-outlined text-white text-2xl font-black">{isCricket ? 'sports_cricket' : 'sports_soccer'}</span>
              <span className="font-mono text-[9px] text-white font-black uppercase tracking-widest mt-0.5">{isCricket ? 'PITCH CENTER' : 'FIELD CENTER'}</span>
            </div>
          </div>

          {/* South Stand */}
          <div className="flex-1 bg-surface border-2 sm:border-4 border-on-background p-3 rounded-xl shadow-md">
            <div className="font-headline-lg text-xs sm:text-sm text-on-background uppercase font-black tracking-widest mb-2 flex items-center justify-between pb-1 border-b border-on-background/30">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">stadium</span>
                SOUTH STAND
              </span>
              <span className="font-mono text-[10px] font-black text-primary">₹{standInfo.price}</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
              {standRows.map(row => (
                <div key={row} className="flex gap-1.5 items-center">
                  <span className="font-data-label text-[10px] font-black text-on-surface-variant w-4 text-right shrink-0">{row}</span>
                  <div className="flex gap-1">
                    {getRowSeats(row, 9, 16).map(seat => renderSeat(seat, true))}
                  </div>
                  <span className="font-data-label text-[10px] font-black text-on-surface-variant w-4 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. UPPER TIER ROOF STAND */}
        {upperRows.length > 0 && (
          <div className="w-full max-w-4xl bg-stone-200/90 border-2 sm:border-4 border-stone-600 p-3 sm:p-4 rounded-xl shadow-md">
            <div className="font-headline-lg text-xs sm:text-sm text-stone-900 uppercase font-black tracking-widest mb-2 sm:mb-3 flex items-center justify-between pb-1 border-b border-stone-400">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm font-black">roofing</span>
                {upperInfo.name || 'UPPER TIER PANORAMIC DECK'}
              </span>
              <span className="font-mono text-[10px] sm:text-xs font-black text-stone-900">₹{upperInfo.price} / SEAT</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center overflow-x-auto pb-1">
              {upperRows.map(row => (
                <div key={row} className="flex gap-1.5 items-center">
                  <span className="font-data-label text-[10px] font-black text-stone-700 w-4 text-right shrink-0">{row}</span>
                  <div className="flex gap-1">
                    {getRowSeats(row).map(seat => renderSeat(seat, true))}
                  </div>
                  <span className="font-data-label text-[10px] font-black text-stone-700 w-4 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCinemaLayout = () => {
    const totalRows = rows.length;
    let standardRows: string[] = [];
    let premiumRows: string[] = [];
    let reclinerRows: string[] = [];

    if (totalRows <= 4) {
      standardRows = rows.slice(0, 2) as string[];
      premiumRows = rows.slice(2) as string[];
    } else {
      standardRows = rows.slice(0, Math.floor(totalRows * 0.4)) as string[];
      premiumRows = rows.slice(Math.floor(totalRows * 0.4), Math.floor(totalRows * 0.75)) as string[];
      reclinerRows = rows.slice(Math.floor(totalRows * 0.75)) as string[];
    }

    const getRowSeats = (row: string) => {
      return seats
        .filter(s => s.venue_seat.row_label === row)
        .sort((a, b) => a.venue_seat.seat_number - b.venue_seat.seat_number);
    };

    const getBlockCategoryInfo = (blockRows: string[]) => {
      if (blockRows.length === 0) return { name: '', price: 0 };
      const firstSeat = getRowSeats(blockRows[0])[0];
      if (!firstSeat) return { name: '', price: 0 };
      const catId = firstSeat.venue_seat.category_id;
      return { name: getCategoryName(catId), price: getPrice(catId) };
    };

    const standardInfo = getBlockCategoryInfo(standardRows);
    const premiumInfo = getBlockCategoryInfo(premiumRows);
    const reclinerInfo = getBlockCategoryInfo(reclinerRows);

    return (
      <div className="flex flex-col gap-4 sm:gap-6 items-center w-full max-w-5xl min-w-[550px] mx-auto px-2">
        {/* Curved Cinema Screen Header */}
        <div className="w-full max-w-4xl mx-auto mb-1 sm:mb-2">
          <div className="relative">
            <div className="w-full h-10 sm:h-12 bg-on-background text-primary-fixed font-headline-lg text-center flex items-center justify-center border-2 sm:border-4 border-on-background shadow-md rounded-b-[40%] overflow-hidden bg-gradient-to-r from-on-background via-slate-800 to-on-background">
              <span className="tracking-[0.2em] font-black text-xs sm:text-sm text-primary-fixed animate-pulse flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm sm:text-base">movie</span>
                CINEMA CURVED SCREEN
                <span className="material-symbols-outlined text-sm sm:text-base">movie</span>
              </span>
            </div>
            <div className="text-center text-[9px] sm:text-[10px] uppercase font-mono font-black text-on-surface mt-1.5 tracking-widest flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-xs">arrow_drop_up</span>
              <span>ALL EYES ON SCREEN — AUDIENCE FACING</span>
              <span className="material-symbols-outlined text-xs">arrow_drop_up</span>
            </div>
          </div>
        </div>

        {/* 1. STANDARD CINEMA ZONE */}
        {standardRows.length > 0 && (
          <div className="w-full max-w-4xl bg-slate-200/90 border-2 sm:border-4 border-slate-600 p-3 sm:p-4 shadow-md rounded-xl text-center">
            <div className="font-headline-lg text-slate-950 uppercase tracking-widest mb-2 sm:mb-3 flex items-center justify-between px-2.5 py-1.5 bg-slate-300 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm font-black">chair</span>
                <span className="text-xs sm:text-sm font-black">{standardInfo.name || 'EXECUTIVE FRONT ZONE'}</span>
              </div>
              <span className="font-mono text-[10px] sm:text-xs font-black text-slate-950">₹{standardInfo.price} / SEAT</span>
            </div>
            <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
              {standardRows.map(row => (
                <div key={row} className="flex gap-2 items-center justify-center">
                  <span className="font-data-label text-xs font-black text-slate-800 w-5 text-right shrink-0">{row}</span>
                  <div className="flex gap-1.5">
                    {getRowSeats(row).map(seat => (
                      <div key={seat.id} className="flex items-center">
                        {seat.venue_seat.seat_number === 8 && (
                          <div className="w-6 h-full flex items-center justify-center font-mono text-[8px] text-slate-950 font-black opacity-80 uppercase px-0.5">
                            AISLE
                          </div>
                        )}
                        {renderSeat(seat)}
                      </div>
                    ))}
                  </div>
                  <span className="font-data-label text-xs font-black text-slate-800 w-5 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. PREMIUM CLUB ZONE */}
        {premiumRows.length > 0 && (
          <div className="w-full max-w-4xl bg-blue-100/90 border-2 sm:border-4 border-blue-600 p-3 sm:p-4 shadow-md rounded-xl text-center">
            <div className="font-headline-lg text-blue-950 uppercase tracking-widest mb-2 sm:mb-3 flex items-center justify-between px-2.5 py-1.5 bg-blue-200 border border-blue-600 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm font-black">stars</span>
                <span className="text-xs sm:text-sm font-black">{premiumInfo.name || 'PREMIUM CLUB SEATS'}</span>
              </div>
              <span className="font-mono text-[10px] sm:text-xs font-black text-blue-950">₹{premiumInfo.price} / SEAT</span>
            </div>
            <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
              {premiumRows.map(row => (
                <div key={row} className="flex gap-2 items-center justify-center">
                  <span className="font-data-label text-xs font-black text-blue-900 w-5 text-right shrink-0">{row}</span>
                  <div className="flex gap-1.5">
                    {getRowSeats(row).map(seat => (
                      <div key={seat.id} className="flex items-center">
                        {seat.venue_seat.seat_number === 8 && (
                          <div className="w-6 h-full flex items-center justify-center font-mono text-[8px] text-blue-950 font-black opacity-80 uppercase px-0.5">
                            AISLE
                          </div>
                        )}
                        {renderSeat(seat)}
                      </div>
                    ))}
                  </div>
                  <span className="font-data-label text-xs font-black text-blue-900 w-5 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. VIP RECLINER LUXE ZONE */}
        {reclinerRows.length > 0 && (
          <div className="w-full max-w-4xl bg-amber-100/90 border-2 sm:border-4 border-amber-600 p-3 sm:p-4 shadow-md rounded-xl text-center">
            <div className="font-headline-lg text-amber-950 uppercase tracking-widest mb-2 sm:mb-3 flex items-center justify-between px-2.5 py-1.5 bg-amber-200 border border-amber-600 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm font-black">weekend</span>
                <span className="text-xs sm:text-sm font-black">{reclinerInfo.name || 'ROYAL RECLINER COUCHES'}</span>
              </div>
              <span className="font-mono text-[10px] sm:text-xs font-black text-amber-950">₹{reclinerInfo.price} / SEAT</span>
            </div>
            <div className="flex flex-col gap-2 items-center overflow-x-auto pb-1">
              {reclinerRows.map(row => (
                <div key={row} className="flex gap-2 items-center justify-center">
                  <span className="font-data-label text-xs font-black text-amber-900 w-5 text-right shrink-0">{row}</span>
                  <div className="flex gap-1.5">
                    {getRowSeats(row).map(seat => (
                      <div key={seat.id} className="flex items-center">
                        {seat.venue_seat.seat_number === 8 && (
                          <div className="w-6 h-full flex items-center justify-center font-mono text-[8px] text-amber-950 font-black opacity-80 uppercase px-0.5">
                            AISLE
                          </div>
                        )}
                        {renderSeat(seat)}
                      </div>
                    ))}
                  </div>
                  <span className="font-data-label text-xs text-amber-950 font-black w-5 text-left shrink-0">{row}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex-grow flex flex-col bg-background relative selection:bg-primary-fixed selection:text-on-primary-fixed pb-24 md:pb-0">
      {/* Header */}
      <header className="bg-on-background text-on-primary border-b-2 sm:border-b-4 border-on-background flex justify-between items-center w-full px-4 md:px-margin-desktop py-3 sm:py-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go Back" className="bg-surface text-on-surface hover:bg-primary-fixed hover:text-on-primary-fixed border-2 border-on-background p-1.5 sm:p-2 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl sm:text-2xl">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="font-headline-lg text-lg sm:text-2xl md:text-3xl uppercase text-primary-fixed tracking-tight leading-none font-black">VENUE MAP</h1>
            {showData && (
              <div className="hidden md:flex flex-wrap gap-2.5 mt-2">
                <span className="font-data-label text-xs uppercase bg-primary-fixed text-on-primary-fixed px-2.5 py-0.5 border border-on-background flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  {new Date(showData.date).toLocaleDateString()}
                </span>
                <span className="font-data-label text-xs uppercase bg-secondary-fixed text-on-secondary-fixed px-2.5 py-0.5 border border-on-background flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  {showData.time}
                </span>
                <span className="font-data-label text-xs uppercase bg-tertiary-fixed text-on-tertiary-fixed px-2.5 py-0.5 border border-on-background flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {showData.venue?.name}
                </span>
              </div>
            )}
          </div>
        </div>
        {countdown !== null && (
          <div className="font-data-label text-xs sm:text-sm bg-error text-on-error border-2 border-on-background px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse font-bold">
            EXPIRES IN {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
          </div>
        )}
      </header>

      {/* Mobile Details Bar */}
      {showData && (
        <div className="flex gap-2 flex-wrap items-center bg-surface border-4 border-on-background p-2 sm:p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <span className="font-data-label text-[10px] sm:text-xs uppercase bg-primary-fixed text-on-background border-2 border-on-background px-3 py-1 flex items-center gap-1 font-black shadow-sm">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {new Date(showData.date).toLocaleDateString()}
          </span>
          <span className="font-data-label text-[10px] sm:text-xs uppercase bg-secondary-fixed text-on-secondary-fixed border-2 border-on-background px-3 py-1 flex items-center gap-1 font-black shadow-sm">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {showData.time}
          </span>
          <span className="font-data-label text-[10px] sm:text-xs uppercase bg-tertiary-fixed text-on-tertiary-fixed border-2 border-on-background px-3 py-1 flex items-center gap-1 font-black shadow-sm">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {showData.venue?.name}
          </span>
        </div>
      )}

      <div className="flex-grow flex flex-col md:flex-row relative">
        {/* Main Seat Canvas */}
        <section className="flex-grow bg-surface-container blueprint-bg relative flex flex-col p-3 sm:p-4 md:p-6 border-b-4 md:border-b-0 md:border-r-4 border-on-background min-w-0">

          {/* Mobile Scroll Hint Banner */}
          <div className="md:hidden bg-on-background text-primary-fixed text-[11px] font-mono uppercase font-black py-1 px-3 text-center mb-3 border-2 border-on-background flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm animate-pulse">swipe</span>
            <span>SWIPE / SCROLL HORIZONTALLY TO PAN SEATS</span>
          </div>

          {/* Zone Selector Filter Bar */}
          {pricing.length > 0 && (
            <div className="max-w-5xl mx-auto w-full mb-4 sm:mb-6 bg-surface border-2 sm:border-4 border-on-background p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary-fixed text-base sm:text-lg">filter_alt</span>
                <span className="font-data-label text-xs uppercase font-bold text-on-surface">SELECT ZONE:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 font-data-label text-[11px] sm:text-xs uppercase border border-sm:border-2 border-on-background transition-all ${
                    selectedCategory === 'all'
                      ? 'bg-on-background text-on-primary font-bold'
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
                      className={`px-2.5 py-1 font-data-label text-[11px] sm:text-xs uppercase border border-sm:border-2 border-on-background transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                          : 'bg-surface text-on-surface hover:bg-primary-container'
                      }`}
                    >
                      <span>{categoryName}</span>
                      <span className="bg-on-background text-on-primary px-1 py-0.2 text-[9px] font-mono">
                        ₹{Number(p.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Swipe & Zoom Hint Banner */}
          <div className="md:hidden flex items-center justify-between bg-primary-fixed text-black border-2 border-black p-2.5 mb-2 font-mono text-[11px] font-black uppercase shadow-neo-sm">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">touch_app</span>
              <span>SWIPE OR PINCH TO NAVIGATE SEAT MAP</span>
            </span>
            <span className="material-symbols-outlined text-base">pinch</span>
          </div>

          {/* Seat Map Bounded Scroll Wrapper */}
          <div className="seat-map-container overflow-auto max-w-full touch-pan-x touch-pan-y flex-grow pb-8 w-full flex justify-center border-2 border-dashed border-on-background/20 p-2 bg-surface/50 rounded-lg">
            {showData?.event?.type === 'concert' ? (
              renderConcertStadiumLayout()
            ) : showData?.event?.type === 'comedy' ? (
              renderComedyLayout()
            ) : showData?.event?.type === 'sports' ? (
              renderSportsLayout()
            ) : (
              renderCinemaLayout()
            )}
          </div>

          {/* Seat Status & Category Legend */}
          <div className="mt-4 bg-surface border-2 sm:border-4 border-on-background p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap gap-3 sm:gap-4 items-center z-10 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 border border-amber-900 bg-amber-300 font-black text-amber-950 flex items-center justify-center text-[10px]">R</div>
              <span className="font-data-label text-[11px] sm:text-xs uppercase font-bold text-on-surface">Recliner (₹450)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 border border-cyan-900 bg-cyan-300 font-black text-cyan-950 flex items-center justify-center text-[10px]">P</div>
              <span className="font-data-label text-[11px] sm:text-xs uppercase font-bold text-on-surface">Premium (₹300)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 border border-slate-700 bg-slate-200 font-black text-slate-900 flex items-center justify-center text-[10px]">S</div>
              <span className="font-data-label text-[11px] sm:text-xs uppercase font-bold text-on-surface">Standard (₹200)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 border border-on-background bg-tertiary-fixed font-black text-on-tertiary-fixed flex items-center justify-center text-[10px]">✓</div>
              <span className="font-data-label text-[11px] sm:text-xs uppercase font-bold text-on-surface">Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 border border-on-background bg-secondary-container opacity-60 flex items-center justify-center text-[10px]">✕</div>
              <span className="font-data-label text-[11px] sm:text-xs uppercase font-bold text-on-surface">Booked/Held</span>
            </div>
          </div>
        </section>

        {/* Sidebar Panel */}
        <aside className="w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-surface flex flex-col h-auto md:h-[calc(100vh-80px)] md:sticky md:top-[80px]">
          <div className="p-4 border-b-2 sm:border-b-4 border-on-background bg-on-background text-on-primary">
            {selectedSeats.length > 0 ? (
               <>
                <h2 className="font-headline-lg text-base sm:text-xl uppercase mb-1 font-black">
                  {selectedSeats.length} SEAT(S) SELECTED
                </h2>
                
                {hasAvailableSelected && (
                   <button onClick={handleHold} disabled={holding} className="mt-3 w-full bg-primary-fixed text-on-primary-fixed border-4 border-on-background py-3 font-headline-lg text-sm sm:text-base uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] transition-all disabled:opacity-50 font-black min-h-[48px]">
                     {holding ? 'Holding...' : 'Hold Selected'}
                   </button>
                )}
                
                {onlyOtherHeldSelected && (
                   <button onClick={() => handleWaitlist(selectedSeats[0])} className="mt-3 w-full bg-tertiary-fixed text-on-tertiary-fixed border-4 border-on-background py-3 font-headline-lg text-sm sm:text-base uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] transition-all font-black min-h-[48px]">
                     Join Waitlist
                   </button>
                )}
               </>
            ) : (
               <>
                 <h2 className="font-headline-lg text-base sm:text-lg uppercase mb-1 text-on-surface-variant font-black">Select Seats</h2>
                 <p className="font-data-label text-xs text-on-surface-variant opacity-80">Click seats on the map to view details.</p>
               </>
            )}
            
            {myHolds.length > 0 && (
               <button onClick={handleReleaseAll} className="mt-3 w-full bg-secondary-container text-on-primary border-4 border-on-background py-2.5 font-headline-lg text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-error hover:text-on-error transition-all min-h-[44px] font-black cursor-pointer">
                 Release All Holds
               </button>
            )}
          </div>

          <div className="flex-grow p-4 overflow-y-auto blueprint-bg bg-surface-container border-b-2 sm:border-b-4 border-on-background max-h-[300px] md:max-h-none">
            <h3 className="font-headline-lg text-sm uppercase mb-3 text-on-surface border-b-2 border-on-background pb-1 inline-block font-black">Your Holds</h3>
            <div className="flex flex-col gap-3">
              {myHolds.length === 0 ? (
                 <div className="text-center p-6 bg-surface border-2 border-on-background opacity-60">
                   <span className="font-data-label text-xs uppercase font-bold">No active holds</span>
                 </div>
              ) : (
                myHolds.map(s => (
                  <div key={s.id} className="bg-surface border-2 border-on-background p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-data-label text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 border border-on-background inline-block mb-1 font-bold">
                          {getCategoryName(s.venue_seat.category_id)}
                        </div>
                        <div className="font-headline-lg text-sm text-on-surface font-black">ROW {s.venue_seat.row_label} · NUM {s.venue_seat.seat_number}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="font-headline-lg text-secondary text-sm font-black">₹{getPrice(s.venue_seat.category_id)}</div>
                        <button 
                          onClick={() => handleReleaseSingle(s.id)}
                          className="bg-error text-on-error p-1 border border-on-background hover:bg-red-600 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="Release Hold"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

           {/* Guest Checkout Details Form */}
          {myHolds.length > 0 && (
            <div className="p-4 bg-surface-variant border-b-4 border-on-background">
               <h3 className="font-headline-lg text-xs uppercase mb-3 text-on-surface font-black flex items-center gap-1.5">
                 <span className="material-symbols-outlined text-sm">person</span>
                 Guest Details
               </h3>
               <div className="flex flex-col gap-2.5">
                 <input 
                   type="text" 
                   placeholder="FULL NAME" 
                   value={customerName}
                   onChange={e => setCustomerName(e.target.value)}
                   className="w-full bg-surface border-2 border-on-background p-3 font-data-label text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold min-h-[46px]"
                 />
                 <div className="flex flex-col gap-1">
                   <input 
                     type="tel" 
                     placeholder="10-DIGIT PHONE NUMBER (e.g. 9876543210)" 
                     value={customerPhone}
                     maxLength={10}
                     onChange={e => {
                       const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                       setCustomerPhone(digits);
                     }}
                     className={`w-full bg-surface border-2 border-on-background p-3 font-data-label text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold min-h-[46px] ${
                       customerPhone && customerPhone.length !== 10 ? 'border-red-600 ring-2 ring-red-400/50' : ''
                     }`}
                   />
                   {customerPhone && customerPhone.length !== 10 ? (
                     <span className="text-[10px] font-mono font-bold text-red-600 uppercase flex items-center gap-1">
                       <span>MUST BE EXACTLY 10 DIGITS</span>
                       <span>({customerPhone.length}/10)</span>
                     </span>
                   ) : customerPhone && customerPhone.length === 10 ? (
                     <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase flex items-center gap-1">
                       <span>✓ VALID 10-DIGIT NUMBER</span>
                     </span>
                   ) : null}
                 </div>
               </div>
            </div>
          )}

          {/* Desktop Total & Checkout */}
          <div className="p-5 bg-surface hidden md:block mt-auto border-t-4 border-on-background">
            <div className="flex justify-between items-center mb-4">
              <span className="font-data-label text-sm uppercase font-black">Subtotal ({myHolds.length})</span>
              <span className="font-headline-lg text-2xl text-on-background font-black bg-primary-container px-2 py-1 border-2 border-on-background shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">₹{subtotal.toFixed(0)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={myHolds.length === 0 || checkingOut}
              className="w-full bg-primary-fixed text-on-background border-4 border-on-background py-3 font-headline-lg text-base uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-black min-h-[48px] cursor-pointer"
            >
              <span>{checkingOut ? 'Processing...' : 'Checkout Booking'}</span>
              <span className="material-symbols-outlined font-black text-xl">arrow_forward</span>
            </button>
          </div>
        </aside>

        {/* Mobile Fixed Neo-Brutalist Bottom Action Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-on-background text-on-primary border-t-4 border-on-background p-3 flex items-center justify-between gap-3 shadow-[0px_-4px_10px_rgba(0,0,0,0.5)]">
          <div>
            <div className="font-data-label text-[10px] uppercase text-primary-fixed font-bold">
              {myHolds.length > 0 ? `${myHolds.length} SEATS HELD` : `${selectedSeats.length} SELECTED`}
            </div>
            <div className="font-headline-lg text-lg text-white font-black">
              ₹{subtotal.toFixed(0)}
            </div>
          </div>
          {myHolds.length > 0 ? (
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-4 py-2.5 font-headline-lg text-xs uppercase font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] min-h-[44px] flex items-center gap-1"
            >
              <span>{checkingOut ? 'Processing...' : 'CHECKOUT'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : hasAvailableSelected ? (
            <button
              onClick={handleHold}
              disabled={holding}
              className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background px-4 py-2.5 font-headline-lg text-xs uppercase font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] min-h-[44px]"
            >
              {holding ? 'Holding...' : 'HOLD SEATS'}
            </button>
          ) : (
            <div className="font-data-label text-[10px] uppercase text-on-surface-variant">Tap seats to select</div>
          )}
        </div>
      </div>

      <AddonSelectionModal
        isOpen={isAddonModalOpen}
        onClose={() => setIsAddonModalOpen(false)}
        seatTotal={subtotal}
        seatCount={seats.filter(s => s.status === 'held' && s.held_by === user?.id).length}
        onConfirm={executeFinalBooking}
      />
    </div>
  );
}
