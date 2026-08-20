import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi('/events')
      .then(res => setEvents(res.data))
      .catch(err => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-seatzy-acid-yellow border-4 border-seatzy-black shadow-neo-xl px-12 py-8">
        <p className="font-black text-4xl uppercase tracking-tighter">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Hero header band — full-bleed black */}
      <div className="bg-seatzy-black text-seatzy-white border-b-4 border-seatzy-black -mx-4 md:-mx-8 px-4 md:px-8 py-8 mb-8 flex items-end justify-between gap-4 shadow-neo-lg">
        <div>
          <p className="font-mono text-seatzy-cyan text-xs tracking-widest uppercase mb-1">// Browse</p>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
            Live<br />Events
          </h1>
        </div>
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="stamp-badge-yellow text-seatzy-black">{events.length} Shows</div>
          <p className="font-mono text-xs text-seatzy-gray-grid">Select a show to pick your seat</p>
        </div>
      </div>

      {events.length === 0 ? (
        /* Empty state — still brutally intentional */
        <div className="border-4 border-seatzy-black bg-seatzy-gray-grid hash-pattern p-16 flex flex-col items-center gap-4 shadow-neo-lg">
          <div className="stamp-badge-black">No Events Found</div>
          <p className="font-mono text-sm">Check back soon or ask your organiser to create one.</p>
        </div>
      ) : (
        /* Event grid — 2 or 3 columns with tight gutters */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event, i) => {
            // Alternate accent colours per card for deliberate color-blocking variety
            const accentColors = [
              { badge: 'bg-seatzy-cyan', btn: 'bg-seatzy-acid-yellow hover:bg-seatzy-cyan', header: 'bg-seatzy-black' },
              { badge: 'bg-seatzy-magenta text-seatzy-white', btn: 'bg-seatzy-acid-yellow hover:bg-seatzy-magenta hover:text-seatzy-white', header: 'bg-seatzy-acid-yellow text-seatzy-black' },
              { badge: 'bg-seatzy-acid-yellow', btn: 'bg-seatzy-cyan hover:bg-seatzy-black hover:text-seatzy-white', header: 'bg-seatzy-black' },
            ];
            const accent = accentColors[i % 3];

            return (
              <div key={event.id} className="neo-card-lg flex flex-col group">
                {/* Poster */}
                {event.poster_url ? (
                  <div className="relative overflow-hidden border-b-4 border-seatzy-black">
                    <img
                      src={event.poster_url}
                      alt={event.title}
                      className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Type badge overlaid on poster */}
                    <div className={`absolute top-3 right-3 ${accent.badge} border-2 border-seatzy-black px-3 py-1 font-black text-xs uppercase tracking-widest shadow-neo-sm`}>
                      {event.type}
                    </div>
                  </div>
                ) : (
                  <div className="h-56 border-b-4 border-seatzy-black hash-pattern bg-seatzy-gray-grid flex flex-col items-center justify-center gap-3 relative">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest opacity-40">No Poster</span>
                    <div className={`absolute top-3 right-3 ${accent.badge} border-2 border-seatzy-black px-3 py-1 font-black text-xs uppercase tracking-widest shadow-neo-sm`}>
                      {event.type}
                    </div>
                  </div>
                )}

                {/* Card header band */}
                <div className={`${accent.header} px-5 py-3 border-b-4 border-seatzy-black`}>
                  <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-seatzy-white">
                    {event.title}
                  </h2>
                </div>

                {/* Body */}
                <div className="p-5 flex-grow flex flex-col gap-4 bg-seatzy-white">
                  <p className="font-mono text-sm leading-relaxed text-seatzy-black line-clamp-2 opacity-80">
                    {event.description}
                  </p>

                  {/* Shows section */}
                  <div className="mt-auto flex flex-col gap-2 pt-4 border-t-4 border-seatzy-black">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-black text-xs uppercase tracking-widest">Upcoming Shows</h3>
                      <span className="font-mono text-xs bg-seatzy-gray-grid px-2 border-2 border-seatzy-black">
                        {event.shows.length} total
                      </span>
                    </div>

                    {event.shows.length === 0 ? (
                      <div className="hash-pattern border-2 border-seatzy-black p-3 text-center">
                        <span className="font-mono text-xs uppercase opacity-50">No shows scheduled</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {event.shows.map((show: any, si: number) => (
                          <button
                            key={show.id}
                            onClick={() => navigate(`/events/${event.id}/shows/${show.id}/map`)}
                            className={`neo-btn ${accent.btn} text-seatzy-black py-3 px-4 text-left text-sm flex items-center justify-between group/btn`}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="font-black uppercase tracking-tight">
                                {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </span>
                              <span className="font-mono text-xs">@ {show.time}</span>
                            </div>
                            <span className="font-black text-lg group-hover/btn:translate-x-1 transition-transform">→</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
