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
      color: 'bg-amber-400 text-on-background border-amber-600',
      badge: 'CINEMA EXPERIENCE',
      description: 'Experience blockbusters with executive recliners & premium club seating.',
      bgPattern: 'bg-amber-50'
    },
    {
      id: 'comedy',
      title: 'COMEDY',
      subtitle: 'Standup & Roasts',
      icon: 'mic',
      color: 'bg-yellow-300 text-on-background border-yellow-600',
      badge: 'FLAT ₹350 SEATS',
      description: 'Intimate comedy club seating with top national standup artists.',
      bgPattern: 'bg-yellow-50'
    },
    {
      id: 'sports',
      title: 'SPORTS',
      subtitle: 'Cricket & Football',
      icon: 'stadium',
      color: 'bg-emerald-400 text-on-background border-emerald-700',
      badge: 'STADIUM ATMOSPHERE',
      description: 'Central 30-yard pitch views & VIP pavilion suite boxes.',
      bgPattern: 'bg-emerald-50'
    },
    {
      id: 'concert',
      title: 'CONCERTS',
      subtitle: '360° Live Music',
      icon: 'graphic_eq',
      color: 'bg-cyan-400 text-on-background border-cyan-700',
      badge: 'VIP STAGE ACCESS',
      description: 'Front-row VIP pit standing & 360-degree stadium sound stages.',
      bgPattern: 'bg-cyan-50'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-background selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Hero Exploration Banner */}
      <section className="w-full bg-on-background py-16 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-primary-fixed text-4xl animate-bounce">explore</span>
              <span className="bg-primary-fixed text-on-primary-fixed font-data-label text-data-label uppercase px-3 py-1 border-2 border-on-background font-black">
                {selectedCity === 'All Cities' ? 'EXPLORE INDIA' : `IN ${selectedCity.toUpperCase()}`}
              </span>
            </div>
            <h1 className="font-display-xl text-5xl md:text-7xl font-black text-primary-fixed uppercase tracking-tight leading-none mb-2">
              WHAT DO U WANNA <br className="hidden md:block" /> EXPLORE TODAY?
            </h1>
            <p className="font-data-label text-data-label uppercase text-surface-container font-bold max-w-xl">
              PICK A CATEGORY BELOW TO DISCOVER LIVE SHOWS, CONCERTS, COMEDY CLUBS & STADIUM MATCHES IN {selectedCity.toUpperCase()}.
            </p>
          </div>

          <div className="bg-surface border-4 border-on-background p-4 neo-brutalism-shadow max-w-xs">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase block font-bold">CURRENT LOCATION</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-primary-fixed text-2xl font-black">location_on</span>
              <span className="font-headline-lg-mobile text-xl uppercase font-black text-on-surface">{selectedCity}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Primary Category Cards */}
      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigate(`/events?type=${cat.id}`)}
              className={`p-8 border-4 border-on-background ${cat.bgPattern} neo-brutalist-shadow neo-brutalist-hover transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[280px]`}
            >
              {/* Badge Header */}
              <div className="flex justify-between items-start mb-6">
                <div className={`w-16 h-16 border-4 border-on-background ${cat.color} flex items-center justify-center neo-brutalism-shadow group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-3xl font-black">{cat.icon}</span>
                </div>
                <span className="bg-on-background text-on-primary font-mono text-xs uppercase px-3 py-1.5 border-2 border-on-background font-bold tracking-wider">
                  {cat.badge}
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="font-display-xl text-3xl md:text-4xl uppercase text-on-background font-black tracking-tight mb-1 group-hover:text-primary-fixed transition-colors">
                  {cat.title}
                </h2>
                <p className="font-headline-lg-mobile text-sm uppercase text-on-surface-variant font-bold mb-3">
                  {cat.subtitle}
                </p>
                <p className="font-data-label text-xs uppercase text-on-surface-variant font-bold leading-relaxed">
                  {cat.description}
                </p>
              </div>

              {/* Action Link Footer */}
              <div className="mt-6 pt-4 border-t-2 border-on-background flex justify-between items-center">
                <span className="font-headline-lg-mobile text-sm uppercase font-black text-on-background flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  EXPLORE {cat.title}
                </span>
                <div className="w-10 h-10 bg-on-background text-primary-container flex items-center justify-center border-2 border-on-background group-hover:bg-primary-fixed group-hover:text-on-background transition-colors">
                  <span className="material-symbols-outlined text-xl font-black">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
