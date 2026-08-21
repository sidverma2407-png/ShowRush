interface CitySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export const CITIES = [
  { name: 'All Cities', icon: 'travel_explore', tag: 'ALL INDIA' },
  { name: 'Delhi NCR', icon: 'location_city', tag: 'CAPITAL' },
  { name: 'Mumbai', icon: 'movie_filter', tag: 'MAHARASHTRA' },
  { name: 'Bengaluru', icon: 'memory', tag: 'KARNATAKA' },
  { name: 'Pune', icon: 'apartment', tag: 'MAHARASHTRA' },
  { name: 'Vellore', icon: 'school', tag: 'TAMIL NADU' },
  { name: 'Noida', icon: 'domain', tag: 'UTTAR PRADESH' },
  { name: 'Chennai', icon: 'theater_comedy', tag: 'TAMIL NADU' },
  { name: 'Kolkata', icon: 'stadium', tag: 'WEST BENGAL' },
  { name: 'Hyderabad', icon: 'sports_cricket', tag: 'TELANGANA' }
];

export default function CitySelectModal({ isOpen, onClose, selectedCity, onSelectCity }: CitySelectModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border-4 border-on-background neo-brutalism-shadow max-w-xl w-full p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-on-background pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed text-3xl font-black">location_on</span>
            <div>
              <h2 className="font-headline-lg-mobile md:font-headline-lg uppercase text-on-surface leading-none font-black">
                SELECT YOUR CITY
              </h2>
              <p className="font-data-label text-[10px] text-on-surface-variant uppercase mt-1 font-bold">
                EXPLORE MOVIES, CONCERTS, COMEDY & SPORTS ACROSS INDIA
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-error text-on-error border-2 border-on-background p-1 hover:bg-red-600 transition-all"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-2xl font-black">close</span>
          </button>
        </div>

        {/* City Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-[60vh] overflow-y-auto pr-1">
          {CITIES.map((city) => {
            const isSelected = selectedCity === city.name;
            return (
              <button
                key={city.name}
                onClick={() => {
                  onSelectCity(city.name);
                  onClose();
                }}
                className={`p-3 border-4 border-on-background text-left flex flex-col justify-between transition-all relative group ${
                  isSelected
                    ? 'bg-primary-fixed text-on-primary-fixed neo-brutalism-shadow translate-x-[-2px] translate-y-[-2px]'
                    : 'bg-surface text-on-surface hover:bg-primary-container hover:translate-x-[-2px] hover:translate-y-[-2px] hover:neo-brutalism-shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-on-primary-fixed' : 'text-primary-fixed group-hover:scale-110'} transition-transform`}>
                    {city.icon}
                  </span>
                  <span className={`font-mono text-[8px] px-1 py-0.5 border border-on-background uppercase font-bold ${isSelected ? 'bg-on-background text-on-primary' : 'bg-surface-container text-on-surface'}`}>
                    {city.tag}
                  </span>
                </div>
                <div>
                  <span className="font-headline-lg-mobile text-xs uppercase font-black block tracking-tight">
                    {city.name}
                  </span>
                  <span className="font-data-label text-[9px] opacity-80 uppercase block mt-0.5 font-bold">
                    {isSelected ? '✓ ACTIVE' : 'SELECT CITY'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="bg-surface-variant border-2 border-on-background p-3 flex items-center justify-between text-xs font-data-label uppercase">
          <span className="flex items-center gap-1 font-bold">
            <span className="material-symbols-outlined text-sm">info</span>
            INDIAN METROS & EDUCATIONAL HUBS
          </span>
          <span className="font-mono text-[10px] bg-primary-fixed text-on-primary-fixed px-2 py-0.5 border border-on-background font-black">
            SEATZY INDIA
          </span>
        </div>
      </div>
    </div>
  );
}
