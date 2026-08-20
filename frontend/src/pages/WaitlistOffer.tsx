import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function WaitlistOffer() {
  const { token } = useParams();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi(`/waitlist/offer/${token}`)
      .then(res => {
        setOffer(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    try {
      await fetchApi(`/waitlist/offer/${token}/accept`, { method: 'POST' });
      alert('Offer Accepted! Booking created successfully.');
      navigate('/bookings');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 font-mono text-2xl">Loading Offer...</div>;
  if (error) return <div className="p-8 font-mono text-2xl text-seatzy-magenta">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto mt-20 neo-card p-8 text-center flex flex-col gap-6">
      <h1 className="text-4xl font-black uppercase bg-seatzy-magenta text-seatzy-white inline-block px-4 self-center border-4 border-seatzy-black">Waitlist Offer</h1>
      
      <div className="flex flex-col gap-2 font-mono text-lg border-y-4 border-seatzy-black py-6">
        <p>A seat has become available for:</p>
        <p className="font-bold text-2xl uppercase bg-seatzy-acid-yellow inline-block self-center border-2 border-seatzy-black px-2 mt-2">
          {offer.show.event.title}
        </p>
        <p className="mt-4">
          Seat <span className="font-bold bg-seatzy-cyan px-2 border-2 border-seatzy-black">{offer.offered_seat.row_label}{offer.offered_seat.seat_number}</span>
        </p>
        
        <p className="mt-4 text-sm font-bold animate-pulse text-seatzy-magenta">
          Offer Expires: {new Date(offer.offer_expires_at).toLocaleString()}
        </p>
      </div>

      <button onClick={handleAccept} className="neo-btn bg-seatzy-black text-seatzy-white text-2xl py-4 mt-4">
        CLAIM SEAT
      </button>
    </div>
  );
}
