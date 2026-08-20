import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi('/events')
      .then(res => setEvents(res.data))
      .catch(err => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="bg-primary-container text-on-background neo-brutalist-shadow px-12 py-8 border-4 border-on-background">
          <p className="font-display-xl text-headline-lg uppercase tracking-tighter">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="w-full bg-on-background py-16 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-end justify-between relative z-10">
          <h1 className="font-display-xl text-display-xl text-on-primary uppercase leading-none break-words max-w-[80%]">
            LIVE EVENTS
          </h1>
          <div className="bg-primary-container text-on-background border-border-width border-on-background px-4 py-2 flex items-center justify-center font-display-xl text-headline-lg leading-none neo-brutalist-shadow transform rotate-12 origin-bottom-right">
            {events.length}
          </div>
        </div>
        {/* Abstract architectural lines in background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 20px)' }}></div>
      </section>

      {/* Search / Filter Bar */}
      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-gutter flex flex-col md:flex-row gap-gutter">
        <div className="flex-grow flex relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-on-surface-variant z-10" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
          <input 
            className="w-full bg-surface border-border-width border-on-background pl-14 pr-4 py-4 font-data-label text-data-label placeholder:font-data-label placeholder:text-on-surface-variant focus:outline-none focus:ring-0 neo-brutalist-shadow neo-brutalist-hover transition-all" 
            placeholder="SEARCH VENUES, ARTISTS, CITIES..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 md:pb-0 hide-scrollbar items-center">
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-surface text-on-surface border-border-width border-on-background px-4 py-4 font-data-label text-data-label uppercase whitespace-nowrap neo-brutalist-shadow neo-brutalist-hover focus:outline-none transition-all"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-tertiary-fixed text-on-tertiary-fixed border-border-width border-on-background px-6 py-4 font-data-label text-data-label uppercase whitespace-nowrap neo-brutalist-shadow neo-brutalist-hover focus:outline-none transition-all cursor-pointer"
          >
            <option value="">ALL TYPES</option>
            <option value="movie">MOVIE</option>
            <option value="concert">CONCERT</option>
            <option value="comedy">COMEDY</option>
            <option value="sports">SPORTS</option>
          </select>
        </div>
      </section>

      {/* Event Grid */}
      {(() => {
        const filteredEvents = events.filter(e => {
          const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              e.type.toLowerCase().includes(searchQuery.toLowerCase());
          
          const matchType = typeFilter ? e.type.toLowerCase() === typeFilter.toLowerCase() : true;
          
          let matchDate = true;
          if (dateFilter) {
            // Check if any show matches the date
            matchDate = e.shows?.some((s: any) => new Date(s.date).toISOString().split('T')[0] === dateFilter);
          }

          return matchSearch && matchType && matchDate;
        });

        if (filteredEvents.length === 0) {
          return (
            <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8">
              <div className="bg-surface-variant border-4 border-on-background p-16 flex flex-col items-center gap-4 neo-brutalist-shadow blueprint-bg">
                <div className="font-headline-lg-mobile text-headline-lg-mobile uppercase font-black bg-on-background text-on-primary px-4 py-2 transform -rotate-2 border-4 border-on-background">No Events Found</div>
                <p className="font-data-label text-data-label uppercase">Check back soon or ask your organiser to create one.</p>
              </div>
            </section>
          );
        }

        return (
          <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {filteredEvents.map((event) => (
              <article key={event.id} className="bg-surface border-border-width border-on-background flex flex-col group neo-brutalist-shadow neo-brutalist-hover transition-all relative overflow-hidden cursor-pointer" onClick={() => setSelectedEvent(event)}>
                <div className="relative h-64 border-b-4 border-on-background overflow-hidden">
                  <div 
                    className="bg-cover bg-center w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100" 
                    style={{ backgroundImage: event.poster_url ? `url(${event.poster_url})` : 'none', backgroundColor: event.poster_url ? 'transparent' : '#e2e2e2' }}
                  >
                    {!event.poster_url && (
                      <div className="w-full h-full flex items-center justify-center blueprint-bg">
                         <span className="font-data-label text-data-label uppercase text-on-surface-variant">No Poster</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background">{event.type || 'EVENT'}</span>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container bg-on-background inline-block px-2 py-1 mb-2 uppercase break-words w-max max-w-full line-clamp-1">{event.title}</h2>
                  <p className="font-data-label text-data-label uppercase text-on-surface-variant mb-4 flex items-center gap-1 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="mt-auto pt-4 border-t-2 border-on-background flex justify-between items-center">
                    <span className="font-data-label text-data-label uppercase font-bold">{event.shows?.length || 0} Shows Available</span>
                    <button className="bg-primary-fixed text-on-background font-headline-lg-mobile text-body-md uppercase font-bold border-2 border-on-background px-4 py-2 hover:bg-on-background hover:text-primary-fixed transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        );
      })()}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-on-background/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-4xl flex flex-col md:flex-row relative">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 z-10 bg-surface border-2 border-on-background w-10 h-10 flex items-center justify-center hover:bg-error hover:text-on-error transition-colors"
            >
              <span className="material-symbols-outlined font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>close</span>
            </button>
            
            <div className="w-full md:w-1/2 bg-surface-dim border-b-4 md:border-b-0 md:border-r-4 border-on-background">
              {selectedEvent.poster_url ? (
                <img src={selectedEvent.poster_url} alt={selectedEvent.title} className="w-full h-full object-cover aspect-[3/4] md:aspect-auto" />
              ) : (
                <div className="w-full h-full min-h-[300px] flex items-center justify-center blueprint-bg">
                  <span className="font-data-label text-data-label uppercase text-on-surface-variant">No Poster</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col max-h-[80vh] overflow-y-auto">
              <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background inline-block w-max mb-4">
                {selectedEvent.type || 'EVENT'}
              </span>
              <h2 className="font-display-xl text-4xl uppercase text-on-background leading-none mb-4">{selectedEvent.title}</h2>
              <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed">
                {selectedEvent.description}
              </p>

              <h3 className="font-headline-lg-mobile text-xl uppercase mb-4 border-b-2 border-on-background pb-2">Select a Show</h3>
              <div className="flex flex-col gap-3">
                {selectedEvent.shows.length === 0 ? (
                  <div className="font-data-label text-data-label uppercase text-on-surface-variant p-4 border-2 border-on-background text-center bg-surface-variant">
                    No shows scheduled
                  </div>
                ) : (
                  selectedEvent.shows.map((show: any) => (
                    <div key={show.id} className="bg-surface-lowest border-2 border-on-background p-4 flex justify-between items-center hover:bg-primary-container transition-colors group">
                      <div>
                        <p className="font-data-label text-data-label text-on-surface-variant uppercase group-hover:text-on-primary-container transition-colors">
                          {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="font-headline-lg-mobile text-2xl font-bold text-on-background">{show.time}</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/events/${selectedEvent.id}/shows/${show.id}/map`)}
                        className="bg-secondary text-on-secondary font-headline-lg-mobile text-sm uppercase font-bold border-2 border-on-background px-6 py-3 hover:bg-on-background hover:text-secondary transition-colors"
                      >
                        BOOK
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
