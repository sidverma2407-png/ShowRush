import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { showConfirm, showSuccess, showError } = useModalStore();

  const downloadTicketPDF = async (booking: any) => {
    setDownloadingId(booking.id);
    try {
      const ticketElement = document.getElementById(`ticket-${booking.id}`);
      if (!ticketElement) throw new Error('Ticket element not found in DOM');

      const canvas = await html2canvas(ticketElement, {
        scale: 2, // High resolution for PDF
        useCORS: true,
        backgroundColor: '#f8fafc' // slate-50 as fallback background
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions in mm (standard for jsPDF)
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Seatzy_Ticket_${booking.booking_reference}.pdf`);
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
                 <img src={booking.show.event.poster_url} className={`w-28 sm:w-32 h-36 sm:h-40 object-cover border-2 sm:border-4 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-3 ${booking.status === 'cancelled' ? 'grayscale opacity-60' : ''}`} alt="poster"/>
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
                     className="bg-secondary-fixed text-on-background border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-on-background hover:text-secondary-fixed transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0 gap-1"
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
                   className="bg-primary-fixed text-on-background border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0"
                 >
                   View Details
                 </button>
                 {booking.status === 'confirmed' && (
                   <button 
                     onClick={() => handleCancel(booking.id)}
                     className="bg-surface-variant text-on-surface border-2 border-on-background px-4 py-2 font-headline-lg text-xs sm:text-sm uppercase font-black hover:bg-error hover:text-on-error transition-colors min-h-[44px] flex items-center justify-center flex-grow sm:flex-grow-0"
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
          <div className="bg-surface border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full p-6 relative flex flex-col gap-4">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 bg-error text-on-error border-2 border-on-background w-8 h-8 flex items-center justify-center font-black text-sm hover:scale-105 transition-transform"
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
            </div>

            {selectedBooking.qr_code_url && selectedBooking.status === 'confirmed' && (
              <div className="flex flex-col items-center gap-2 border-t-4 border-on-background pt-4 mt-2">
                <img src={selectedBooking.qr_code_url} alt="QR Code" className="w-36 h-36 border-4 border-on-background bg-white" />
                <span className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">PRESENT THIS QR CODE AT GATE ENTRY</span>
              </div>
            )}

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full bg-on-background text-on-primary border-2 border-on-background py-3 font-headline-lg text-sm uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-primary-fixed hover:text-on-background transition-colors mt-2"
            >
              CLOSE DETAILS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
