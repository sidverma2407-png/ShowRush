import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi('/events').then(res => {
      setEvents(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 font-mono text-2xl uppercase font-black">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div className="bg-seatzy-black text-seatzy-white p-6 border-4 border-seatzy-black shadow-neo">
        <h1 className="text-5xl font-black uppercase tracking-tighter">Live Events</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map(event => (
          <div key={event.id} className="neo-card flex flex-col">
            {event.poster_url ? (
              <img src={event.poster_url} alt={event.title} className="h-64 object-cover border-b-4 border-seatzy-black" />
            ) : (
              <div className="h-64 bg-seatzy-gray-grid border-b-4 border-seatzy-black flex items-center justify-center font-mono">No Poster</div>
            )}
            <div className="p-6 flex-grow flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <h2 className="text-2xl font-black uppercase">{event.title}</h2>
                <span className="bg-seatzy-cyan px-2 py-1 border-2 border-seatzy-black text-xs font-bold uppercase">{event.type}</span>
              </div>
              <p className="font-mono text-sm line-clamp-3">{event.description}</p>
              
              <div className="mt-auto flex flex-col gap-2 border-t-4 border-seatzy-black pt-4">
                <h3 className="font-bold uppercase text-sm">Upcoming Shows</h3>
                {event.shows.length === 0 ? (
                  <span className="font-mono text-sm">No shows scheduled</span>
                ) : (
                  event.shows.map((show: any) => (
                    <button 
                      key={show.id} 
                      onClick={() => navigate(`/events/${event.id}/shows/${show.id}/map`)}
                      className="neo-btn bg-seatzy-acid-yellow text-seatzy-black py-2 px-4 text-left font-mono hover:bg-seatzy-magenta hover:text-seatzy-white transition-colors"
                    >
                      {new Date(show.date).toLocaleDateString()} @ {show.time}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
