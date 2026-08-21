import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('seatzy_selected_city') || 'All Cities';
  });

  const navigate = useNavigate();
  const eventsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchApi('/events')
      .then(res => setEvents(res.data))
      .catch(err => console.error('Failed to fetch events:', err))
      .finally(() => setLoading(false));

    const handleCityChange = (e: CustomEvent) => {
      if (e.detail) setSelectedCity(e.detail);
    };
    window.addEventListener('seatzy_city_changed' as any, handleCityChange);
    return () => window.removeEventListener('seatzy_city_changed' as any, handleCityChange);
  }, []);

  const handleCategoryExplore = (type: string) => {
    setTypeFilter(type);
    if (eventsGridRef.current) {
      eventsGridRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <div className="bg-primary-container text-on-background neo-brutalist-shadow px-12 py-8 border-4 border-on-background">
          <p className="font-display-xl text-headline-lg uppercase tracking-tighter">Loading Events...</p>
        </div>
      </div>
    );
  }

  const categoryCards = [
    {
      id: 'movie',
      title: 'MOVIES',
      subtitle: 'Blockbusters & Cinema',
      icon: 'movie',
      color: 'bg-amber-400 text-on-background border-amber-600',
      badge: 'CINEMA EXPERIENCE'
    },
    {
      id: 'comedy',
      title: 'COMEDY',
      subtitle: 'Standup & Roasts',
      icon: 'mic',
      color: 'bg-yellow-300 text-on-background border-yellow-600',
      badge: 'FLAT $35 SEATS'
    },
    {
      id: 'sports',
      title: 'SPORTS',
      subtitle: 'Cricket & Football',
      icon: 'stadium',
      color: 'bg-emerald-400 text-on-background border-emerald-700',
      badge: 'STADIUM ATMOSPHERE'
    },
    {
      id: 'concert',
      title: 'CONCERTS',
      subtitle: '360° Live Music',
      icon: 'graphic_eq',
      color: 'bg-cyan-400 text-on-background border-cyan-700',
      badge: 'VIP STAGE ACCESS'
    }
  ];

  return (
    <div className="w-full bg-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Hero Section */}
      <section className="w-full bg-on-background py-16 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-xs uppercase font-bold bg-primary-fixed text-on-primary-fixed px-3 py-1 border-2 border-on-background flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {selectedCity === 'All Cities' ? 'ALL LOCATIONS' : selectedCity.toUpperCase()}
              </span>
              <span className="font-mono text-xs uppercase font-bold bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 border-2 border-on-background">
                LIVE BOOKING ENGINE
              </span>
            </div>
            <h1 className="font-display-xl text-display-xl text-on-primary uppercase leading-none break-words">
              LIVE EVENTS
            </h1>
          </div>
          <div className="bg-primary-container text-on-background border-border-width border-on-background px-5 py-3 flex items-center justify-center font-display-xl text-headline-lg leading-none neo-brutalist-shadow transform md:rotate-6">
            {events.length} EVENTS AVAILABLE
          </div>
        </div>
        {/* Abstract architectural lines in background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 20px)' }}></div>
      </section>

      {/* "WHAT DO U WANNA EXPLORE TODAY?" CATEGORY PORTAL */}
      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-10 border-b-4 border-on-background bg-surface-container blueprint-bg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-headline-lg-mobile md:font-headline-lg uppercase text-on-surface font-black tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-fixed text-3xl font-black">explore</span>
              WHAT DO U WANNA EXPLORE TODAY?
            </h2>
            <p className="font-data-label text-data-label uppercase text-on-surface-variant mt-1 font-bold">
              PICK A CATEGORY TO INSTANTLY FILTER LIVE EVENTS IN {selectedCity.toUpperCase()}
            </p>
          </div>
        </div>

        {/* 4 Interactive Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categoryCards.map((cat) => {
            const isSelected = typeFilter.toLowerCase() === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryExplore(cat.id)}
                className={`p-6 border-4 border-on-background flex flex-col justify-between text-left transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'bg-primary-fixed text-on-primary-fixed neo-brutalism-shadow translate-x-[-4px] translate-y-[-4px]'
                    : 'bg-surface text-on-surface hover:bg-surface-container hover:neo-brutalism-shadow hover:translate-x-[-4px] hover:translate-y-[-4px]'
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 border-4 border-on-background ${cat.color} flex items-center justify-center neo-brutalism-shadow-sm group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-3xl font-black">{cat.icon}</span>
                  </div>
                  <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 bg-on-background text-on-primary border border-on-background">
                    {cat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-headline-lg-mobile text-2xl uppercase font-black tracking-tight mb-1 group-hover:text-primary-fixed transition-colors">
                    {cat.title}
                  </h3>
                  <p className="font-data-label text-xs uppercase opacity-80 font-bold">
                    {cat.subtitle}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-on-background flex items-center justify-between">
                  <span className="font-data-label text-[10px] uppercase font-black">
                    {isSelected ? '✓ ACTIVE FILTER' : 'EXPLORE'}
                  </span>
                  <span className="material-symbols-outlined text-lg font-black group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Search / Filter Bar & Active City Marker */}
      <section ref={eventsGridRef} className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-gutter flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-grow min-w-0 flex relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-on-surface-variant z-10" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
          <input 
            className="w-full bg-surface border-border-width border-on-background pl-14 pr-4 py-3.5 font-data-label text-data-label placeholder:font-data-label placeholder:text-on-surface-variant focus:outline-none focus:ring-0 neo-brutalist-shadow neo-brutalist-hover transition-all font-bold" 
            placeholder={`SEARCH VENUES, ARTISTS IN ${selectedCity.toUpperCase()}...`} 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex-shrink-0 flex gap-3 items-center">
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-surface text-on-surface border-border-width border-on-background px-3 py-3.5 font-data-label text-data-label uppercase whitespace-nowrap neo-brutalist-shadow neo-brutalist-hover focus:outline-none transition-all font-bold min-w-[140px]"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-tertiary-fixed text-on-tertiary-fixed border-border-width border-on-background px-4 py-3.5 font-data-label text-data-label uppercase whitespace-nowrap neo-brutalist-shadow neo-brutalist-hover focus:outline-none transition-all cursor-pointer font-bold"
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
          // City filter
          let matchCity = true;
          if (selectedCity && selectedCity !== 'All Cities') {
            matchCity = e.shows?.some((s: any) => s.venue?.city?.toLowerCase() === selectedCity.toLowerCase());
          }

          // Search query
          const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              e.type.toLowerCase().includes(searchQuery.toLowerCase());
          
          // Event format type
          const matchType = typeFilter ? e.type.toLowerCase() === typeFilter.toLowerCase() : true;
          
          // Date
          let matchDate = true;
          if (dateFilter) {
            matchDate = e.shows?.some((s: any) => new Date(s.date).toISOString().split('T')[0] === dateFilter);
          }

          return matchCity && matchSearch && matchType && matchDate;
        });

        if (filteredEvents.length === 0) {
          return (
            <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12">
              <div className="bg-surface-variant border-4 border-on-background p-16 flex flex-col items-center gap-4 neo-brutalist-shadow blueprint-bg text-center">
                <div className="font-headline-lg-mobile text-headline-lg-mobile uppercase font-black bg-on-background text-on-primary px-4 py-2 transform -rotate-2 border-4 border-on-background">
                  No Events Found in {selectedCity}
                </div>
                <p className="font-data-label text-data-label uppercase font-bold">
                  Try switching cities or selecting "ALL CITIES" from the top navigation bar.
                </p>
                <button
                  onClick={() => {
                    setTypeFilter('');
                    setSearchQuery('');
                    setDateFilter('');
                  }}
                  className="mt-4 bg-primary-fixed text-on-primary-fixed border-4 border-on-background px-6 py-3 font-headline-lg-mobile uppercase font-black neo-brutalism-shadow"
                >
                  Reset All Filters
                </button>
              </div>
            </section>
          );
        }

        return (
          <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter mb-16">
            {filteredEvents.map((event) => {
              const venueObj = event.shows?.[0]?.venue;
              return (
                <article 
                  key={event.id} 
                  className="bg-surface border-border-width border-on-background flex flex-col group neo-brutalist-shadow neo-brutalist-hover transition-all relative overflow-hidden cursor-pointer" 
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="relative h-64 border-b-4 border-on-background overflow-hidden">
                    <div 
                      className="bg-cover bg-center w-full h-full transition-transform duration-500 scale-100 group-hover:scale-105" 
                      style={{ backgroundImage: event.poster_url ? `url(${event.poster_url})` : 'none', backgroundColor: event.poster_url ? 'transparent' : '#e2e2e2' }}
                    >
                      {!event.poster_url && (
                        <div className="w-full h-full flex items-center justify-center blueprint-bg">
                          <span className="font-data-label text-data-label uppercase text-on-surface-variant font-bold">No Poster</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                      <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background font-bold">
                        {event.type || 'EVENT'}
                      </span>
                      {venueObj?.city && (
                        <span className="bg-primary-fixed text-on-primary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          {venueObj.city}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary-container bg-on-background inline-block px-2 py-1 mb-2 uppercase break-words w-max max-w-full line-clamp-1">
                      {event.title}
                    </h2>
                    <p className="font-data-label text-data-label uppercase text-on-surface-variant mb-4 flex items-center gap-1 line-clamp-2 font-bold">
                      {event.description}
                    </p>
                    <div className="mt-auto pt-4 border-t-2 border-on-background flex justify-between items-center">
                      <span className="font-data-label text-data-label uppercase font-bold text-on-surface">
                        {event.shows?.length || 0} Shows Available
                      </span>
                      <button className="bg-primary-fixed text-on-background font-headline-lg-mobile text-body-md uppercase font-black border-2 border-on-background px-4 py-2 hover:bg-on-background hover:text-primary-fixed transition-colors">
                        Details
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
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
                  <span className="font-data-label text-data-label uppercase text-on-surface-variant font-bold">No Poster</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col max-h-[80vh] overflow-y-auto">
              <div className="flex gap-2 mb-4">
                <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background inline-block font-bold">
                  {selectedEvent.type || 'EVENT'}
                </span>
                {selectedEvent.shows?.[0]?.venue?.city && (
                  <span className="bg-primary-fixed text-on-primary-fixed font-data-label text-data-label uppercase px-2 py-1 border-2 border-on-background font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {selectedEvent.shows[0].venue.city}
                  </span>
                )}
              </div>

              <h2 className="font-display-xl text-4xl uppercase text-on-background leading-none mb-4 font-black">{selectedEvent.title}</h2>
              <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed font-bold">
                {selectedEvent.description}
              </p>

              <h3 className="font-headline-lg-mobile text-xl uppercase mb-4 border-b-2 border-on-background pb-2 font-black">Select a Show</h3>
              <div className="flex flex-col gap-3">
                {selectedEvent.shows.length === 0 ? (
                  <div className="font-data-label text-data-label uppercase text-on-surface-variant p-4 border-2 border-on-background text-center bg-surface-variant font-bold">
                    No shows scheduled
                  </div>
                ) : (
                  selectedEvent.shows.map((show: any) => (
                    <div key={show.id} className="bg-surface-lowest border-2 border-on-background p-4 flex justify-between items-center hover:bg-primary-container transition-colors group">
                      <div>
                        <p className="font-data-label text-data-label text-on-surface-variant uppercase group-hover:text-on-primary-container transition-colors font-bold">
                          {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="font-headline-lg-mobile text-2xl font-black text-on-background">{show.time}</p>
                        {show.venue?.name && (
                          <p className="font-mono text-[10px] uppercase text-on-surface-variant font-bold">{show.venue.name}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => navigate(`/events/${selectedEvent.id}/shows/${show.id}/map`)}
                        className="bg-secondary text-on-secondary font-headline-lg-mobile text-sm uppercase font-black border-2 border-on-background px-6 py-3 hover:bg-on-background hover:text-secondary transition-colors"
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
