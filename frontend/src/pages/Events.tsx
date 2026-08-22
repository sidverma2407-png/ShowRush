import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../api/client';

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') || '';
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [languageFilter, setLanguageFilter] = useState('All');
  const [formatFilter, setFormatFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');

  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('seatzy_selected_city') || 'All Cities';
  });

  const navigate = useNavigate();
  const eventsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paramType = searchParams.get('type');
    if (paramType !== null) {
      setTypeFilter(paramType);
    }
  }, [searchParams]);

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

  const handleCategorySelect = (category: string) => {
    setTypeFilter(category);
    if (category) {
      setSearchParams({ type: category });
    } else {
      setSearchParams({});
    }
  };

  if (loading) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center bg-background p-4">
        <div className="bg-primary-container text-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 sm:p-12 border-4 border-on-background text-center flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl font-black animate-spin">progress_activity</span>
          <p className="font-display-xl text-2xl uppercase tracking-tight font-black">FETCHING LIVE EVENTS...</p>
        </div>
      </div>
    );
  }

  const categoryChips = [
    { id: '', label: 'ALL SHOWS', icon: 'grid_view' },
    { id: 'movie', label: 'MOVIES', icon: 'movie' },
    { id: 'concert', label: 'CONCERTS', icon: 'graphic_eq' },
    { id: 'comedy', label: 'COMEDY', icon: 'mic' },
    { id: 'sports', label: 'SPORTS', icon: 'stadium' },
  ];

  return (
    <div className="w-full bg-background selection:bg-primary-fixed selection:text-on-primary-fixed pb-20">
      
      {/* 🚀 Header Hero Section */}
      <section className="w-full bg-on-background text-on-primary py-12 md:py-16 px-4 md:px-margin-desktop border-b-4 border-on-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="font-mono text-xs uppercase font-black bg-primary-fixed text-on-background px-3 py-1 border-2 border-primary-fixed flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-sm font-black">location_on</span>
                {selectedCity === 'All Cities' ? 'ALL LOCATIONS' : selectedCity.toUpperCase()}
              </span>
              <span className="font-mono text-xs uppercase font-black bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 border-2 border-tertiary-fixed">
                LIVE SEAT LOCKING ENGINE
              </span>
            </div>

            <h1 className="font-display-xl text-4xl sm:text-6xl md:text-7xl font-black text-primary-container uppercase tracking-tight leading-none mb-3 italic">
              EXPLORE LIVE EVENTS
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-surface-variant max-w-2xl font-bold uppercase">
              Select any event below to view showtimes, trailers, viewer reviews and pick your seats.
            </p>
          </div>

          <div className="bg-primary-fixed text-on-background border-4 border-on-background px-6 py-3 font-display-xl text-xl sm:text-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform md:-rotate-2 self-start md:self-auto font-black shrink-0">
            {events.length} EVENTS LOADED
          </div>
        </div>

        {/* Abstract Background Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* 🧭 Filter Bar & Category Chips */}
      <section ref={eventsGridRef} className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-8 flex flex-col gap-6">
        
        {/* Category Quick Selector Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categoryChips.map((chip) => {
            const isActive = typeFilter.toLowerCase() === chip.id.toLowerCase();
            return (
              <button
                key={chip.id}
                onClick={() => handleCategorySelect(chip.id)}
                className={`px-4 py-2.5 border-2 border-on-background font-headline-lg text-xs sm:text-sm uppercase font-black whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-primary-fixed text-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-y-[-2px]'
                    : 'bg-surface text-on-background hover:bg-surface-variant shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                <span className="material-symbols-outlined text-base font-black">{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* BookMyShow Style Filters: Language, Format, Genre */}
        <div className="bg-yellow-100 border-3 border-on-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-wrap gap-4 items-center">
          <span className="font-mono font-black text-xs uppercase bg-black text-white px-3 py-1 border border-black">
            Movie Filters:
          </span>

          {/* Language Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase">Language:</span>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="bg-white border-2 border-black font-mono font-bold text-xs uppercase px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="All">All Languages</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
            </select>
          </div>

          {/* Format Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase">Format:</span>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="bg-white border-2 border-black font-mono font-bold text-xs uppercase px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="All">All Formats</option>
              <option value="2D">2D</option>
              <option value="3D">3D</option>
              <option value="IMAX 3D">IMAX 3D</option>
              <option value="4DX">4DX</option>
            </select>
          </div>

          {/* Genre Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase">Genre:</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="bg-white border-2 border-black font-mono font-bold text-xs uppercase px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="All">All Genres</option>
              <option value="Action">Action</option>
              <option value="Comedy">Comedy</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Drama">Drama</option>
              <option value="Romance">Romance</option>
            </select>
          </div>

          {(languageFilter !== 'All' || formatFilter !== 'All' || genreFilter !== 'All') && (
            <button
              onClick={() => {
                setLanguageFilter('All');
                setFormatFilter('All');
                setGenreFilter('All');
              }}
              className="font-mono text-xs font-black text-red-600 underline uppercase hover:text-black ml-auto cursor-pointer"
            >
              Reset Movie Filters
            </button>
          )}
        </div>

        {/* Search & Date Filter Inputs */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="flex-grow min-w-0 flex relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant z-10 font-black">search</span>
            <input 
              className="w-full bg-surface border-2 border-on-background pl-12 pr-10 py-3 font-data-label text-sm placeholder:text-on-surface-variant focus:outline-none focus:border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all font-bold min-h-[46px]" 
              placeholder={`Search artist, event title or venue in ${selectedCity.toUpperCase()}...`} 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background font-bold text-sm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-surface border-2 border-on-background px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-[46px]">
              <span className="material-symbols-outlined text-sm font-black text-primary">calendar_month</span>
              <input 
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent text-on-surface font-data-label text-xs sm:text-sm uppercase font-bold focus:outline-none cursor-pointer"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="text-xs font-black hover:text-error ml-1">✕</button>
              )}
            </div>

            {(typeFilter || searchQuery || dateFilter || languageFilter !== 'All' || formatFilter !== 'All' || genreFilter !== 'All') && (
              <button
                onClick={() => {
                  setTypeFilter('');
                  setSearchQuery('');
                  setDateFilter('');
                  setLanguageFilter('All');
                  setFormatFilter('All');
                  setGenreFilter('All');
                  setSearchParams({});
                }}
                className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-headline-lg text-xs uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-error transition-colors min-h-[46px] whitespace-nowrap cursor-pointer"
              >
                CLEAR ALL
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 🎪 Events List / Grid */}
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
          
          // Date filter
          let matchDate = true;
          if (dateFilter) {
            matchDate = e.shows?.some((s: any) => new Date(s.date).toISOString().split('T')[0] === dateFilter);
          }

          // BookMyShow Filters
          let matchLang = true;
          if (languageFilter !== 'All') {
            matchLang = e.language ? e.language.toLowerCase().includes(languageFilter.toLowerCase()) : false;
          }

          let matchFmt = true;
          if (formatFilter !== 'All') {
            matchFmt = e.format ? e.format.toLowerCase().includes(formatFilter.toLowerCase()) : false;
          }

          let matchGnr = true;
          if (genreFilter !== 'All') {
            matchGnr = e.genre ? e.genre.toLowerCase().includes(genreFilter.toLowerCase()) : false;
          }

          return matchCity && matchSearch && matchType && matchDate && matchLang && matchFmt && matchGnr;
        });

        if (filteredEvents.length === 0) {
          return (
            <section className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-12">
              <div className="bg-surface border-4 border-on-background p-8 sm:p-12 flex flex-col items-center gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center max-w-2xl mx-auto">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant font-black">event_busy</span>
                <h3 className="font-headline-lg text-2xl uppercase font-black text-on-background">No Events Match Your Filter</h3>
                <p className="font-body-md text-sm text-on-surface-variant font-bold max-w-md">
                  No shows found matching your selected search criteria in {selectedCity}. Try resetting filters.
                </p>
                <button
                  onClick={() => {
                    setTypeFilter('');
                    setSearchQuery('');
                    setDateFilter('');
                    setLanguageFilter('All');
                    setFormatFilter('All');
                    setGenreFilter('All');
                    setSearchParams({});
                  }}
                  className="mt-2 bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg text-sm uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-colors min-h-[44px] cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            </section>
          );
        }

        return (
          <section className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
            {filteredEvents.map((event) => {
              const venueObj = event.shows?.[0]?.venue;
              const showCount = event.shows?.length || 0;

              return (
                <article 
                  key={event.id} 
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="bg-surface border-4 border-on-background flex flex-col group shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] transition-all relative overflow-hidden cursor-pointer" 
                >
                  {/* Poster Aspect Container */}
                  <div className="relative w-full aspect-[4/3] border-b-4 border-on-background overflow-hidden bg-black flex items-center justify-center">
                    {event.poster_url ? (
                      <img 
                        src={event.poster_url} 
                        alt={event.title}
                        className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center blueprint-bg">
                        <span className="font-data-label text-xs uppercase text-on-surface-variant font-bold">No Poster</span>
                      </div>
                    )}

                    {/* Category & Location Badges */}
                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                      <span className="bg-primary-fixed text-on-background font-mono text-xs uppercase px-2.5 py-1 border-2 border-on-background font-black shadow-sm">
                        {event.type}
                      </span>
                      {event.certification && (
                        <span className="bg-red-500 text-white font-mono text-xs uppercase px-2 py-1 border-2 border-on-background font-black shadow-sm">
                          {event.certification}
                        </span>
                      )}
                    </div>

                    {/* Rating Badge */}
                    {event.average_rating && (
                      <div className="absolute top-3 right-3 bg-yellow-400 text-black font-mono text-xs font-black px-2.5 py-1 border-2 border-on-background shadow-sm flex items-center gap-1">
                        ★ {event.average_rating}
                      </div>
                    )}

                    {/* Shows Available Badge on Poster */}
                    <div className="absolute bottom-3 right-3 bg-tertiary-fixed text-on-tertiary-fixed font-mono text-xs font-black px-2.5 py-1 border-2 border-on-background shadow-sm uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs font-black">bolt</span>
                      {showCount} {showCount === 1 ? 'SHOW' : 'LIVE SHOWS'}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-grow justify-between">
                    <div>
                      <h2 className="font-headline-lg text-lg sm:text-xl text-on-background uppercase font-black line-clamp-1 mb-2 group-hover:text-primary transition-colors">
                        {event.title}
                      </h2>
                      
                      {/* Language & Format Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-2 font-mono text-[10px] font-bold uppercase">
                        {event.language && <span className="bg-slate-100 border border-black px-1.5 py-0.5">{event.language}</span>}
                        {event.format && <span className="bg-blue-100 border border-black px-1.5 py-0.5">{event.format}</span>}
                        {event.genre && <span className="bg-emerald-100 border border-black px-1.5 py-0.5">{event.genre}</span>}
                      </div>

                      <p className="font-body-md text-xs text-on-surface-variant line-clamp-2 font-bold leading-relaxed mb-4">
                        {event.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t-2 border-on-background/20 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-mono text-[10px] text-on-surface-variant uppercase font-bold">VENUE</span>
                        <span className="font-headline-lg text-xs uppercase font-black text-on-background line-clamp-1">
                          {venueObj?.name || 'Partner Arena'}
                        </span>
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/events/${event.id}`);
                        }}
                        className="bg-yellow-400 text-black font-headline-lg text-xs uppercase font-black border-2 border-on-background px-4 py-2.5 group-hover:bg-black group-hover:text-yellow-400 transition-colors min-h-[42px] flex items-center gap-1 shadow-neo-sm"
                      >
                        <span>BOOK SHOWS</span>
                        <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        );
      })()}

      {/* 🎟️ Event Details & Multi-Show Selection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border-4 border-on-background shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-4xl w-full flex flex-col md:flex-row relative overflow-hidden max-h-[90vh]">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 z-20 bg-error text-on-error border-2 border-on-background w-9 h-9 flex items-center justify-center font-black hover:bg-on-background transition-colors shadow-sm cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>
            
            <div className="w-full md:w-5/12 bg-black border-b-4 md:border-b-0 md:border-r-4 border-on-background flex items-center justify-center p-3 max-h-[260px] md:max-h-none">
              {selectedEvent.poster_url ? (
                <img src={selectedEvent.poster_url} alt={selectedEvent.title} className="w-full h-full object-contain max-h-[240px] md:max-h-[480px]" />
              ) : (
                <div className="w-full h-full min-h-[200px] flex items-center justify-center blueprint-bg">
                  <span className="font-data-label text-xs uppercase text-on-surface-variant font-bold">No Poster</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-7/12 p-6 sm:p-8 flex flex-col max-h-[65vh] md:max-h-[85vh] overflow-y-auto blueprint-bg">
              <div className="flex gap-2 mb-3 flex-wrap pr-8">
                <span className="bg-primary-fixed text-on-background font-mono text-xs uppercase px-2.5 py-1 border-2 border-on-background font-black">
                  {selectedEvent.type}
                </span>
                {selectedEvent.shows?.[0]?.venue?.city && (
                  <span className="bg-surface text-on-background font-mono text-xs uppercase px-2.5 py-1 border-2 border-on-background font-black flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    {selectedEvent.shows[0].venue.city}
                  </span>
                )}
                <span className="bg-tertiary-fixed text-on-tertiary-fixed font-mono text-xs uppercase px-2.5 py-1 border-2 border-on-background font-black">
                  {selectedEvent.shows?.length || 0} SHOW SLOTS
                </span>
              </div>

              <h2 className="font-display-xl text-2xl sm:text-4xl uppercase text-on-background leading-tight mb-2 font-black">
                {selectedEvent.title}
              </h2>
              
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mb-6 leading-relaxed font-bold">
                {selectedEvent.description}
              </p>

              <div className="flex items-center justify-between border-b-4 border-on-background pb-2 mb-4">
                <h3 className="font-headline-lg text-base sm:text-lg uppercase font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl font-black">schedule</span>
                  Select Show Timing
                </h3>
                <span className="font-mono text-xs font-black uppercase text-on-surface-variant">REAL-TIME LOCK</span>
              </div>

              <div className="flex flex-col gap-3">
                {selectedEvent.shows.length === 0 ? (
                  <div className="font-data-label text-xs uppercase text-on-surface-variant p-4 border-2 border-on-background text-center bg-surface-variant font-bold">
                    No shows scheduled
                  </div>
                ) : (
                  selectedEvent.shows.map((show: any, idx: number) => (
                    <div key={show.id} className="bg-surface border-2 border-on-background p-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-primary-container/20 transition-all gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-on-background text-primary-fixed font-mono text-[10px] font-black px-1.5 py-0.5">
                            SHOW #{idx + 1}
                          </span>
                          <span className="font-data-label text-xs uppercase font-black text-on-background">
                            {new Date(show.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="font-display-xl text-2xl font-black text-on-background mt-1">
                          {show.time} IST
                        </div>
                        
                        {show.venue?.name && (
                          <span className="font-mono text-[11px] uppercase text-on-surface-variant font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">pin_drop</span>
                            {show.venue.name} ({show.venue.city})
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => navigate(`/events/${selectedEvent.id}/shows/${show.id}/map`)}
                        className="bg-primary-fixed text-on-background font-headline-lg text-xs sm:text-sm uppercase font-black border-2 border-on-background px-5 py-2.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>BOOK SEATS</span>
                        <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
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
