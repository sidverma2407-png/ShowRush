import { useState } from 'react';

interface CitySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export const CITIES = [
  { name: 'All Cities', icon: 'travel_explore', tag: 'ALL INDIA', desc: 'Browse all events across India' },
  { name: 'Delhi NCR', icon: 'location_city', tag: 'CAPITAL', desc: 'Delhi, Gurgaon, Noida' },
  { name: 'Mumbai', icon: 'movie_filter', tag: 'MAHARASHTRA', desc: 'Film City & Live Clubs' },
  { name: 'Bengaluru', icon: 'memory', tag: 'KARNATAKA', desc: 'Tech Hub & Arenas' },
  { name: 'Pune', icon: 'apartment', tag: 'MAHARASHTRA', desc: 'Cultural & Comedy Hub' },
  { name: 'Vellore', icon: 'school', tag: 'TAMIL NADU', desc: 'Campus & Live Shows' },
  { name: 'Noida', icon: 'domain', tag: 'UTTAR PRADESH', desc: 'NCR Arenas & Multiplexes' },
  { name: 'Chennai', icon: 'theater_comedy', tag: 'TAMIL NADU', desc: 'Music & Theater' },
  { name: 'Hyderabad', icon: 'sports_cricket', tag: 'TELANGANA', desc: 'Stadiums & IMAX' }
];

export default function CitySelectModal({ isOpen, onClose, selectedCity, onSelectCity }: CitySelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredCities = CITIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full p-5 sm:p-7 relative flex flex-col max-h-[90vh]">
        
        {/* Top Header Bar */}
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-fixed border-3 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-on-background shrink-0">
              <span className="material-symbols-outlined text-2xl font-black">location_on</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-black text-primary-fixed font-mono text-[10px] font-black px-2 py-0.5 uppercase tracking-wider border border-black">
                  LOCATION SWITCHER
                </span>
              </div>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-black font-black leading-none mt-1 tracking-tight">
                SELECT YOUR CITY
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="bg-red-500 text-white border-3 border-black w-10 h-10 flex items-center justify-center font-black hover:bg-black hover:text-red-400 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl font-black">close</span>
          </button>
        </div>

        {/* Quick Search Bar */}
        <div className="relative mb-4">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-black font-black text-lg">search</span>
          <input 
            type="text"
            placeholder="TYPE CITY NAME OR STATE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border-3 border-black pl-10 pr-8 py-2.5 font-mono text-xs font-bold text-black uppercase placeholder:text-slate-500 focus:outline-none focus:bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[44px]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-black font-black text-xs hover:text-red-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* City Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-4 overflow-y-auto pr-1 max-h-[52vh] scrollbar-thin">
          {filteredCities.map((city) => {
            const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
            return (
              <button
                key={city.name}
                onClick={() => {
                  onSelectCity(city.name);
                  onClose();
                }}
                className={`p-3.5 border-3 border-black text-left flex flex-col justify-between transition-all relative group cursor-pointer ${
                  isSelected
                    ? 'bg-primary-fixed text-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-1 z-10'
                    : 'bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-primary-fixed/20 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]'
                }`}
              >
                {/* Top Badge & Icon */}
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-9 h-9 border-2 border-black flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-black text-primary-fixed' : 'bg-slate-100 text-black group-hover:bg-black group-hover:text-primary-fixed'
                  }`}>
                    <span className="material-symbols-outlined text-xl font-black">
                      {city.icon}
                    </span>
                  </div>

                  <span className={`font-mono text-[9px] px-1.5 py-0.5 border border-black uppercase font-black ${
                    isSelected ? 'bg-black text-white' : 'bg-slate-200 text-black'
                  }`}>
                    {city.tag}
                  </span>
                </div>

                {/* City Name & Status */}
                <div>
                  <h3 className="font-display-xl text-base uppercase font-black tracking-tight leading-tight text-black">
                    {city.name}
                  </h3>
                  <p className="font-mono text-[10px] text-slate-700 font-bold uppercase mt-0.5 line-clamp-1">
                    {city.desc}
                  </p>
                  
                  <div className="mt-2.5 pt-2 border-t border-black/20 flex items-center justify-between">
                    <span className={`font-mono text-[10px] uppercase font-black flex items-center gap-1 ${
                      isSelected ? 'text-black' : 'text-slate-600 group-hover:text-black'
                    }`}>
                      {isSelected ? (
                        <>
                          <span className="material-symbols-outlined text-xs text-black font-black">check_circle</span>
                          <span>ACTIVE LOCATION</span>
                        </>
                      ) : (
                        <span>SELECT CITY →</span>
                      )}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {filteredCities.length === 0 && (
            <div className="col-span-full p-8 border-3 border-black bg-slate-100 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl font-black text-slate-500">search_off</span>
              <p className="font-mono text-xs font-black uppercase text-black">NO CITIES FOUND MATCHING "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-2 bg-primary-fixed text-on-background border-2 border-black px-4 py-1.5 font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-primary-fixed"
              >
                Clear Search Filter
              </button>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-black text-white border-3 border-black p-3 flex flex-wrap items-center justify-between text-xs font-mono uppercase gap-2">
          <span className="flex items-center gap-1.5 font-bold text-[11px]">
            <span className="material-symbols-outlined text-primary-fixed text-sm font-black">verified</span>
            SHOWS & SEATS UPDATED REAL-TIME PER CITY
          </span>
          <span className="bg-primary-fixed text-on-background px-2.5 py-0.5 font-black text-[10px]">
            SEATZY INDIA
          </span>
        </div>
      </div>
    </div>
  );
}
