import { useEffect, useState, type FormEvent } from 'react';
import { fetchApi } from '../api/client';

export default function AdminVenues() {
  const [venues, setVenues] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  // Editor State
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(15);
  const [grid, setGrid] = useState<any[][]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('empty');

  const loadVenues = () => {
    fetchApi('/venues')
      .then(res => setVenues(res.data))
      .catch(err => console.error('Failed to fetch venues:', err));
  };

  useEffect(() => {
    Promise.all([
      fetchApi('/venues').then(res => setVenues(res.data)),
      fetchApi('/seat-categories').then(res => setCategories(res.data))
    ]).finally(() => setLoading(false));
  }, []);

  const handleCreateVenue = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/venues', {
        method: 'POST',
        body: JSON.stringify({ name, address })
      });
      setName('');
      setAddress('');
      loadVenues();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Generate grid
  useEffect(() => {
    const newGrid: any[][] = [];
    for (let r = 0; r < gridRows; r++) {
      const row = [];
      for (let c = 0; c < gridCols; c++) {
        row.push({ category_id: 'empty' });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  }, [gridRows, gridCols]);

  const handleCellClick = (r: number, c: number) => {
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = { category_id: activeCategory };
    setGrid(newGrid);
  };

  const handleSaveMap = async () => {
    if (!selectedVenue) return alert('Select a venue first');
    
    // Construct seats array
    const seatsToCreate: any[] = [];
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let r = 0; r < gridRows; r++) {
      let seatNumber = 1;
      for (let c = 0; c < gridCols; c++) {
        if (grid[r][c].category_id !== 'empty') {
          // get row label like A, B, C... AA, AB...
          let rowLabel = '';
          let tempR = r;
          do {
            rowLabel = rowLabels[tempR % 26] + rowLabel;
            tempR = Math.floor(tempR / 26) - 1;
          } while (tempR >= 0);

          seatsToCreate.push({
            row_label: rowLabel,
            seat_number: seatNumber++,
            category_id: grid[r][c].category_id
          });
        }
      }
    }

    if (seatsToCreate.length === 0) return alert('No seats defined on the map!');

    try {
      const res = await fetchApi(`/venues/${selectedVenue.id}/seats`, {
        method: 'POST',
        body: JSON.stringify({ seats: seatsToCreate })
      });
      alert(`Map saved successfully! Created ${res.data.count} seats.`);
      setSelectedVenue(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getCategoryColor = (catId: string) => {
    if (catId === 'empty') return 'bg-background';
    // Generate some consistent color based on ID or just use cycle
    const colors = ['bg-tertiary-fixed', 'bg-inverse-primary', 'bg-secondary-container', 'bg-primary-container'];
    const idx = categories.findIndex(c => c.id === catId) % colors.length;
    return colors[idx] || 'bg-on-tertiary';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-primary-container text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8">
        <p className="font-display-xl text-4xl uppercase tracking-tighter">Loading Builder...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <section className="bg-on-background py-8 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
             <h1 className="font-display-xl text-display-xl text-primary-fixed uppercase leading-none break-words">
              VENUE<br />BUILDER
             </h1>
          </div>
          <div className="bg-surface text-on-surface border-2 border-on-background px-4 py-2 font-data-label text-data-label uppercase">
             ADMIN PRIVILEGES ACTIVE
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col xl:flex-row gap-gutter">
        <div className="w-full xl:w-1/3 flex flex-col gap-8">
          
          <div className="bg-surface border-border-width border-on-background p-6 neo-brutalist-shadow">
            <h2 className="font-headline-lg-mobile text-xl uppercase mb-6 bg-on-background text-on-primary px-2 py-1 inline-block">New Venue</h2>
            <form onSubmit={handleCreateVenue} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Venue Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-surface-container border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed transition-colors"
                  placeholder="E.G. THE FORUM"
                  required 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Address</label>
                <input 
                  type="text" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-surface-container border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed transition-colors"
                  placeholder="E.G. 123 MAIN ST"
                  required 
                />
              </div>
              <button type="submit" className="w-full bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg-mobile text-sm uppercase mt-4 hover:bg-on-background hover:text-primary-fixed transition-colors">
                CREATE VENUE
              </button>
            </form>
          </div>

          <div className="bg-surface border-border-width border-on-background flex flex-col neo-brutalist-shadow h-[400px]">
            <div className="bg-surface-variant border-b-4 border-on-background p-4 flex justify-between items-center">
               <h3 className="font-data-label text-data-label uppercase font-black">Existing Venues</h3>
               <span className="font-data-label text-data-label bg-on-background text-on-primary px-2">{venues.length}</span>
            </div>
            <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-4">
               {venues.map(v => (
                 <div 
                   key={v.id} 
                   onClick={() => setSelectedVenue(v)}
                   className={`border-2 border-on-background p-4 cursor-pointer hover:bg-primary-container transition-colors group ${selectedVenue?.id === v.id ? 'bg-primary-container' : ''}`}
                 >
                    <h4 className="font-headline-lg-mobile text-lg uppercase mb-1">{v.name}</h4>
                    <p className="font-data-label text-xs uppercase text-on-surface-variant group-hover:text-on-background transition-colors">{v.address}</p>
                 </div>
               ))}
               {venues.length === 0 && (
                 <div className="text-center p-4 font-data-label text-data-label uppercase opacity-50">
                   No venues exist
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="w-full xl:w-2/3 bg-surface border-border-width border-on-background flex flex-col neo-brutalist-shadow">
           <div className="bg-surface-variant border-b-4 border-on-background p-4 flex justify-between items-center">
              <h3 className="font-data-label text-data-label uppercase font-black">Seat Editor {selectedVenue ? `- ${selectedVenue.name}` : ''}</h3>
              <div className="flex gap-2">
                <button onClick={() => {
                  setGrid(grid.map(row => row.map(() => ({category_id: 'empty'}))));
                }} className="bg-surface text-on-surface border-2 border-on-background px-3 py-1 font-data-label text-xs uppercase hover:bg-error hover:text-on-error transition-colors">Clear</button>
                <button onClick={handleSaveMap} disabled={!selectedVenue} className="bg-on-background text-on-primary border-2 border-on-background px-3 py-1 font-data-label text-xs uppercase disabled:opacity-50">Save Map</button>
              </div>
           </div>

           <div className="flex-grow p-8 flex flex-col relative blueprint-bg min-h-[500px]">
              
              <div className="absolute top-4 left-4 bg-surface border-2 border-on-background p-3 flex flex-col gap-3 z-10">
                 <span className="font-data-label text-xs uppercase font-bold border-b-2 border-on-background pb-1">Categories</span>
                 {categories.map(cat => (
                   <button 
                     key={cat.id} 
                     onClick={() => setActiveCategory(cat.id)}
                     className={`w-full text-left font-data-label text-xs uppercase p-1 border-2 border-on-background hover:-translate-y-1 transition-transform ${activeCategory === cat.id ? 'ring-2 ring-offset-1 ring-on-background' : ''} ${getCategoryColor(cat.id)}`}
                     title={cat.name}
                   >
                     {cat.name.substring(0, 3)}
                   </button>
                 ))}
                 <button 
                   onClick={() => setActiveCategory('empty')}
                   className={`w-full text-left font-data-label text-xs uppercase p-1 border-2 border-on-background bg-background hover:-translate-y-1 transition-transform ${activeCategory === 'empty' ? 'ring-2 ring-offset-1 ring-on-background' : ''}`}
                   title="Empty Space"
                 >
                   CLR
                 </button>
              </div>

              <div className="absolute top-4 right-4 bg-surface border-2 border-on-background p-3 flex flex-col gap-3 z-10 w-32">
                 <span className="font-data-label text-xs uppercase font-bold border-b-2 border-on-background pb-1">Dimensions</span>
                 <div>
                   <label className="font-data-label text-xs block mb-1">ROWS</label>
                   <input type="number" value={gridRows} onChange={e => setGridRows(Number(e.target.value))} className="w-full border-2 border-on-background px-2" min={1} max={50} />
                 </div>
                 <div>
                   <label className="font-data-label text-xs block mb-1">COLUMNS</label>
                   <input type="number" value={gridCols} onChange={e => setGridCols(Number(e.target.value))} className="w-full border-2 border-on-background px-2" min={1} max={50} />
                 </div>
              </div>

              <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center flex-grow mt-12 pl-16">
                 {selectedVenue ? (
                   <>
                     <div className="stage-area w-full max-w-md mb-12 shadow-[8px_8px_0px_0px_rgba(27,27,27,1)]">STAGE</div>
                     <div className="flex flex-col gap-1 overflow-auto max-h-[50vh] p-4 bg-surface border-4 border-on-background neo-brutalist-shadow">
                       {grid.map((row, rIdx) => (
                         <div key={rIdx} className="flex gap-1">
                           {row.map((cell, cIdx) => (
                             <button
                               key={cIdx}
                               onMouseDown={() => handleCellClick(rIdx, cIdx)}
                               onMouseEnter={(e) => {
                                 if (e.buttons === 1) handleCellClick(rIdx, cIdx); // drag to paint
                               }}
                               className={`w-6 h-6 border border-on-background ${getCategoryColor(cell.category_id)}`}
                             />
                           ))}
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="text-center font-data-label text-data-label uppercase bg-surface border-2 border-on-background p-4 inline-block">
                      Select a venue from the list to start building its seat map.
                   </div>
                 )}
              </div>
           </div>
        </div>

      </section>
    </div>
  );
}
