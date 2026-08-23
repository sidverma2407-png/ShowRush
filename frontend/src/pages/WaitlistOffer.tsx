import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function WaitlistOffer() {
  const { token } = useParams();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi(`/waitlist/offer/${token}`)
      .then(res => {
        setOffer(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Waitlist offer not found or expired');
        setLoading(false);
      });
  }, [token]);

  // Live Countdown
  useEffect(() => {
    if (!offer?.offer_expires_at) return;
    const interval = setInterval(() => {
      const diff = new Date(offer.offer_expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [offer]);

  const handleAccept = async () => {
    setClaiming(true);
    try {
      await fetchApi(`/waitlist/offer/${token}/accept`, { method: 'POST' });
      alert('🎉 Offer Accepted! Your seat is booked and your ticket has been emailed to you.');
      navigate('/bookings');
    } catch (err: any) {
      alert(err.message || 'Failed to claim seat');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-surface border-4 border-on-background p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center">
          <p className="font-display-xl text-2xl uppercase font-black">Loading Waitlist Offer...</p>
        </div>
      </main>
    );
  }

  if (error || !offer) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-surface border-4 border-on-background p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center max-w-md w-full flex flex-col gap-4">
          <span className="material-symbols-outlined text-5xl text-error">error</span>
          <h1 className="font-headline-lg text-2xl uppercase font-black">Offer Unavailable</h1>
          <p className="font-body-md text-sm text-on-surface-variant font-bold">{error || 'This waitlist offer may have expired or been claimed.'}</p>
          <button
            onClick={() => navigate('/events')}
            className="bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg text-xs uppercase font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-colors mt-2"
          >
            Explore Other Events
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full max-w-2xl mx-auto my-8 sm:my-16 px-4">
      <div className="bg-surface border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary-fixed p-6 border-b-4 border-on-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="bg-on-background text-primary-fixed font-mono text-xs font-black px-2 py-0.5 uppercase tracking-wider">
              EXCLUSIVE PRIORITY PASS
            </span>
            <h1 className="font-display-xl text-3xl sm:text-4xl text-on-background uppercase font-black leading-none mt-2">
              SEAT AVAILABLE!
            </h1>
          </div>
          {timeLeft && (
            <div className="bg-on-background text-primary-fixed border-2 border-on-background px-3 py-1.5 font-mono text-sm font-black flex items-center gap-1.5 shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="material-symbols-outlined text-base animate-spin">timer</span>
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        {/* Offer Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6 blueprint-bg">
          <div className="bg-surface border-2 sm:border-4 border-on-background p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
            <div>
              <span className="font-data-label text-xs uppercase text-on-surface-variant font-bold">Event</span>
              <h2 className="font-headline-lg text-xl sm:text-2xl uppercase font-black text-on-background">
                {offer.show?.event?.title || 'Live Show'}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t-2 border-on-background/20 pt-4">
              <div>
                <span className="font-data-label text-[10px] uppercase text-on-surface-variant font-bold block">Assigned Seat</span>
                <span className="font-mono text-lg font-black bg-primary-fixed px-2 py-0.5 border border-on-background inline-block mt-0.5">
                  {offer.offered_seat?.row_label}{offer.offered_seat?.seat_number}
                </span>
              </div>
              <div>
                <span className="font-data-label text-[10px] uppercase text-on-surface-variant font-bold block">Date & Time</span>
                <span className="font-data-label text-xs uppercase font-bold text-on-background block mt-1">
                  {offer.show?.date} at {offer.show?.time}
                </span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="font-data-label text-[10px] uppercase text-on-surface-variant font-bold block">Venue</span>
                <span className="font-data-label text-xs uppercase font-bold text-on-background block mt-1">
                  {offer.show?.venue?.name || 'Main Auditorium'}
                </span>
              </div>
            </div>
          </div>

          {/* Call to action */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAccept}
              disabled={claiming || timeLeft === 'EXPIRED'}
              className="w-full bg-primary-fixed text-on-background border-4 border-on-background py-4 font-headline-lg text-lg uppercase font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[0px] active:translate-y-[0px] transition-all disabled:opacity-50 cursor-pointer min-h-[56px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-2xl font-black">confirmation_number</span>
              <span>{claiming ? 'Confirming Ticket...' : 'CLAIM THIS SEAT NOW'}</span>
            </button>
            <p className="font-data-label text-[11px] uppercase text-center text-on-surface-variant font-bold">
              ⚡ This reservation is held exclusively for you. If not claimed within the timer, it automatically passes to the next person on the waitlist.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}
