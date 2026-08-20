import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    fetchApi('/bookings')
      .then(res => setBookings(res.data))
      .catch(err => console.error('Failed to fetch bookings:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await fetchApi(`/bookings/${id}`, { method: 'DELETE' });
        alert('Booking cancelled successfully.');
        fetchBookings();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (loading) return <div className="p-8 font-mono text-2xl uppercase font-black">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <h1 className="text-4xl font-black uppercase bg-seatzy-black text-seatzy-white inline-block px-4 py-2 self-start border-4 border-seatzy-black shadow-neo">
        Recent Bookings
      </h1>

      <div className="flex flex-col gap-6">
        {bookings.length === 0 ? (
          <div className="neo-card p-8 text-center font-mono">No bookings found.</div>
        ) : bookings.map(booking => (
          <div key={booking.id} className="neo-card flex flex-col md:flex-row bg-seatzy-white">
            {/* Poster / Show details */}
            <div className="w-full md:w-1/3 bg-seatzy-gray-grid border-b-4 md:border-b-0 md:border-r-4 border-seatzy-black flex flex-col justify-center items-center p-4 text-center">
              {booking.show.event.poster_url ? (
                <img src={booking.show.event.poster_url} className="w-32 h-40 object-cover border-4 border-seatzy-black shadow-neo mb-4" alt="poster"/>
              ) : (
                <div className="w-32 h-40 border-4 border-seatzy-black shadow-neo mb-4 bg-seatzy-white flex items-center justify-center font-mono text-xs">NO POSTER</div>
              )}
              <h2 className="text-xl font-black uppercase">{booking.show.event.title}</h2>
              <span className="font-mono text-sm bg-seatzy-acid-yellow px-2 border-2 border-seatzy-black mt-2">
                {new Date(booking.show.date).toLocaleDateString()} @ {booking.show.time}
              </span>
            </div>

            {/* Ticket details */}
            <div className="flex-grow p-6 flex flex-col justify-between relative">
              {booking.status === 'cancelled' && (
                <div className="absolute top-4 right-4 bg-seatzy-magenta text-seatzy-white font-black px-4 py-1 border-2 border-seatzy-black -rotate-12 uppercase text-xl">
                  CANCELLED
                </div>
              )}
              
              <div className="flex flex-col gap-4">
                <div>
                  <span className="font-mono text-sm text-gray-600 block">TICKET ID</span>
                  <span className="text-2xl font-black uppercase tracking-widest">{booking.booking_reference}</span>
                </div>
                
                <div>
                  <span className="font-mono text-sm text-gray-600 block">SEATS</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {booking.seats.map((s: any) => (
                      <span key={s.id} className="font-mono bg-seatzy-cyan border-2 border-seatzy-black px-2 py-1 font-bold">
                        {s.venue_seat.row_label}{s.venue_seat.seat_number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {booking.status === 'confirmed' && (
                <button 
                  onClick={() => handleCancel(booking.id)}
                  className="neo-btn bg-seatzy-black text-seatzy-white py-3 mt-6 w-full text-lg"
                >
                  CANCEL BOOKING
                </button>
              )}
            </div>

            {/* QR Code section */}
            <div className="w-full md:w-1/4 border-t-4 md:border-t-0 md:border-l-4 border-seatzy-black bg-seatzy-acid-yellow flex flex-col justify-center items-center p-4">
              {booking.status === 'confirmed' && booking.qr_code_url ? (
                <img src={booking.qr_code_url} alt="QR Code" className="w-32 h-32 border-4 border-seatzy-black shadow-neo bg-white" />
              ) : (
                <div className="w-32 h-32 border-4 border-seatzy-black shadow-neo bg-white flex items-center justify-center font-mono text-center text-xs">
                  {booking.status === 'cancelled' ? 'INVALID' : 'NO QR'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
