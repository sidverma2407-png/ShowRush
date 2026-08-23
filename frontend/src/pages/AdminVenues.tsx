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
  const [savingLayout, setSavingLayout] = useState(false);

  // Editor State
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(16);
  const [grid, setGrid] = useState<any[][]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('empty');
  const [paintMode, setPaintMode] = useState<'cell' | 'row' | 'col'>('cell');
  const [isMouseDown, setIsMouseDown] = useState(false);

  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const loadVenues = async () => {
    try {
      const res = await fetchApi('/venues');
      setVenues(res.data);
      if (selectedVenue) {
        const updated = res.data.find((v: any) => v.id === selectedVenue.id);
        if (updated) setSelectedVenue(updated);
      }
    } catch (err) {
      console.error('Failed to fetch venues:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetchApi('/seat-categories');
      setCategories(res.data);
      if (res.data.length > 0 && activeCategory === 'empty') {
        setActiveCategory(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchApi('/venues').then(res => {
        setVenues(res.data);
        if (res.data.length > 0 && !selectedVenue) {
          handleSelectVenue(res.data[0]);
        }
      }),
      fetchApi('/seat-categories').then(res => {
        setCategories(res.data);
        if (res.data.length > 0) setActiveCategory(res.data[0].id);
      })
    ]).finally(() => setLoading(false));
  }, []);

  // When a venue is selected, load its real existing layout from database
  const handleSelectVenue = (venue: any) => {
    setSelectedVenue(venue);
    
    if (venue.seats && venue.seats.length > 0) {
      // Find max row and max seat number
      let maxRowIdx = 0;
      let maxSeatNum = 0;

      venue.seats.forEach((s: any) => {
        const rIdx = rowLabels.indexOf(s.row_label.toUpperCase());
        if (rIdx > maxRowIdx) maxRowIdx = rIdx;
        if (s.seat_number > maxSeatNum) maxSeatNum = s.seat_number;
      });

      const numRows = Math.max(maxRowIdx + 1, 8);
      const numCols = Math.max(maxSeatNum + 2, 12);
      setGridRows(numRows);
      setGridCols(numCols);

      // Populate grid with actual seats
      const newGrid: any[][] = [];
      for (let r = 0; r < numRows; r++) {
        const row = [];
        const rLabel = rowLabels[r] || `R${r + 1}`;
        for (let c = 0; c < numCols; c++) {
          const seatNum = c + 1;
          const match = venue.seats.find((s: any) => s.row_label === rLabel && s.seat_number === seatNum);
          row.push({ category_id: match ? match.category_id : 'empty' });
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    } else {
      // Clean default grid
      initCleanGrid(10, 16);
    }
  };

  const initCleanGrid = (rCount: number, cCount: number) => {
    setGridRows(rCount);
    setGridCols(cCount);
    const newGrid: any[][] = [];
    for (let r = 0; r < rCount; r++) {
      const row = [];
      for (let c = 0; c < cCount; c++) {
        row.push({ category_id: 'empty' });
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
  };

  // Resize grid dynamically preserving painted cells
  const handleResizeGrid = (newRows: number, newCols: number) => {
    const validRows = Math.max(1, Math.min(30, newRows));
    const validCols = Math.max(1, Math.min(35, newCols));
    setGridRows(validRows);
    setGridCols(validCols);

    const updatedGrid: any[][] = [];
    for (let r = 0; r < validRows; r++) {
      const row = [];
      for (let c = 0; c < validCols; c++) {
        if (grid[r] && grid[r][c]) {
          row.push(grid[r][c]);
        } else {
          row.push({ category_id: 'empty' });
        }
      }
      updatedGrid.push(row);
    }
    setGrid(updatedGrid);
  };

  // Paint cell interaction
  const handleCellClick = (r: number, c: number) => {
    if (paintMode === 'row') {
      fillRow(r, activeCategory);
    } else if (paintMode === 'col') {
      fillCol(c, activeCategory);
    } else {
      const newGrid = [...grid];
      newGrid[r] = [...newGrid[r]];
      newGrid[r][c] = { category_id: activeCategory };
      setGrid(newGrid);
    }
  };

  const handleCellHover = (r: number, c: number) => {
    if (!isMouseDown || paintMode !== 'cell') return;
    const newGrid = [...grid];
    newGrid[r] = [...newGrid[r]];
    newGrid[r][c] = { category_id: activeCategory };
    setGrid(newGrid);
  };

  const fillRow = (r: number, catId: string) => {
    const newGrid = [...grid];
    newGrid[r] = newGrid[r].map(() => ({ category_id: catId }));
    setGrid(newGrid);
  };

  const fillCol = (c: number, catId: string) => {
    const newGrid = grid.map(row => {
      const newRow = [...row];
      newRow[c] = { category_id: catId };
      return newRow;
    });
    setGrid(newGrid);
  };

  // Architectural Layout Presets
  const applyTemplate = (type: 'cinema' | 'stadium' | 'concert' | 'club') => {
    if (categories.length === 0) return alert('Please create seat categories first');

    const vipCat = categories.find(c => c.name.toLowerCase().includes('vip') || c.name.toLowerCase().includes('recliner')) || categories[0];
    const premCat = categories.find(c => c.name.toLowerCase().includes('prem') || c.name.toLowerCase().includes('gold')) || categories[0];
    const stdCat = categories.find(c => c.name.toLowerCase().includes('stand') || c.name.toLowerCase().includes('lower')) || categories[categories.length - 1];

    if (type === 'cinema') {
      // 10 rows x 16 cols with middle aisle at col 7 & 8
      const rCount = 10;
      const cCount = 16;
      setGridRows(rCount);
      setGridCols(cCount);
      const newGrid: any[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row = [];
        let assignedCat = stdCat.id;
        if (r < 2) assignedCat = vipCat.id;
        else if (r < 6) assignedCat = premCat.id;

        for (let c = 0; c < cCount; c++) {
          // Center walkway aisle gap
          if (c === 7 || c === 8) {
            row.push({ category_id: 'empty' });
          } else {
            row.push({ category_id: assignedCat });
          }
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    } else if (type === 'stadium') {
      // 12 rows x 18 cols
      const rCount = 12;
      const cCount = 18;
      setGridRows(rCount);
      setGridCols(cCount);
      const newGrid: any[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row = [];
        let assignedCat = stdCat.id;
        if (r < 3) assignedCat = vipCat.id;
        else if (r < 7) assignedCat = premCat.id;

        for (let c = 0; c < cCount; c++) {
          if (c === 4 || c === 13) {
            row.push({ category_id: 'empty' });
          } else {
            row.push({ category_id: assignedCat });
          }
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    } else if (type === 'concert') {
      // 8 rows x 14 cols (Open Pit in front, seated behind)
      const rCount = 8;
      const cCount = 14;
      setGridRows(rCount);
      setGridCols(cCount);
      const newGrid: any[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row = [];
        let assignedCat = stdCat.id;
        if (r < 3) assignedCat = vipCat.id; // Front VIP Pit
        else if (r < 6) assignedCat = premCat.id; // Golden circle

        for (let c = 0; c < cCount; c++) {
          row.push({ category_id: assignedCat });
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    } else if (type === 'club') {
      // Comedy club / intimate tables
      const rCount = 8;
      const cCount = 12;
      setGridRows(rCount);
      setGridCols(cCount);
      const newGrid: any[][] = [];
      for (let r = 0; r < rCount; r++) {
        const row = [];
        for (let c = 0; c < cCount; c++) {
          if (c % 3 === 2) {
            row.push({ category_id: 'empty' }); // Walkways
          } else {
            row.push({ category_id: r < 3 ? premCat.id : stdCat.id });
          }
        }
        newGrid.push(row);
      }
      setGrid(newGrid);
    }
  };

  const handleCreateVenue = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/venues', {
        method: 'POST',
        body: JSON.stringify({ name, address })
      });
      setName('');
      setAddress('');
      await loadVenues();
      handleSelectVenue(res.data);
      alert('Venue created successfully! You can now design its seat layout.');
    } catch (err: any) {
      alert(err.message || 'Failed to create venue');
    }
  };

  const handleDeleteVenue = async (vId: string, vName: string) => {
    if (!confirm(`Are you sure you want to delete "${vName}" and its seat layout?`)) return;
    try {
      await fetchApi(`/venues/${vId}`, { method: 'DELETE' });
      alert('Venue deleted successfully.');
      setSelectedVenue(null);
      loadVenues();
    } catch (err: any) {
      alert(err.message || 'Cannot delete venue in use.');
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

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Delete seat category "${catName}"?`)) return;
    try {
      await fetchApi(`/seat-categories/${catId}`, { method: 'DELETE' });
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleSaveMap = async () => {
    if (!selectedVenue) return alert('Select a venue first');
    
    // Construct serialized seats array
    const seatsToCreate: any[] = [];
    
    for (let r = 0; r < gridRows; r++) {
      let seatNumber = 1;
      const rowLabel = rowLabels[r] || `R${r + 1}`;
      
      for (let c = 0; c < gridCols; c++) {
        if (grid[r] && grid[r][c] && grid[r][c].category_id !== 'empty') {
          seatsToCreate.push({
            row_label: rowLabel,
            seat_number: seatNumber++,
            category_id: grid[r][c].category_id
          });
        }
      }
    }

    if (seatsToCreate.length === 0) {
      return alert('No seats defined! Please paint some seats on the grid before saving.');
    }

    setSavingLayout(true);
    try {
      await fetchApi(`/venues/${selectedVenue.id}/seats`, {
        method: 'POST',
        body: JSON.stringify({ seats: seatsToCreate })
      });
      alert(`🎉 Success! Saved ${seatsToCreate.length} seats for ${selectedVenue.name}`);
      loadVenues();
    } catch (err: any) {
      alert(err.message || 'Failed to save venue map');
    } finally {
      setSavingLayout(false);
    }
  };

  // Color helper
  const getCategoryColor = (catId: string) => {
    if (catId === 'empty') return 'bg-stone-200 border-stone-300 text-transparent hover:border-black';
    const cat = categories.find(c => c.id === catId);
    if (!cat) return 'bg-primary-fixed text-on-background font-black border-black';
    const n = cat.name.toLowerCase();
    if (n.includes('vip') || n.includes('recliner') || n.includes('lounge')) return 'bg-amber-300 text-amber-950 font-black border-black';
    if (n.includes('prem') || n.includes('gold') || n.includes('imax')) return 'bg-cyan-300 text-cyan-950 font-black border-black';
    if (n.includes('upper') || n.includes('club') || n.includes('circle')) return 'bg-purple-300 text-purple-950 font-black border-black';
    return 'bg-emerald-300 text-emerald-950 font-black border-black';
  };

  // Calculate live statistics
  const stats = (() => {
    let totalSeats = 0;
    const catCounts: Record<string, number> = {};
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.category_id !== 'empty') {
          totalSeats++;
          catCounts[cell.category_id] = (catCounts[cell.category_id] || 0) + 1;
        }
      });
    });
    return { totalSeats, catCounts };
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-primary-container text-on-background border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] px-8 py-6">
          <p className="font-display-xl text-2xl uppercase font-black">Loading Venue Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full bg-background min-h-screen pb-16"
      onMouseUp={() => setIsMouseDown(false)}
    >
      {/* Header Banner */}
      <section className="bg-on-background py-6 px-4 md:px-margin-desktop border-b-4 border-on-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-primary-fixed text-on-background font-mono text-xs font-black px-2 py-0.5 border border-primary-fixed uppercase tracking-wider">
                ADMIN CONSOLE
              </span>
              <span className="text-on-primary/70 font-mono text-xs font-bold">
                PRO SEATING ARCHITECT
              </span>
            </div>
            <h1 className="font-display-xl text-3xl sm:text-5xl text-on-primary uppercase font-black leading-none">
              VENUE BUILDER & SEAT STUDIO
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {selectedVenue && (
              <div className="bg-primary-fixed text-on-background px-3 py-1.5 border-2 border-black font-mono text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                ACTIVE: {selectedVenue.name} ({stats.totalSeats} SEATS)
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Studio Workspace */}
      <section className="max-w-7xl mx-auto px-4 md:px-margin-desktop py-6 flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar: Venues & Categories Management */}
        <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0">
          
          {/* 1. Venue List Selector */}
          <div className="bg-surface border-4 border-on-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-3 border-b-2 border-on-background pb-2">
              <h2 className="font-headline-lg text-base uppercase font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">stadium</span>
                Venues ({venues.length})
              </h2>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
              {venues.map(v => {
                const isSelected = selectedVenue?.id === v.id;
                const seatCount = v._count?.seats || v.seats?.length || 0;
                return (
                  <div 
                    key={v.id} 
                    onClick={() => handleSelectVenue(v)}
                    className={`border-2 border-on-background p-2.5 cursor-pointer transition-all flex justify-between items-center gap-2 ${
                      isSelected 
                        ? 'bg-primary-fixed text-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5' 
                        : 'bg-surface hover:bg-surface-variant'
                    }`}
                  >
                    <div className="min-w-0">
                      <h3 className="font-headline-lg text-xs uppercase font-black truncate">{v.name}</h3>
                      <p className="font-data-label text-[10px] uppercase text-on-surface-variant truncate font-bold">{v.address}</p>
                      <span className="font-mono text-[9px] font-black bg-black text-white px-1 py-0.2 inline-block mt-1">
                        {seatCount} SEATS CONFIGURED
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVenue(v.id, v.name);
                      }}
                      title="Delete Venue"
                      className="w-7 h-7 bg-white hover:bg-error hover:text-white border border-on-background flex items-center justify-center shrink-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                );
              })}

              {venues.length === 0 && (
                <div className="text-center p-4 font-data-label text-xs uppercase opacity-60">
                  No venues found. Create one below!
                </div>
              )}
            </div>
          </div>

          {/* 2. Add New Venue Form */}
          <div className="bg-surface border-4 border-on-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-headline-lg text-base uppercase mb-3 border-b-2 border-on-background pb-2 font-black flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">add_business</span>
              Add New Venue
            </h2>
            <form onSubmit={handleCreateVenue} className="flex flex-col gap-3">
              <div>
                <label className="font-data-label text-[10px] uppercase block mb-1 font-black">Venue Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="E.G. INOX MEGATHREATRE"
                  className="w-full bg-surface-lowest border-2 border-on-background p-2 font-data-label text-xs font-bold focus:outline-none min-h-[38px]"
                  required
                />
              </div>
              <div>
                <label className="font-data-label text-[10px] uppercase block mb-1 font-black">Address & City</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="E.G. BANDRA WEST, MUMBAI"
                  className="w-full bg-surface-lowest border-2 border-on-background p-2 font-data-label text-xs font-bold focus:outline-none min-h-[38px]"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="bg-primary-fixed text-on-background border-2 border-on-background p-2.5 font-headline-lg text-xs uppercase font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-colors min-h-[40px]"
              >
                + Create Venue
              </button>
            </form>
          </div>

          {/* 3. Seat Categories Manager */}
          <div className="bg-surface border-4 border-on-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-3 border-b-2 border-on-background pb-2">
              <h2 className="font-headline-lg text-base uppercase font-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">category</span>
                Seat Categories ({categories.length})
              </h2>
            </div>
            
            <form onSubmit={handleCreateCategory} className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={categoryName} 
                onChange={e => setCategoryName(e.target.value)} 
                placeholder="E.G. EXECUTIVE RECLINER"
                className="flex-1 bg-surface-lowest border-2 border-on-background p-2 font-data-label text-xs font-bold focus:outline-none min-h-[38px]"
                required
              />
              <button 
                type="submit" 
                disabled={creatingCategory || !categoryName.trim()}
                className="bg-on-background text-primary-fixed border-2 border-on-background px-3 font-headline-lg text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-background transition-colors disabled:opacity-50 min-h-[38px] shrink-0"
              >
                + Add
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 bg-surface-lowest border-2 border-on-background/30">
              {categories.map(cat => (
                <div 
                  key={cat.id} 
                  className={`px-2 py-1 border flex items-center gap-1.5 font-mono text-[10px] font-black uppercase ${getCategoryColor(cat.id)}`}
                >
                  <span>{cat.name}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="hover:text-red-600 font-bold ml-1 cursor-pointer"
                    title="Delete Category"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Studio Canvas: Interactive Layout Architect */}
        <div className="flex-1 bg-surface border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col min-w-0">
          
          {/* Top Control Bar */}
          <div className="bg-surface-variant border-b-4 border-on-background p-4 flex flex-col gap-4">
            
            {/* Header info & Save */}
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-headline-lg text-lg sm:text-xl uppercase font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-primary">draw</span>
                  {selectedVenue ? selectedVenue.name : 'Select a Venue'}
                </h2>
                <p className="font-data-label text-xs uppercase text-on-surface-variant font-bold">
                  {selectedVenue ? selectedVenue.address : 'Select from left sidebar to begin'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => initCleanGrid(gridRows, gridCols)}
                  disabled={!selectedVenue}
                  className="bg-surface text-on-surface border-2 border-on-background px-3 py-2 font-headline-lg text-xs uppercase font-bold hover:bg-error hover:text-white transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  Clear Grid
                </button>
                <button
                  onClick={handleSaveMap}
                  disabled={!selectedVenue || savingLayout}
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-5 py-2 font-headline-lg text-xs uppercase font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-all disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base font-black">save</span>
                  <span>{savingLayout ? 'Saving Layout...' : 'Save Venue Layout'}</span>
                </button>
              </div>
            </div>

            {/* Quick Architectural Templates & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t-2 border-on-background/20 pt-3">
              
              {/* Preset Templates */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-data-label text-[10px] uppercase font-black tracking-wider text-on-background shrink-0">
                  ⚡ Presets:
                </span>
                <button
                  onClick={() => applyTemplate('cinema')}
                  disabled={!selectedVenue}
                  className="bg-surface hover:bg-primary-fixed border border-on-background px-2.5 py-1 font-data-label text-[10px] uppercase font-black disabled:opacity-50 transition-colors cursor-pointer"
                >
                  🎬 Cinema
                </button>
                <button
                  onClick={() => applyTemplate('stadium')}
                  disabled={!selectedVenue}
                  className="bg-surface hover:bg-primary-fixed border border-on-background px-2.5 py-1 font-data-label text-[10px] uppercase font-black disabled:opacity-50 transition-colors cursor-pointer"
                >
                  🏟️ Stadium
                </button>
                <button
                  onClick={() => applyTemplate('concert')}
                  disabled={!selectedVenue}
                  className="bg-surface hover:bg-primary-fixed border border-on-background px-2.5 py-1 font-data-label text-[10px] uppercase font-black disabled:opacity-50 transition-colors cursor-pointer"
                >
                  🎸 Concert
                </button>
                <button
                  onClick={() => applyTemplate('club')}
                  disabled={!selectedVenue}
                  className="bg-surface hover:bg-primary-fixed border border-on-background px-2.5 py-1 font-data-label text-[10px] uppercase font-black disabled:opacity-50 transition-colors cursor-pointer"
                >
                  🎭 Club
                </button>
              </div>

              {/* Grid Dimensions & Paint Mode */}
              <div className="flex items-center gap-3 justify-start md:justify-end flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-data-label text-[10px] uppercase font-black">Mode:</span>
                  <div className="flex border border-on-background bg-surface">
                    <button
                      onClick={() => setPaintMode('cell')}
                      className={`px-2 py-0.5 font-data-label text-[10px] uppercase font-black cursor-pointer ${paintMode === 'cell' ? 'bg-black text-white' : ''}`}
                    >
                      Cell
                    </button>
                    <button
                      onClick={() => setPaintMode('row')}
                      className={`px-2 py-0.5 font-data-label text-[10px] uppercase font-black cursor-pointer ${paintMode === 'row' ? 'bg-black text-white' : ''}`}
                    >
                      Row
                    </button>
                    <button
                      onClick={() => setPaintMode('col')}
                      className={`px-2 py-0.5 font-data-label text-[10px] uppercase font-black cursor-pointer ${paintMode === 'col' ? 'bg-black text-white' : ''}`}
                    >
                      Col
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1 font-mono text-xs">
                  <span className="font-bold text-[10px]">R:</span>
                  <input
                    type="number"
                    min={4}
                    max={26}
                    value={gridRows}
                    onChange={e => handleResizeGrid(Number(e.target.value), gridCols)}
                    className="w-12 border border-on-background p-1 bg-surface-lowest text-center font-black"
                  />
                  <span className="font-bold text-[10px]">C:</span>
                  <input
                    type="number"
                    min={6}
                    max={32}
                    value={gridCols}
                    onChange={e => handleResizeGrid(gridRows, Number(e.target.value))}
                    className="w-12 border border-on-background p-1 bg-surface-lowest text-center font-black"
                  />
                </div>
              </div>

            </div>

            {/* Color Palette Palette Toolbar */}
            <div className="flex items-center gap-2 flex-wrap border-t-2 border-on-background/20 pt-3">
              <span className="font-data-label text-[10px] uppercase font-black tracking-wider shrink-0">
                🖌️ Active Brush:
              </span>
              
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 border-2 text-xs font-mono font-black uppercase transition-transform flex items-center gap-1.5 cursor-pointer ${getCategoryColor(cat.id)} ${
                    activeCategory === cat.id ? 'ring-4 ring-black scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="bg-black/20 text-[9px] px-1 py-0.2 rounded font-mono font-black">
                    {stats.catCounts[cat.id] || 0}
                  </span>
                </button>
              ))}

              <button
                onClick={() => setActiveCategory('empty')}
                className={`px-3 py-1.5 border-2 border-on-background bg-stone-100 text-stone-700 text-xs font-mono font-black uppercase transition-transform cursor-pointer ${
                  activeCategory === 'empty' ? 'ring-4 ring-black scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-stone-300 text-black' : 'opacity-80 hover:opacity-100'
                }`}
              >
                🚫 Aisle / Gap
              </button>
            </div>

          </div>

          {/* Seat Layout Visual Canvas */}
          <div className="p-6 blueprint-bg flex-1 flex flex-col items-center justify-start overflow-auto min-h-[500px]">
            
            {selectedVenue ? (
              <div 
                className="w-full max-w-full flex flex-col items-center select-none"
                onMouseDown={() => setIsMouseDown(true)}
              >
                {/* Curved Stage / Screen Indicator */}
                <div className="w-full max-w-xl mb-8 flex flex-col items-center">
                  <div className="w-full h-3 bg-gradient-to-r from-transparent via-primary-fixed to-transparent rounded-t-full shadow-[0_0_15px_rgba(225,237,0,0.5)] border-t-2 border-black"></div>
                  <div className="w-4/5 py-2 bg-on-background text-primary-fixed text-center font-mono text-xs font-black uppercase tracking-[6px] border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    STAGE / CINEMA SCREEN AREA
                  </div>
                  <span className="font-data-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">
                    FRONT OF AUDITORIUM
                  </span>
                </div>

                {/* Interactive Seating Matrix */}
                <div className="bg-surface p-4 border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-auto max-w-full">
                  
                  {/* Column Numbers Header */}
                  <div className="flex items-center gap-1.5 mb-1.5 pl-9 pr-9">
                    {Array.from({ length: gridCols }).map((_, cIdx) => (
                      <div 
                        key={cIdx} 
                        onClick={() => fillCol(cIdx, activeCategory)}
                        title={`Click to paint column ${cIdx + 1}`}
                        className="w-6 sm:w-7 text-center font-mono text-[9px] font-black text-on-surface-variant/80 hover:text-black cursor-pointer hover:bg-stone-200"
                      >
                        {cIdx + 1}
                      </div>
                    ))}
                  </div>

                  {/* Grid Rows with Left/Right Row Labels & Quick Row Fill */}
                  <div className="flex flex-col gap-1.5">
                    {grid.map((row, rIdx) => {
                      const rLabel = rowLabels[rIdx] || `R${rIdx + 1}`;
                      return (
                        <div key={rIdx} className="flex items-center gap-1.5">
                          
                          {/* Left Row Label button (Click to fill entire row) */}
                          <button
                            type="button"
                            onClick={() => fillRow(rIdx, activeCategory)}
                            title={`Click to fill Row ${rLabel} with active brush`}
                            className="w-7 h-6 sm:h-7 bg-on-background text-primary-fixed border border-on-background font-mono text-[10px] font-black flex items-center justify-center hover:bg-primary-fixed hover:text-on-background transition-colors shrink-0 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                          >
                            {rLabel}
                          </button>

                          {/* Row Cells */}
                          <div className="flex gap-1.5">
                            {row.map((cell, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onMouseDown={() => handleCellClick(rIdx, cIdx)}
                                onMouseEnter={() => handleCellHover(rIdx, cIdx)}
                                title={`Row ${rLabel}, Seat ${cIdx + 1}`}
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-t-sm border text-[9px] font-mono font-black flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${getCategoryColor(
                                  cell.category_id
                                )}`}
                              >
                                {cell.category_id !== 'empty' ? cIdx + 1 : ''}
                              </button>
                            ))}
                          </div>

                          {/* Right Row Label */}
                          <button
                            type="button"
                            onClick={() => fillRow(rIdx, 'empty')}
                            title={`Click to clear Row ${rLabel}`}
                            className="w-7 h-6 sm:h-7 bg-stone-200 text-stone-700 hover:bg-error hover:text-white border border-on-background font-mono text-[10px] font-black flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            CLR
                          </button>

                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Summary Footer */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 bg-surface border-2 border-on-background p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] max-w-xl w-full">
                  <div className="font-mono text-xs font-black">
                    TOTAL ACTIVE SEATS: <span className="bg-primary-fixed px-2 py-0.5 border border-black">{stats.totalSeats}</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-on-surface-variant">
                    DIMENSIONS: {gridRows} ROWS × {gridCols} COLUMNS
                  </div>
                </div>

              </div>
            ) : (
              <div className="my-auto text-center p-8 bg-surface border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md">
                <span className="material-symbols-outlined text-5xl text-primary mb-2">apartment</span>
                <h3 className="font-headline-lg text-xl uppercase font-black">No Venue Selected</h3>
                <p className="font-body-md text-xs uppercase font-bold text-on-surface-variant mt-1">
                  Select an existing venue from the left sidebar or create a new venue entry to launch the Seating Architect.
                </p>
              </div>
            )}

          </div>

        </div>

      </section>
    </div>
  );
}
