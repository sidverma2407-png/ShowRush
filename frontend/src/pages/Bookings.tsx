import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const { showConfirm, showSuccess, showError } = useModalStore();

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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-primary-container text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8">
        <p className="font-display-xl text-4xl uppercase tracking-tighter">Loading Bookings...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Page Header */}
      <section className="bg-on-background py-12 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="font-display-xl text-display-xl text-on-primary uppercase leading-none break-words">
              MY<br />TICKETS
            </h1>
          </div>
          <div className="bg-primary-fixed text-on-background border-2 border-on-background px-4 py-2 flex items-center gap-2 transform rotate-2">
             <span className="font-headline-lg-mobile text-headline-lg-mobile uppercase">{bookings.length}</span>
             <span className="font-data-label text-data-label uppercase">Valid Tickets</span>
          </div>
        </div>
      </section>

      {/* Ticket List */}
      <section className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-8">
        
        {bookings.length === 0 ? (
          <div className="bg-surface border-4 border-on-background p-16 flex flex-col items-center gap-4 neo-brutalist-shadow blueprint-bg">
            <div className="font-headline-lg-mobile text-headline-lg-mobile uppercase font-black bg-on-background text-on-primary px-4 py-2 transform -rotate-2 border-4 border-on-background">No Tickets Found</div>
            <p className="font-data-label text-data-label uppercase">Go find some events.</p>
          </div>
        ) : bookings.map(booking => (
          <article key={booking.id} className="relative bg-surface border-border-width border-on-background flex flex-col md:flex-row neo-brutalist-shadow ticket-mask blueprint-bg group">
            
            {booking.status === 'cancelled' && (
              <div className="absolute top-4 right-4 z-20 pointer-events-none">
                <div className="bg-error text-on-error font-display-xl text-xl uppercase px-4 py-2 border-4 border-on-error transform -rotate-12 stamp-badge opacity-80">
                  CANCELLED
                </div>
              </div>
            )}

            {/* Ticket Graphic / Left */}
            <div className="w-full md:w-[250px] flex-shrink-0 border-b-border-width md:border-b-0 md:border-r-border-width border-on-background border-dashed p-6 flex flex-col items-center justify-center bg-tertiary-container relative overflow-hidden">
               <div className="absolute top-2 left-2 font-data-label text-data-label text-on-surface-variant uppercase transform -rotate-90 origin-top-left translate-y-full opacity-50 tracking-widest">Admit One</div>
               
               {booking.show.event.poster_url ? (
                 <img src={booking.show.event.poster_url} className={`w-32 h-40 object-cover border-4 border-on-background neo-brutalist-shadow mb-4 ${booking.status === 'cancelled' ? 'b-w-filter' : ''}`} alt="poster"/>
               ) : (
                 <div className="w-32 h-40 border-4 border-on-background neo-brutalist-shadow mb-4 bg-on-tertiary flex items-center justify-center font-data-label text-xs uppercase">NO POSTER</div>
               )}

               <div className="font-data-label text-data-label uppercase text-center mt-2 font-bold bg-on-background text-on-primary px-2 py-1">
                 {new Date(booking.show.date).toLocaleDateString()} @ {booking.show.time}
               </div>
            </div>

            {/* Ticket Info / Middle */}
            <div className="flex-grow p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase text-on-background line-clamp-2">
                    {booking.show.event.title}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="border-t-2 border-on-background pt-2">
                    <p className="font-data-label text-data-label text-on-surface-variant uppercase">Order No.</p>
                    <p className="font-body-md text-on-background font-bold break-all">{booking.booking_reference}</p>
                  </div>
                  <div className="border-t-2 border-on-background pt-2">
                    <p className="font-data-label text-data-label text-on-surface-variant uppercase">Seats</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {booking.seats.map((s: any) => (
                        <span key={s.id} className="font-data-label text-xs bg-primary-fixed border-2 border-on-background px-1 uppercase font-bold">
                          {s.venue_seat.row_label}{s.venue_seat.seat_number}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                 <button 
                   onClick={() => setSelectedBooking(booking)}
                   className="bg-primary-fixed text-on-background border-2 border-on-background px-4 py-2 font-data-label text-data-label uppercase hover:bg-on-background hover:text-primary-fixed transition-colors"
                 >
                   View Details
                 </button>
                 {booking.status === 'confirmed' && (
                   <button 
                     onClick={() => handleCancel(booking.id)}
                     className="bg-surface-variant text-on-surface border-2 border-on-background px-4 py-2 font-data-label text-data-label uppercase hover:bg-error hover:text-on-error transition-colors"
                   >
                     Cancel
                   </button>
                 )}
              </div>
            </div>

            {/* Stub / Right */}
            <div className="w-full md:w-[150px] flex-shrink-0 border-t-border-width md:border-t-0 md:border-l-border-width border-on-background border-dashed bg-surface flex flex-col items-center justify-center p-4">
               {booking.status === 'confirmed' && booking.qr_code_url ? (
                 <img src={booking.qr_code_url} alt="QR Code" className="w-full aspect-square border-4 border-on-background bg-white" />
               ) : (
                 <div className="w-full aspect-square border-4 border-on-background bg-white flex items-center justify-center font-data-label text-center text-xs uppercase">
                   {booking.status === 'cancelled' ? 'INVALID' : 'NO QR'}
                 </div>
               )}
               <p className="font-data-label text-xs uppercase text-on-surface-variant mt-4 text-center tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>
                 SCAN TO ENTER
               </p>
            </div>

          </article>
        ))}

      </section>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-lg flex flex-col relative blueprint-bg">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-xl uppercase tracking-tight">Booking Details</h2>
              <button onClick={() => setSelectedBooking(null)} className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 flex flex-col gap-6">
              <div className="text-center">
                <h3 className="font-display-xl text-3xl uppercase">{selectedBooking.show.event.title}</h3>
                <p className="font-data-label text-data-label uppercase mt-2 bg-primary-container inline-block px-2 py-1 border-2 border-on-background">
                  {new Date(selectedBooking.show.date).toLocaleDateString()} @ {selectedBooking.show.time}
                </p>
              </div>

              <div className="bg-surface-variant border-2 border-on-background p-4 flex flex-col gap-3">
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Ticket ID / Ref</span>
                  <span className="font-body-md font-bold">{selectedBooking.booking_reference}</span>
                </div>
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Status</span>
                  <span className={`font-data-label text-xs uppercase font-bold px-2 py-0.5 border border-on-background ${selectedBooking.status === 'cancelled' ? 'bg-error text-on-error' : 'bg-success text-on-success'}`}>
                    {selectedBooking.status}
                  </span>
                </div>
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Attendee Name</span>
                  <span className="font-body-md font-bold">{selectedBooking.customer_name || 'Seatzy User'}</span>
                </div>
                {selectedBooking.customer_phone && (
                  <div className="flex justify-between border-b-2 border-on-background pb-2">
                    <span className="font-data-label text-xs uppercase text-on-surface-variant">Phone Number</span>
                    <span className="font-body-md font-bold">{selectedBooking.customer_phone}</span>
                  </div>
                )}
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Total Paid</span>
                  <span className="font-body-md font-bold text-success">₹{Number(selectedBooking.total_price).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Venue & City</span>
                  <span className="font-body-md font-bold text-right">
                    {selectedBooking.show.venue?.name}<br/>
                    <span className="text-xs text-on-surface-variant font-normal">{selectedBooking.show.venue?.address}, {selectedBooking.show.venue?.city}</span>
                  </span>
                </div>
                <div className="flex justify-between border-b-2 border-on-background pb-2">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant">Seat Breakdown</span>
                  <div className="flex flex-col items-end gap-1">
                    {selectedBooking.seats.map((s: any) => (
                      <span key={s.id} className="font-data-label text-xs bg-primary-fixed border border-on-background px-1.5 py-0.5 font-bold">
                        {s.venue_seat.row_label}{s.venue_seat.seat_number} {s.venue_seat.category?.name ? `(${s.venue_seat.category.name})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selectedBooking.status === 'confirmed' && selectedBooking.qr_code_url && (
                <div className="flex flex-col items-center justify-center pt-2">
                  <img src={selectedBooking.qr_code_url} alt="QR Code" className="w-48 aspect-square border-4 border-on-background bg-white mb-2 p-1" />
                  <span className="font-data-label text-xs uppercase text-on-surface-variant tracking-widest font-bold">Scan at gate for entry</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
