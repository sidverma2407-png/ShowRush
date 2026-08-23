import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';
import { useAuthStore } from '../store/auth';
import { getImageUrl } from '../utils/imageUrl';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showConfirm, showSuccess, showError } = useModalStore();
  const { user } = useAuthStore();

  const downloadTicketPDF = async (booking: any) => {
    setDownloadingId(booking.id);
    try {
      const ticketElement = document.getElementById(`printable-ticket-${booking.id}`);
      if (!ticketElement) throw new Error('Printable ticket element not found');

      // Wait for all images (posters, QR codes) to be fully loaded
      const images = Array.from(ticketElement.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );

      // Render canvas with scale 3 for razor-sharp vector-like crispness
      const canvas = await html2canvas(ticketElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Calculate landscape dimensions in pt (mapped from canvas)
      const pdfWidth = canvas.width / 3;
      const pdfHeight = canvas.height / 3;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Seatzy_Ticket_${booking.booking_reference}.pdf`);
      showSuccess('High-resolution PDF Ticket downloaded successfully!', { title: 'TICKET SAVED' });
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      showError(err.message || 'Failed to generate PDF ticket.');
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchBookings = () => {
    fetchApi('/bookings')
      .then(res => {
        const sorted = res.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBookings(sorted);
      })
      .catch(err => console.error('Failed to fetch bookings:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = (id: string) => {
    showConfirm(
      'Are you sure you want to cancel this booking?\n\nYour seats will be released and offered to the waitlist.',
      async () => {
        try {
          await fetchApi(`/bookings/${id}`, { method: 'DELETE' });
          showSuccess('Booking cancelled successfully.', { title: 'BOOKING CANCELLED' });
          fetchBookings();
        } catch (err: any) {
          showError(err.message || 'Failed to cancel booking');
        }
      },
      { title: 'CANCEL BOOKING', confirmText: 'YES, CANCEL TICKET', type: 'warning' }
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-primary-container text-on-background border-2 sm:border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-8 py-6 text-center">
        <p className="font-display-xl text-xl sm:text-3xl md:text-4xl uppercase tracking-tighter">Loading Bookings...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-background min-h-screen pb-12">
      {/* Page Header */}
      <section className="bg-on-background py-8 sm:py-12 px-4 md:px-margin-desktop border-b-2 sm:border-b-4 border-on-background">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6">
          <div>
            <h1 className="font-display-xl text-3xl sm:text-5xl md:text-6xl text-on-primary uppercase leading-none break-words font-black">
              MY TICKETS
            </h1>
          </div>
          <div className="bg-primary-fixed text-on-background border-2 border-on-background px-4 py-2 flex items-center gap-2 transform md:rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
             <span className="font-headline-lg text-lg sm:text-2xl uppercase font-black">{bookings.length}</span>
             <span className="font-data-label text-xs sm:text-sm uppercase font-bold">Valid Tickets</span>
          </div>
        </div>
      </section>

      {/* Ticket List */}
      <section className="max-w-4xl mx-auto px-4 md:px-margin-desktop py-6 sm:py-12 flex flex-col gap-6 sm:gap-8">
        
        {bookings.length === 0 ? (
          <div className="bg-surface border-2 sm:border-4 border-on-background p-8 sm:p-16 flex flex-col items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] blueprint-bg text-center">
            <div className="font-headline-lg text-lg sm:text-2xl uppercase font-black bg-on-background text-on-primary px-4 py-2 transform -rotate-1 border-2 border-on-background">No Tickets Found</div>
            <p className="font-data-label text-xs sm:text-sm uppercase font-bold">Go find some events and book your seats.</p>
          </div>
        ) : bookings.map(booking => (
          <article id={`ticket-${booking.id}`} key={booking.id} className="relative bg-surface border-2 sm:border-border-width border-on-background flex flex-col md:flex-row shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] blueprint-bg group overflow-hidden">
            
            {booking.status === 'cancelled' && (
              <div className="absolute top-3 right-3 z-20 pointer-events-none">
                <div className="bg-error text-on-error font-display-xl text-sm sm:text-xl uppercase px-3 py-1 sm:px-4 sm:py-2 border-2 sm:border-4 border-on-error transform -rotate-12 font-black opacity-90">
                  CANCELLED
                </div>
              </div>
            )}

            {/* Ticket Graphic / Top or Left */}
            <div className="w-full md:w-[240px] flex-shrink-0 border-b-2 md:border-b-0 md:border-r-2 border-on-background border-dashed p-4 sm:p-6 flex flex-col items-center justify-center bg-tertiary-container relative">
               {booking.show.event.poster_url ? (
                 <img src={getImageUrl(booking.show.event.poster_url)} className={`w-28 sm:w-32 h-36 sm:h-40 object-cover border-2 sm:border-4 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 ${booking.status === 'cancelled' ? 'grayscale opacity-60' : ''}`} alt="poster"/>
               ) : (
                 <div className="w-28 sm:w-32 h-36 sm:h-40 border-2 sm:border-4 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 bg-on-tertiary flex items-center justify-center font-data-label text-xs uppercase font-bold">NO POSTER</div>
               )}

               <div className="font-data-label text-[10px] sm:text-xs uppercase text-center font-bold bg-on-background text-on-primary px-2 py-1">
                 {new Date(booking.show.date).toLocaleDateString()} @ {booking.show.time}
               </div>
            </div>

            {/* Ticket Info / Middle */}
            <div className="flex-grow p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h2 className="font-headline-lg text-lg sm:text-2xl uppercase text-on-background font-black line-clamp-2">
                    {booking.show.event.title}
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-4">
                  <div className="border-t-2 border-on-background pt-2">
                    <p className="font-data-label text-[10px] sm:text-xs text-on-surface-variant uppercase font-bold">Booking Ref.</p>
                    <p className="font-mono text-xs sm:text-sm text-on-background font-black break-all">{booking.booking_reference}</p>
                  </div>
                  <div className="border-t-2 border-on-background pt-2">
                    <p className="font-data-label text-[10px] sm:text-xs text-on-surface-variant uppercase font-bold">Seats</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {booking.seats.map((s: any) => (
                        <span key={s.id} className="font-data-label text-[11px] sm:text-xs bg-primary-fixed border border-on-background px-1.5 py-0.5 uppercase font-bold">
                          {s.venue_seat.row_label}{s.venue_seat.seat_number}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5 justify-end">
                 {booking.status === 'confirmed' && (
                   <button 
                     onClick={() => downloadTicketPDF(booking)}
                     disabled={downloadingId === booking.id}
                     className="bg-secondary-fixed text-on-background border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-on-background hover:text-secondary-fixed transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0 gap-1 cursor-pointer"
                   >
                     {downloadingId === booking.id ? (
                       <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                     ) : (
                       <span className="material-symbols-outlined text-[18px]">download</span>
                     )}
                     DOWNLOAD PDF
                   </button>
                 )}
                 <button 
                   onClick={() => setSelectedBooking(booking)}
                   className="bg-primary-fixed text-on-background border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0 cursor-pointer"
                 >
                   View Details
                 </button>
                 {booking.status === 'confirmed' && (
                   <button 
                     onClick={() => handleCancel(booking.id)}
                     className="bg-surface-variant text-on-surface border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-error hover:text-on-error transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0 cursor-pointer"
                   >
                     Cancel
                   </button>
                 )}
              </div>
            </div>

            {/* QR Code / Stub */}
            <div className="w-full md:w-[160px] flex-shrink-0 border-t-2 md:border-t-0 md:border-l-2 border-on-background border-dashed bg-surface flex flex-col items-center justify-center p-4">
               {booking.status === 'confirmed' && booking.qr_code_url ? (
                 <div className="flex flex-col items-center gap-1.5">
                   <img src={booking.qr_code_url} alt="QR Code" className="w-28 h-28 sm:w-32 sm:h-32 border-2 sm:border-4 border-on-background bg-white" />
                   <span className="font-mono text-[9px] uppercase font-bold text-on-surface-variant">ENTRY QR CODE</span>
                 </div>
               ) : (
                 <div className="w-24 h-24 border-2 border-on-background bg-white flex items-center justify-center font-data-label text-center text-[10px] uppercase font-bold p-2">
                   {booking.status === 'cancelled' ? 'VOID' : 'NO QR'}
                 </div>
               )}
            </div>
          </article>
        ))}
      </section>

      {/* Ticket Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-5 sm:p-6 relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 bg-error text-on-error border-2 border-on-background w-8 h-8 flex items-center justify-center font-black text-sm hover:scale-105 transition-transform cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b-4 border-on-background pb-3">
              <span className="bg-primary-fixed text-on-background font-mono text-[10px] font-black px-2 py-0.5 border border-on-background uppercase">
                TICKET BREAKDOWN
              </span>
              <h2 className="font-headline-lg text-2xl uppercase font-black mt-2 leading-tight">
                {selectedBooking.show.event.title}
              </h2>
              <p className="font-data-label text-xs uppercase text-on-surface-variant mt-1 font-bold">
                {new Date(selectedBooking.show.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} @ {selectedBooking.show.time}
              </p>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="flex justify-between border-b-2 border-on-background/20 pb-2">
                <span className="text-on-surface-variant font-bold">BOOKING REF:</span>
                <span className="font-black text-on-background break-all">{selectedBooking.booking_reference}</span>
              </div>

              <div className="flex justify-between border-b-2 border-on-background/20 pb-2">
                <span className="text-on-surface-variant font-bold">VENUE:</span>
                <span className="font-black text-on-background">{selectedBooking.show.venue?.name || 'Partner Venue'} ({selectedBooking.show.venue?.city || 'Delhi'})</span>
              </div>

              <div className="flex justify-between border-b-2 border-on-background/20 pb-2">
                <span className="text-on-surface-variant font-bold">STATUS:</span>
                <span className={`font-black uppercase px-2 py-0.5 border border-on-background ${selectedBooking.status === 'confirmed' ? 'bg-emerald-300 text-emerald-950' : 'bg-red-300 text-red-950'}`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div>
                <span className="text-on-surface-variant font-bold block mb-1">RESERVED SEATS ({selectedBooking.seats?.length || 0}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBooking.seats?.map((s: any) => (
                    <span key={s.id} className="bg-primary-fixed border border-on-background px-2 py-1 font-black text-xs">
                      Row {s.venue_seat.row_label} - Seat {s.venue_seat.seat_number}
                    </span>
                  ))}
                </div>
              </div>

              {selectedBooking.booking_addons?.length > 0 && (
                <div className="border-t-2 border-on-background/20 pt-2">
                  <span className="text-on-surface-variant font-bold block mb-1.5 uppercase">FOOD & DRINKS ADD-ONS:</span>
                  <div className="space-y-1.5">
                    {selectedBooking.booking_addons.map((ba: any) => (
                      <div key={ba.id} className="flex justify-between items-center bg-primary-fixed/30 border-2 border-black px-3 py-1.5 text-xs">
                        <span className="font-black">{ba.addon_item?.name || 'Food Item'} (x{ba.quantity})</span>
                        <span className="font-mono font-black text-emerald-800">₹{Number(ba.unit_price_at_booking) * ba.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedBooking.qr_code_url && selectedBooking.status === 'confirmed' && (
              <div className="flex flex-col items-center gap-2 border-t-4 border-on-background pt-4 mt-2">
                <img src={selectedBooking.qr_code_url} alt="QR Code" className="w-36 h-36 border-4 border-on-background bg-white" />
                <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">PRESENT THIS QR CODE AT GATE ENTRY</span>
              </div>
            )}

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full bg-on-background text-on-primary border-2 border-on-background py-3 font-headline-lg text-sm uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-primary-fixed hover:text-on-background transition-colors mt-2 cursor-pointer"
            >
              CLOSE DETAILS
            </button>
          </div>
        </div>
      )}

      {/* Hidden Printable Ticket Container for High-Definition PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {bookings.filter(b => b.status === 'confirmed').map(booking => {
          const showDateObj = new Date(booking.show.date);
          const dateFormatted = showDateObj.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).toUpperCase();
          const eventTypeUpper = (booking.show.event?.type || 'LIVE EVENT').toUpperCase();
          const venueName = booking.show?.venue?.name || booking.show?.venue_name || 'The Habitat Comedy Lounge';
          const venueCity = booking.show?.venue?.city || booking.show?.event?.city || 'Mumbai';
          const attendeeName = user?.name || 'SHREYA';
          const seatCategoryName = booking.seats?.[0]?.venue_seat?.category?.name || 'Reserved';
          const totalAmount = booking.total_price || booking.seats?.reduce((acc: number, s: any) => acc + (Number(s.price) || 0), 0) || 0;

          return (
            <div
              key={`printable-${booking.id}`}
              id={`printable-ticket-${booking.id}`}
              style={{
                width: '1040px',
                backgroundColor: '#ffffff',
                fontFamily: "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: '#09090b',
                padding: '20px',
                boxSizing: 'border-box'
              }}
            >
              {/* Ticket Outer Shell */}
              <div style={{
                border: '4px solid #09090b',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '6px 6px 0px #09090b',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                
                {/* Header Bar */}
                <div style={{
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  padding: '12px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '4px solid #09090b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      color: '#e1ed00',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 900,
                      fontSize: '24px',
                      fontStyle: 'italic',
                      letterSpacing: '-0.03em'
                    }}>
                      SEATZY
                    </span>
                    <span style={{
                      backgroundColor: '#e1ed00',
                      color: '#09090b',
                      fontFamily: 'monospace',
                      fontWeight: 900,
                      fontSize: '11px',
                      padding: '3px 10px',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      border: '1.5px solid #09090b'
                    }}>
                      OFFICIAL ADMISSION PASS
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#18181b',
                      padding: '4px 12px',
                      border: '1px solid #27272a'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e'
                      }} />
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#f4f4f5',
                        letterSpacing: '1px'
                      }}>
                        CONFIRMED BOOKING
                      </span>
                    </div>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: 900,
                      color: '#e1ed00',
                      letterSpacing: '0.5px'
                    }}>
                      REF: {booking.booking_reference}
                    </span>
                  </div>
                </div>

                {/* Ticket Core: 3 Columns with Clean Perforation Dividers */}
                <div style={{ display: 'flex', minHeight: '340px' }}>
                  
                  {/* Column 1: Left Poster & Showtime Block */}
                  <div style={{
                    width: '250px',
                    flexShrink: 0,
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box'
                  }}>
                    {/* Event Type Badge */}
                    <div style={{
                      width: '100%',
                      backgroundColor: '#09090b',
                      color: '#e1ed00',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '4px 8px',
                      textAlign: 'center',
                      letterSpacing: '1.5px',
                      marginBottom: '10px',
                      textTransform: 'uppercase'
                    }}>
                      {eventTypeUpper} PASS
                    </div>

                    {/* Poster Artwork */}
                    {booking.show.event.poster_url ? (
                      <img
                        src={getImageUrl(booking.show.event.poster_url)}
                        alt="Event Poster"
                        crossOrigin="anonymous"
                        style={{
                          width: '150px',
                          height: '190px',
                          objectFit: 'cover',
                          border: '3px solid #09090b',
                          boxShadow: '3px 3px 0px #09090b',
                          borderRadius: '4px',
                          marginBottom: '10px',
                          display: 'block'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '150px',
                        height: '190px',
                        backgroundColor: '#e2e8f0',
                        border: '3px solid #09090b',
                        boxShadow: '3px 3px 0px #09090b',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '13px',
                        color: '#64748b',
                        marginBottom: '10px',
                        textAlign: 'center',
                        padding: '12px'
                      }}>
                        SEATZY LIVE
                      </div>
                    )}

                    {/* Date & Time Compact Block */}
                    <div style={{
                      width: '100%',
                      border: '2px solid #09090b',
                      backgroundColor: '#ffffff',
                      boxShadow: '2px 2px 0px #09090b',
                      textAlign: 'center',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '4px 6px',
                        borderBottom: '1.5px solid #09090b'
                      }}>
                        DATE: {dateFormatted}
                      </div>
                      <div style={{
                        backgroundColor: '#e1ed00',
                        color: '#09090b',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        fontWeight: 900,
                        padding: '4px 6px'
                      }}>
                        TIME: {booking.show.time} IST
                      </div>
                    </div>
                  </div>

                  {/* Perforation Divider Line 1 */}
                  <div style={{
                    width: '2px',
                    borderLeft: '2px dashed #94a3b8',
                    backgroundColor: 'transparent'
                  }} />

                  {/* Column 2: Center Main Details */}
                  <div style={{
                    flex: 1,
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}>
                    <div>
                      {/* Event Title */}
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        lineHeight: '1.2',
                        letterSpacing: '-0.02em',
                        color: '#09090b',
                        marginBottom: '8px'
                      }}>
                        {booking.show.event.title}
                      </div>

                      {/* Venue Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#f1f5f9',
                        border: '1.5px solid #09090b',
                        padding: '4px 10px',
                        marginBottom: '14px',
                        width: 'fit-content'
                      }}>
                        <span style={{
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: '9px',
                          fontWeight: 900,
                          padding: '1px 5px',
                          textTransform: 'uppercase'
                        }}>
                          VENUE
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#09090b' }}>
                          {venueName}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                          · {venueCity}
                        </span>
                      </div>

                      {/* 4-Box Key Metadata Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        marginBottom: '14px'
                      }}>
                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #09090b',
                          padding: '6px 10px'
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '2px'
                          }}>
                            BOOKING REFERENCE
                          </span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            fontWeight: 900,
                            color: '#09090b'
                          }}>
                            {booking.booking_reference}
                          </span>
                        </div>

                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #09090b',
                          padding: '6px 10px'
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '2px'
                          }}>
                            TICKET HOLDER / GUEST
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#09090b',
                            textTransform: 'uppercase'
                          }}>
                            {attendeeName}
                          </span>
                        </div>

                        <div style={{
                          backgroundColor: '#f8fafc',
                          border: '1.5px solid #09090b',
                          padding: '6px 10px'
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#64748b',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '2px'
                          }}>
                            SEAT TIER / CATEGORY
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: '#09090b',
                            textTransform: 'uppercase'
                          }}>
                            {seatCategoryName}
                          </span>
                        </div>

                        <div style={{
                          backgroundColor: '#dcfce7',
                          border: '1.5px solid #09090b',
                          padding: '6px 10px'
                        }}>
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#166534',
                            textTransform: 'uppercase',
                            display: 'block',
                            marginBottom: '2px'
                          }}>
                            TOTAL AMOUNT PAID
                          </span>
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 900,
                            color: '#14532d'
                          }}>
                            ₹{Number(totalAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Allocated Seats Box */}
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #09090b',
                        padding: '8px 10px',
                        boxShadow: '2px 2px 0px #09090b',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px'
                        }}>
                          <span style={{
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            color: '#09090b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            ALLOCATED SEATS ({booking.seats?.length || 0} PASSES):
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            color: '#64748b',
                            textTransform: 'uppercase'
                          }}>
                            ZERO DOUBLE-BOOKING SECURED
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {booking.seats?.map((s: any) => (
                            <div
                              key={s.id}
                              style={{
                                backgroundColor: '#e1ed00',
                                border: '1.5px solid #09090b',
                                boxShadow: '2px 2px 0px #09090b',
                                padding: '3px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span style={{
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                fontWeight: 900,
                                color: '#09090b',
                                letterSpacing: '0.5px'
                              }}>
                                ROW {s.venue_seat?.row_label} · SEAT {s.venue_seat?.seat_number}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add-ons (if any) */}
                      {booking.booking_addons?.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '8px'
                        }}>
                          {booking.booking_addons.map((ba: any) => (
                            <span
                              key={ba.id}
                              style={{
                                backgroundColor: '#fef9c3',
                                border: '1px solid #09090b',
                                padding: '2px 6px',
                                fontSize: '10px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                color: '#713f12'
                              }}
                            >
                              [SNACK] {ba.addon_item?.name || 'Food'} (x{ba.quantity})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Security Footer */}
                    <div style={{
                      borderTop: '1.5px solid #e2e8f0',
                      paddingTop: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          backgroundColor: '#09090b',
                          color: '#ffffff',
                          fontFamily: 'monospace',
                          fontSize: '9px',
                          fontWeight: 900,
                          padding: '1px 5px',
                          textTransform: 'uppercase'
                        }}>
                          SECURITY
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#64748b',
                          textTransform: 'uppercase'
                        }}>
                          Valid Govt ID required at gate · Non-transferable
                        </span>
                      </div>

                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#94a3b8'
                      }}>
                        POWERED BY SEATZY ENGINE
                      </span>
                    </div>
                  </div>

                  {/* Perforation Divider Line 2 */}
                  <div style={{
                    width: '2px',
                    borderLeft: '2px dashed #94a3b8',
                    backgroundColor: 'transparent'
                  }} />

                  {/* Column 3: Right QR Gate Pass Stub */}
                  <div style={{
                    width: '230px',
                    flexShrink: 0,
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                  }}>
                    {/* Gate Pass Banner */}
                    <div style={{
                      width: '100%',
                      backgroundColor: '#09090b',
                      color: '#e1ed00',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 900,
                      padding: '4px 8px',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase'
                    }}>
                      GATE ENTRY STUB
                    </div>

                    {/* QR Code Container */}
                    <div style={{
                      backgroundColor: '#ffffff',
                      border: '3px solid #09090b',
                      boxShadow: '3px 3px 0px #09090b',
                      borderRadius: '6px',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      margin: '8px 0'
                    }}>
                      {booking.qr_code_url ? (
                        <img
                          src={booking.qr_code_url}
                          alt="Entry QR Code"
                          crossOrigin="anonymous"
                          style={{
                            width: '135px',
                            height: '135px',
                            display: 'block'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '135px',
                          height: '135px',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 900
                        }}>
                          VALID QR PASS
                        </div>
                      )}
                    </div>

                    {/* Stub Scan Instructions */}
                    <div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 900,
                        color: '#09090b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        SCAN AT TURNSTILE
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#64748b',
                        marginTop: '1px'
                      }}>
                        FAST-TRACK ENTRY
                      </div>
                    </div>

                    {/* Full Ref Code Bar */}
                    <div style={{
                      width: '100%',
                      backgroundColor: '#e2e8f0',
                      border: '1px solid #09090b',
                      padding: '3px 4px',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      fontWeight: 900,
                      color: '#09090b',
                      letterSpacing: '0.5px'
                    }}>
                      {booking.booking_reference}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
