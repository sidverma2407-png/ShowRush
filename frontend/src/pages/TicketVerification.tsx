import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../api/client';
import { getImageUrl } from '../utils/imageUrl';

export default function TicketVerification() {
  const { ref } = useParams<{ ref: string }>();
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string>('');

  useEffect(() => {
    setVerifiedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (!ref) {
      setError('No ticket reference code provided.');
      setLoading(false);
      return;
    }

    fetchApi(`/tickets/verify/${ref}`)
      .then((res) => {
        setTicket(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Ticket not found or invalid barcode.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ref]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <span className="material-symbols-outlined text-5xl animate-spin text-primary mb-3 block">sync</span>
          <h2 className="font-headline-lg text-2xl font-black uppercase text-on-background tracking-tight">
            Verifying Ticket Pass...
          </h2>
          <p className="font-mono text-xs text-on-surface-variant mt-2 font-bold uppercase">
            Querying Seatzy Secure Admission Registry
          </p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-surface border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-700 border-3 border-on-background flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl font-black">gpp_bad</span>
          </div>
          <h2 className="font-headline-lg text-2xl sm:text-3xl font-black uppercase text-red-700 tracking-tight mb-2">
            INVALID TICKET PASS
          </h2>
          <p className="font-mono text-sm text-on-surface-variant font-bold mb-6">
            {error || 'This QR Code does not match any confirmed booking in our database.'}
          </p>
          <div className="bg-red-50 border-2 border-red-700 p-3 font-mono text-xs text-red-950 mb-6 font-bold">
            Scanned Reference: <strong>{ref || 'NONE'}</strong>
          </div>
          <Link
            to="/events"
            className="inline-block bg-on-background text-primary-fixed border-2 border-on-background px-6 py-3 font-headline-lg text-xs uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-primary-fixed hover:text-on-background transition-all"
          >
            Explore Live Events
          </Link>
        </div>
      </div>
    );
  }

  const isConfirmed = ticket.status === 'confirmed';
  const showDateStr = ticket.show?.date
    ? new Date(ticket.show.date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  return (
    <div className="min-h-screen bg-background py-8 sm:py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-surface border-4 border-on-background shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-on-background text-on-primary p-4 sm:p-5 flex flex-wrap justify-between items-center gap-3 border-b-4 border-on-background">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed text-2xl font-black">verified</span>
            <div>
              <span className="font-headline-lg text-lg sm:text-xl uppercase font-black tracking-tight block text-primary-fixed">
                SEATZY ADMISSION PASS
              </span>
              <span className="font-mono text-[10px] text-surface-variant uppercase font-bold tracking-wider">
                Official Digital Verification Registry
              </span>
            </div>
          </div>
          <div className="font-mono text-xs bg-surface/20 border border-surface/40 px-2.5 py-1 text-on-primary font-bold">
            SCAN TIME: {verifiedAt}
          </div>
        </div>

        {/* Live Admission Status Banner */}
        <div className={`p-4 border-b-4 border-on-background flex items-center justify-between gap-3 ${
          isConfirmed ? 'bg-emerald-400 text-emerald-950' : 'bg-red-200 text-red-950'
        }`}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl font-black">
              {isConfirmed ? 'check_circle' : 'cancel'}
            </span>
            <div>
              <h3 className="font-headline-lg text-base sm:text-lg uppercase font-black leading-tight">
                {isConfirmed ? 'TICKET VERIFIED • VALID FOR ENTRY' : 'TICKET CANCELLED / INVALID'}
              </h3>
              <p className="font-mono text-xs font-bold opacity-90">
                {isConfirmed
                  ? 'Holder is cleared for venue access. Check Government ID at turnstile.'
                  : 'This booking has been cancelled and cannot be used for entry.'}
              </p>
            </div>
          </div>
          <span className="font-mono text-xs font-black uppercase px-2.5 py-1 border border-black bg-white shrink-0 hidden sm:block">
            {ticket.status}
          </span>
        </div>

        {/* Ticket Details Core */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Event & Show info */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-24 sm:w-28 h-32 sm:h-36 bg-black border-2 border-on-background shrink-0 overflow-hidden relative shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              {ticket.event?.poster_url ? (
                <img
                  src={getImageUrl(ticket.event.poster_url)}
                  alt={ticket.event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-slate-400 uppercase">
                  No Poster
                </div>
              )}
            </div>

            <div className="flex-grow flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px] font-black uppercase">
                <span className="bg-primary-fixed text-black border border-black px-2 py-0.5">
                  {ticket.event?.type}
                </span>
                {ticket.event?.certification && (
                  <span className="bg-red-100 text-red-950 border border-red-800 px-2 py-0.5">
                    Rated {ticket.event.certification}
                  </span>
                )}
                {ticket.show?.format && (
                  <span className="bg-sky-100 text-sky-950 border border-sky-800 px-2 py-0.5">
                    {ticket.show.format}
                  </span>
                )}
                {ticket.show?.language && (
                  <span className="bg-slate-100 text-slate-900 border border-slate-700 px-2 py-0.5">
                    {ticket.show.language}
                  </span>
                )}
              </div>

              <h1 className="font-headline-lg text-2xl sm:text-3xl uppercase font-black text-on-background leading-tight">
                {ticket.event?.title}
              </h1>

              <div className="bg-slate-100 border-2 border-on-background p-2.5 font-mono text-xs text-on-background flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm font-black text-primary">schedule</span>
                  <span>{showDateStr} @ {ticket.show?.time}</span>
                </div>
                <div className="text-on-surface-variant flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-sm font-black">location_on</span>
                  <span>{ticket.venue?.name}, {ticket.venue?.city} ({ticket.venue?.address})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Ticket Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-surface-lowest border-2 border-on-background p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">
                Ticket Reference Code
              </span>
              <span className="font-mono text-base font-black text-black tracking-wider">
                {ticket.booking_reference}
              </span>
            </div>

            <div className="bg-surface-lowest border-2 border-on-background p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant block mb-0.5">
                Ticket Holder Name
              </span>
              <span className="font-headline-lg text-sm font-black uppercase text-black">
                {ticket.customer_name} ({ticket.customer_phone})
              </span>
            </div>
          </div>

          {/* Reserved Seats Breakdown */}
          <div className="bg-surface-lowest border-3 border-on-background p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <span className="font-mono text-xs uppercase font-black text-on-background block mb-2">
              Reserved Seats ({ticket.seats?.length || 0} Admission Passes)
            </span>
            <div className="flex flex-wrap gap-2">
              {ticket.seats?.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-primary-fixed text-black border-2 border-black px-3 py-1.5 font-mono text-xs font-black uppercase shadow-neo-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">event_seat</span>
                  <span>Seat {s.label}</span>
                  <span className="text-[10px] bg-black text-primary-fixed px-1 py-0.2 rounded font-bold">
                    {s.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons (if any) */}
          {ticket.addons && ticket.addons.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-800 p-3 font-mono text-xs">
              <span className="font-black uppercase text-amber-950 block mb-1">Pre-ordered Food & Beverages:</span>
              <div className="flex flex-wrap gap-2">
                {ticket.addons.map((a: any, idx: number) => (
                  <span key={idx} className="bg-white border border-amber-800 px-2 py-0.5 font-bold text-amber-950">
                    {a.name} (x{a.quantity})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Amount Paid & Security Verification */}
          <div className="border-t-2 border-on-background/20 pt-4 flex flex-wrap justify-between items-center gap-3 font-mono text-xs">
            <div>
              <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Total Amount Paid</span>
              <span className="font-black text-xl text-emerald-800">
                ₹{Number(ticket.total_price || 0).toLocaleString('en-IN')} (CONFIRMED)
              </span>
            </div>

            <div className="text-right">
              <span className="text-on-surface-variant block text-[10px] font-bold uppercase">Security Hash Status</span>
              <span className="font-bold text-slate-800">SEATZY-256-AUTHENTICATED</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="bg-on-background p-4 border-t-4 border-on-background flex justify-between items-center text-on-primary">
          <Link
            to="/events"
            className="font-headline-lg text-xs uppercase text-primary-fixed font-black hover:underline"
          >
            Browse More Shows
          </Link>
          <span className="font-mono text-[10px] text-surface-variant uppercase font-bold">
            Seatzy Ticketing Systems
          </span>
        </div>
      </div>
    </div>
  );
}
