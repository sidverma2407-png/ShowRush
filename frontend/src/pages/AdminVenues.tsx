import { useEffect, useState, type FormEvent } from 'react';
import { fetchApi } from '../api/client';

export default function AdminVenues() {
  const [venues, setVenues] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
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

  const loadCategories = () => {
    fetchApi('/seat-categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error('Failed to fetch categories:', err));
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

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setCreatingCategory(true);
    try {
      await fetchApi('/seat-categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName.trim() })
      });
      setCategoryName('');
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
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
      await fetchApi(`/venues/${selectedVenue.id}/seats`, {
        method: 'POST',
        body: JSON.stringify({ seats: seatsToCreate })
      });
      alert('Venue seat map updated successfully!');
      loadVenues();
    } catch (err: any) {
      alert(err.message || 'Failed to save venue map');
    }
  };

  const getCategoryColor = (catId: string) => {
    if (catId === 'empty') return 'bg-surface-lowest text-on-surface opacity-30';
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'bg-primary-fixed text-on-background font-bold';
    const name = cat.name.toLowerCase();
    if (name.includes('vip') || name.includes('recliner')) return 'bg-amber-300 text-amber-950 font-black';
    if (name.includes('premium') || name.includes('club')) return 'bg-cyan-300 text-cyan-950 font-black';
    return 'bg-slate-300 text-slate-900 font-bold';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-primary-container text-on-background border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] px-8 py-6">
        <p className="font-display-xl text-2xl sm:text-4xl uppercase tracking-tighter">Loading Builder...</p>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-background min-h-screen pb-12">
      {/* Header */}
      <section className="bg-on-background py-8 px-4 md:px-margin-desktop border-b-2 sm:border-b-4 border-on-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="font-display-xl text-3xl sm:text-5xl md:text-6xl text-on-primary uppercase leading-none break-words font-black">
              VENUE BUILDER
            </h1>
          </div>
          <div className="bg-tertiary-fixed text-on-tertiary-fixed border-2 border-on-background px-3 py-1 font-mono text-xs uppercase font-bold">
            GRID BUILDER CONSOLE
          </div>
        </div>
      </section>

      {/* Main Container */}
      <section className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-6 sm:py-8 flex flex-col xl:flex-row gap-6">
        
        {/* Left Column: Form & List */}
        <div className="w-full xl:w-1/3 flex flex-col gap-6">
          {/* Create Venue Form */}
          <div className="bg-surface border-2 sm:border-4 border-on-background p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-headline-lg text-lg uppercase mb-4 border-b-2 border-on-background pb-2 font-black">Add New Venue</h3>
            <form onSubmit={handleCreateVenue} className="flex flex-col gap-3">
              <div>
                <label className="font-data-label text-xs uppercase block mb-1 font-bold">Venue Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="E.G. INOX METROPOLIS"
                  className="w-full bg-surface-lowest border-2 border-on-background p-2.5 font-data-label text-xs font-bold focus:outline-none min-h-[44px]"
                  required
                />
              </div>
              <div>
                <label className="font-data-label text-xs uppercase block mb-1 font-bold">Address / Location</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="E.G. SECTOR 18, NOIDA"
                  className="w-full bg-surface-lowest border-2 border-on-background p-2.5 font-data-label text-xs font-bold focus:outline-none min-h-[44px]"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="bg-primary-fixed text-on-primary-fixed border-2 border-on-background p-3 font-headline-lg text-xs uppercase font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-colors mt-2 min-h-[44px]"
              >
                Create Venue Entry
              </button>
            </form>
          </div>

          {/* Seat Categories Management */}
          <div className="bg-surface border-2 sm:border-4 border-on-background p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-3 border-b-2 border-on-background pb-2">
              <h3 className="font-headline-lg text-lg uppercase font-black">Seat Categories ({categories.length})</h3>
            </div>
            <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={categoryName} 
                onChange={e => setCategoryName(e.target.value)} 
                placeholder="E.G. VIP RECLINER"
                className="flex-1 bg-surface-lowest border-2 border-on-background p-2 font-data-label text-xs font-bold focus:outline-none min-h-[40px]"
                required
              />
              <button 
                type="submit" 
                disabled={creatingCategory || !categoryName.trim()}
                className="bg-on-background text-primary-fixed border-2 border-on-background px-3 font-headline-lg text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-background transition-colors disabled:opacity-50 min-h-[40px] shrink-0"
              >
                + Add
              </button>
            </form>
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-2 bg-surface-lowest border-2 border-on-background/30">
              {categories.map(cat => (
                <span 
                  key={cat.id} 
                  className={`px-2 py-1 border border-on-background font-mono text-[10px] font-black uppercase ${getCategoryColor(cat.id)}`}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>

          {/* Venues List */}
          <div className="bg-surface border-2 sm:border-4 border-on-background p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-headline-lg text-lg uppercase mb-4 border-b-2 border-on-background pb-2 font-black">Existing Venues ({venues.length})</h3>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
               {venues.map(v => (
                 <div 
                   key={v.id} 
                   onClick={() => setSelectedVenue(v)}
                   className={`border-2 border-on-background p-3 cursor-pointer hover:bg-primary-container transition-colors group ${selectedVenue?.id === v.id ? 'bg-primary-container' : ''}`}
                 >
                    <h4 className="font-headline-lg text-sm sm:text-base uppercase mb-1 font-black">{v.name}</h4>
                    <p className="font-data-label text-xs uppercase text-on-surface-variant group-hover:text-on-background font-bold">{v.address}</p>
                 </div>
               ))}
               {venues.length === 0 && (
                 <div className="text-center p-4 font-data-label text-xs uppercase opacity-60">
                   No venues exist
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Seat Grid Matrix */}
        <div className="w-full xl:w-2/3 bg-surface border-2 sm:border-4 border-on-background flex flex-col shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-w-0">
           <div className="bg-surface-variant border-b-2 sm:border-b-4 border-on-background p-3 sm:p-4 flex flex-wrap gap-2 justify-between items-center">
              <h3 className="font-data-label text-xs sm:text-sm uppercase font-black">Seat Matrix {selectedVenue ? `- ${selectedVenue.name}` : ''}</h3>
              <div className="flex gap-2">
                <button onClick={() => {
                  setGrid(grid.map(row => row.map(() => ({category_id: 'empty'}))));
                }} className="bg-surface text-on-surface border-2 border-on-background px-3 py-1 font-data-label text-xs uppercase font-bold hover:bg-error hover:text-on-error transition-colors min-h-[36px]">Clear</button>
                <button onClick={handleSaveMap} disabled={!selectedVenue} className="bg-on-background text-on-primary border-2 border-on-background px-3 py-1 font-data-label text-xs uppercase font-black disabled:opacity-50 min-h-[36px]">Save Map</button>
              </div>
           </div>

           <div className="flex-grow p-4 sm:p-6 flex flex-col relative blueprint-bg min-h-[450px]">
              
              {/* Category Toolbar */}
              <div className="mb-4 sm:mb-0 sm:absolute sm:top-4 sm:left-4 bg-surface border-2 border-on-background p-3 flex flex-wrap sm:flex-col gap-2 z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                 <span className="font-data-label text-xs uppercase font-bold sm:border-b-2 sm:border-on-background sm:pb-1 w-full">Tool:</span>
                 {categories.map(cat => (
                   <button 
                     key={cat.id} 
                     onClick={() => setActiveCategory(cat.id)}
                     className={`font-data-label text-[11px] uppercase px-2 py-1 border border-on-background ${activeCategory === cat.id ? 'ring-2 ring-on-background font-black' : ''} ${getCategoryColor(cat.id)}`}
                   >
                     {cat.name.substring(0, 4)}
                   </button>
                 ))}
                 <button 
                   onClick={() => setActiveCategory('empty')}
                   className={`font-data-label text-[11px] uppercase px-2 py-1 border border-on-background bg-background ${activeCategory === 'empty' ? 'ring-2 ring-on-background font-black' : ''}`}
                 >
                   CLR
                 </button>
              </div>

              {/* Dimensions Toolbar */}
              <div className="mb-4 sm:mb-0 sm:absolute sm:top-4 sm:right-4 bg-surface border-2 border-on-background p-3 flex gap-3 sm:flex-col z-10 w-full sm:w-32 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                 <span className="font-data-label text-xs uppercase font-bold sm:border-b-2 sm:border-on-background sm:pb-1 w-full">Grid Size</span>
                 <div className="flex items-center gap-1">
                   <label className="font-data-label text-[10px] font-bold">R:</label>
                   <input type="number" value={gridRows} onChange={e => setGridRows(Number(e.target.value))} className="w-full border-2 border-on-background px-1.5 py-0.5 text-xs font-mono font-bold" min={1} max={50} />
                 </div>
                 <div className="flex items-center gap-1">
                   <label className="font-data-label text-[10px] font-bold">C:</label>
                   <input type="number" value={gridCols} onChange={e => setGridCols(Number(e.target.value))} className="w-full border-2 border-on-background px-1.5 py-0.5 text-xs font-mono font-bold" min={1} max={50} />
                 </div>
              </div>

              {/* Bounded Scrollable Grid Matrix */}
              <div className="w-full max-w-full mx-auto flex flex-col items-center justify-center flex-grow mt-2 sm:mt-16 overflow-auto border-2 border-dashed border-on-background/30 p-3 bg-surface/50 rounded-lg">
                 {selectedVenue ? (
                   <>
                     <div className="w-full max-w-md bg-on-background text-primary-fixed py-1.5 text-center font-mono text-xs font-black uppercase tracking-widest mb-6 border-2 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                       STAGE / SCREEN
                     </div>
                     <div className="flex flex-col gap-1 overflow-auto max-h-[60vh] max-w-full p-3 bg-surface border-2 sm:border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                       {grid.map((row, rIdx) => (
                         <div key={rIdx} className="flex gap-1">
                           {row.map((cell, cIdx) => (
                             <button
                               key={cIdx}
                               onMouseDown={() => handleCellClick(rIdx, cIdx)}
                               onMouseEnter={(e) => {
                                 if (e.buttons === 1) handleCellClick(rIdx, cIdx);
                               }}
                               className={`w-6 h-6 sm:w-7 sm:h-7 border border-on-background text-[9px] font-mono font-bold ${getCategoryColor(cell.category_id)} shrink-0`}
                             />
                           ))}
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div className="text-center font-data-label text-xs uppercase bg-surface border-2 border-on-background p-4 inline-block font-bold">
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
