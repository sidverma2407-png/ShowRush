import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Explore() {
  const navigate = useNavigate();
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('seatzy_selected_city') || 'All Cities';
  });

  useEffect(() => {
    const handleStorageChange = (e: CustomEvent) => {
      if (e.detail) setSelectedCity(e.detail);
    };
    window.addEventListener('seatzy_city_changed' as any, handleStorageChange);
    return () => window.removeEventListener('seatzy_city_changed' as any, handleStorageChange);
  }, []);

  const categories = [
    {
      id: 'movie',
      title: 'MOVIES',
      subtitle: 'Blockbusters & Cinema',
      icon: 'movie',
      badge: 'CINEMA RECLINERS',
      accentColor: 'bg-amber-300 text-on-background',
      hoverBorder: 'hover:border-amber-500',
      description: 'Experience blockbusters with executive recliners, Dolby Atmos sound & premium club seating.',
      stats: 'INDOOR CINEMAS',
    },
    {
      id: 'comedy',
      title: 'COMEDY',
      subtitle: 'Standup & Roasts',
      icon: 'mic',
      badge: 'INTIMATE COMEDY CLUBS',
      accentColor: 'bg-pink-400 text-on-background',
      hoverBorder: 'hover:border-pink-500',
      description: 'Intimate comedy club seating with top national standup artists and unfiltered live roasts.',
      stats: 'FLAT ₹350 TIX',
    },
    {
      id: 'sports',
      title: 'SPORTS',
      subtitle: 'Cricket & Football',
      icon: 'stadium',
      badge: 'STADIUM ATMOSPHERE',
      accentColor: 'bg-emerald-400 text-on-background',
      hoverBorder: 'hover:border-emerald-500',
      description: 'Central 30-yard pitch views, VIP pavilion suite boxes & stadium spectator stands.',
      stats: 'VIP BOXES',
    },
    {
      id: 'concert',
      title: 'CONCERTS',
      subtitle: '360° Live Music',
      icon: 'graphic_eq',
      badge: 'VIP STAGE PITS',
      accentColor: 'bg-cyan-300 text-on-background',
      hoverBorder: 'hover:border-cyan-500',
      description: 'Front-row VIP pit standing, festival stages & 360-degree stadium sound shows.',
      stats: '360° STAGES',
    }
  ];

  return (
    <div className="w-full min-h-screen bg-background selection:bg-primary-fixed selection:text-on-primary-fixed pb-20">

      {/* SECTION 1: Platform Introduction & Value Offering */}
      <section className="w-full bg-on-background text-on-primary py-12 sm:py-16 px-4 md:px-margin-desktop border-b-4 border-on-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col gap-8 relative z-10">

          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-primary-fixed text-on-background font-mono font-black text-xs px-3 py-1 border-2 border-primary-fixed uppercase tracking-wider">
              WHAT SEATZY OFFERS
            </span>
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-mono font-black text-xs px-3 py-1 border-2 border-tertiary-fixed uppercase tracking-wider">
              REAL-TIME TICKETING PLATFORM
            </span>
          </div>

          <div className="max-w-4xl">
            <h1 className="font-display-xl text-4xl sm:text-6xl md:text-7xl font-black text-primary-container uppercase tracking-tighter leading-none mb-4 italic">
              REAL-TIME SEAT SELECTION & INSTANT QR TICKETS
            </h1>
            <p className="font-body-md text-base sm:text-lg text-surface-variant font-bold leading-relaxed max-w-3xl">
              Seatzy is India's premium live event ticketing portal. We combine live socket seat mapping, 10-minute instant hold locks, and verified email QR code delivery - ensuring <span className="text-primary-container font-black">zero double-booking</span> & effortless venue entrance.
            </p>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="bg-surface/10 border-2 border-surface/20 p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary-container">
                <span className="material-symbols-outlined text-2xl font-black">grid_view</span>
                <h3 className="font-headline-lg text-sm sm:text-base uppercase font-black text-on-primary">Interactive Seat Maps</h3>
              </div>
              <p className="font-data-label text-xs text-surface-variant uppercase font-bold leading-normal">
                Pick your exact seat in movie recliners, comedy clubs, or stadium blocks with real-time tier pricing.
              </p>
            </div>

            <div className="bg-surface/10 border-2 border-surface/20 p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-tertiary-fixed">
                <span className="material-symbols-outlined text-2xl font-black">timer</span>
                <h3 className="font-headline-lg text-sm sm:text-base uppercase font-black text-on-primary">10-Min Live Seat Lock</h3>
              </div>
              <p className="font-data-label text-xs text-surface-variant uppercase font-bold leading-normal">
                Seats lock instantly for 10 minutes while you checkout so no one else can snag your spot.
              </p>
            </div>

            <div className="bg-surface/10 border-2 border-surface/20 p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined text-2xl font-black">mark_email_read</span>
                <h3 className="font-headline-lg text-sm sm:text-base uppercase font-black text-on-primary">Verified Email QR Passes</h3>
              </div>
              <p className="font-data-label text-xs text-surface-variant uppercase font-bold leading-normal">
                Receive scannable high-resolution QR ticket passes delivered straight to your email inbox.
              </p>
            </div>
          </div>

        </div>

        {/* Abstract Background Grid */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* SECTION 2: Category Exploration */}
      <section className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-12 sm:py-16">

        {/* Category Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b-4 border-on-background">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="material-symbols-outlined text-primary text-3xl font-black">explore</span>
              <span className="bg-primary-fixed text-on-background font-mono font-black text-xs px-3 py-1 border-2 border-on-background uppercase tracking-wider">
                {selectedCity === 'All Cities' ? 'EXPLORE ALL CITIES' : `SHOWS IN ${selectedCity.toUpperCase()}`}
              </span>
            </div>
            <h2 className="font-display-xl text-3xl sm:text-5xl md:text-6xl font-black text-on-background uppercase tracking-tight leading-none">
              WHAT DO U WANNA EXPLORE TODAY?
            </h2>
            <p className="font-data-label text-xs sm:text-sm uppercase text-on-surface-variant font-bold mt-2">
              Select a category below to browse verified live events in {selectedCity}.
            </p>
          </div>

          <div className="bg-surface border-4 border-on-background p-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-xs shrink-0">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase block font-bold">CURRENT LOCATION</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-primary text-2xl font-black">location_on</span>
              <span className="font-headline-lg text-lg uppercase font-black text-on-background">{selectedCity}</span>
            </div>
          </div>
        </div>

        {/* 4 Enhanced Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/events?type=${cat.id}`)}
              className="bg-surface border-4 border-on-background p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex flex-col justify-between min-h-[300px] group relative overflow-hidden"
            >
              {/* Category Top Bar */}
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 border-4 border-on-background ${cat.accentColor} flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0`}>
                    <span className="material-symbols-outlined text-3xl font-black">{cat.icon}</span>
                  </div>

                  <span className="bg-on-background text-on-primary font-mono text-xs uppercase px-3 py-1.5 border-2 border-on-background font-bold tracking-wider group-hover:bg-primary-fixed group-hover:text-on-background transition-colors">
                    {cat.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="font-display-xl text-3xl sm:text-4xl uppercase text-on-background font-black tracking-tight mb-1 group-hover:text-primary transition-colors">
                  {cat.title}
                </h3>

                <p className="font-headline-lg text-xs sm:text-sm uppercase text-on-surface-variant font-bold mb-3">
                  {cat.subtitle}
                </p>

                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold leading-relaxed">
                  {cat.description}
                </p>
              </div>

              {/* Action Link Footer */}
              <div className="mt-8 pt-4 border-t-4 border-on-background flex justify-between items-center bg-surface-variant/30 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 px-6 sm:px-8 py-4 group-hover:bg-primary-container/20 transition-colors">
                <span className="font-headline-lg text-xs sm:text-sm uppercase font-black text-on-background flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  EXPLORE {cat.title} SHOWS
                </span>

                <div className="w-10 h-10 bg-on-background text-on-primary flex items-center justify-center border-2 border-on-background group-hover:bg-primary-fixed group-hover:text-on-background transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="material-symbols-outlined text-xl font-black">arrow_forward</span>
                </div>
              </div>

              {/* Decorative Corner Accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-on-background/5 transform rotate-45 translate-x-12 -translate-y-12 pointer-events-none"></div>
            </div>
          ))}
        </div>

      </section>
    </div>
  );
}
