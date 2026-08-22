import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

export default function OrganiserDashboard() {
  const [activeTab, setActiveTab] = useState<'events' | 'venues' | 'analytics'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [seatCategories, setSeatCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createEventModal, setCreateEventModal] = useState(false);
  const [createVenueModal, setCreateVenueModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState<any | null>(null);
  const [addShowModal, setAddShowModal] = useState<any | null>(null);

  // Form states for New Event Creation (Wizard style)
  const [eventStep, setEventStep] = useState(1);
  const [newEventData, setNewEventData] = useState({
    title: '',
    type: 'movie',
    description: '',
    poster_url: '',
    city: 'Delhi',
  });
  const [newShowData, setNewShowData] = useState({
    venue_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    pricing: [] as { category_id: string; category_name: string; price: number }[],
  });

  // Form state for New Venue Creation
  const [newVenueData, setNewVenueData] = useState({
    name: '',
    address: '',
    city: 'Delhi',
    total_rows: 8,
    seats_per_row: 16,
  });

  const INDIAN_CITIES = ['Delhi', 'Noida', 'Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Vellore', 'Hyderabad'];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, venuesRes, categoriesRes] = await Promise.all([
        fetchApi('/organiser/events'),
        fetchApi('/organiser/venues').catch(() => ({ data: [] })),
        fetchApi('/seat-categories').catch(() => ({ data: [] })),
      ]);
      setEvents(eventsRes.data || []);
      setVenues(venuesRes.data || []);
      setSeatCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to load organiser dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update default pricing when venue changes in event wizard
  const handleVenueSelectInWizard = (venueId: string) => {
    const selectedVenue = venues.find(v => v.id === venueId);
    let initialPricing: { category_id: string; category_name: string; price: number }[] = [];

    if (selectedVenue && selectedVenue.seats?.length > 0) {
      // Extract unique categories from venue seats
      const uniqueCats = Array.from(
        new Set(selectedVenue.seats.map((s: any) => s.category_id))
      );
      initialPricing = uniqueCats.map((catId: any) => {
        const seatObj = selectedVenue.seats.find((s: any) => s.category_id === catId);
        const name = seatObj?.category?.name || 'Standard';
        let defaultPrice = 200;
        if (name.toLowerCase().includes('recliner') || name.toLowerCase().includes('vip')) defaultPrice = 450;
        else if (name.toLowerCase().includes('premium') || name.toLowerCase().includes('club')) defaultPrice = 300;
        return { category_id: catId, category_name: name, price: defaultPrice };
      });
    } else {
      // Default fallback pricing categories if no venue seats pre-populated
      initialPricing = seatCategories.map(cat => ({
        category_id: cat.id,
        category_name: cat.name,
        price: cat.name.toLowerCase().includes('vip') ? 500 : cat.name.toLowerCase().includes('premium') ? 300 : 200,
      }));
    }

    setNewShowData(prev => ({
      ...prev,
      venue_id: venueId,
      pricing: initialPricing,
    }));
  };

  // Submit Multi-Step Event + Optional First Show
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create Event
      const eventRes = await fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify(newEventData),
      });
      const createdEvent = eventRes.data;

      // 2. If venue selected, Create Show with Pricing
      if (newShowData.venue_id && newShowData.date && newShowData.time) {
        await fetchApi(`/events/${createdEvent.id}/shows`, {
          method: 'POST',
          body: JSON.stringify({
            venue_id: newShowData.venue_id,
            date: newShowData.date,
            time: newShowData.time,
            pricing: newShowData.pricing.map(p => ({ category_id: p.category_id, price: Number(p.price) })),
          }),
        });
      }

      setCreateEventModal(false);
      setEventStep(1);
      setNewEventData({ title: '', type: 'movie', description: '', poster_url: '', city: 'Delhi' });
      setNewShowData({ venue_id: '', date: new Date().toISOString().split('T')[0], time: '19:00', pricing: [] });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  // Create Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Generate default row layout config
      const rows = [];
      const rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (let i = 0; i < Math.min(newVenueData.total_rows, rowLabels.length); i++) {
        const label = rowLabels[i];
        let catName = 'Standard';
        if (i >= rowLabels.length - 2) catName = 'Recliner';
        else if (i >= 3) catName = 'Premium';

        rows.push({
          label,
          seats: newVenueData.seats_per_row,
          category_name: catName,
        });
      }

      await fetchApi('/organiser/venues', {
        method: 'POST',
        body: JSON.stringify({
          name: newVenueData.name,
          address: newVenueData.address,
          city: newVenueData.city,
          layout: { rows },
        }),
      });

      setCreateVenueModal(false);
      setNewVenueData({ name: '', address: '', city: 'Delhi', total_rows: 8, seats_per_row: 16 });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create venue');
    }
  };

  // Open Manage Summary Modal
  const handleManageEvent = async (eventId: string, title: string) => {
    try {
      const res = await fetchApi(`/events/${eventId}/summary`);
      setSummaryModal({ ...res.data, event_id: eventId, title });
    } catch (err: any) {
      alert(err.message || 'Failed to load summary');
    }
  };

  // Add show to existing event
  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addShowModal) return;
    try {
      await fetchApi(`/events/${addShowModal.event_id}/shows`, {
        method: 'POST',
        body: JSON.stringify({
          venue_id: newShowData.venue_id,
          date: newShowData.date,
          time: newShowData.time,
          pricing: newShowData.pricing.map(p => ({ category_id: p.category_id, price: Number(p.price) })),
        }),
      });
      setAddShowModal(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add show');
    }
  };

  // Cancel Show
  const handleCancelShow = async (showId: string) => {
    if (!confirm('Are you sure you want to cancel this show?')) return;
    try {
      await fetchApi(`/shows/${showId}/cancel`, { method: 'PUT' });
      if (summaryModal) {
        handleManageEvent(summaryModal.event_id, summaryModal.title);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel show');
    }
  };

  // Calculate Overall Revenue & Stats
  const calculateTotalMetrics = () => {
    let totalRevenue = 0;
    let totalShows = 0;
    let totalBookedSeats = 0;
    let totalSeatsCapacity = 0;

    events.forEach(event => {
      if (event.shows) {
        totalShows += event.shows.length;
        event.shows.forEach((show: any) => {
          if (show.bookings) {
            show.bookings.forEach((b: any) => {
              totalRevenue += Number(b.total_price || 0);
            });
          }
          if (show.seat_statuses) {
            totalSeatsCapacity += show.seat_statuses.length;
            totalBookedSeats += show.seat_statuses.filter((s: any) => s.status === 'booked').length;
          }
        });
      }
    });

    return { totalRevenue, totalShows, totalBookedSeats, totalSeatsCapacity };
  };

  const metrics = calculateTotalMetrics();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-primary-container text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8 text-center">
          <span className="material-symbols-outlined text-5xl animate-spin mb-2 block">sync</span>
          <p className="font-display-xl text-3xl uppercase tracking-tighter">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background pb-16">
      {/* Header section */}
      <section className="bg-on-background py-8 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary-fixed text-on-background font-mono font-black text-xs px-2.5 py-0.5 border border-primary-fixed uppercase tracking-wider">
                ORGANISER CONSOLE
              </span>
              <span className="text-yellow-400 font-mono text-xs flex items-center gap-1 font-bold">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
                LIVE HUB
              </span>
            </div>
            <h1 className="font-display-xl text-display-xl text-on-primary uppercase leading-none break-words">
              COMMAND<br />CENTER
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-5 py-2.5 font-headline-lg-mobile text-xs uppercase border-2 border-on-background transition-all neo-brutalist-shadow ${
                activeTab === 'events' ? 'bg-primary-fixed text-on-background font-black' : 'bg-surface text-on-surface hover:bg-surface-variant'
              }`}
            >
              🎬 Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              className={`px-5 py-2.5 font-headline-lg-mobile text-xs uppercase border-2 border-on-background transition-all neo-brutalist-shadow ${
                activeTab === 'venues' ? 'bg-primary-fixed text-on-background font-black' : 'bg-surface text-on-surface hover:bg-surface-variant'
              }`}
            >
              🏛️ Venues ({venues.length})
            </button>
            <button
              onClick={() => setCreateVenueModal(true)}
              className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-5 py-2.5 font-headline-lg-mobile text-xs uppercase neo-brutalist-shadow neo-brutalist-hover transition-all flex items-center gap-1 font-black"
            >
              <span className="material-symbols-outlined text-base">add_location_alt</span>
              New Venue
            </button>
            <button
              onClick={() => {
                setEventStep(1);
                setCreateEventModal(true);
              }}
              className="bg-yellow-300 text-yellow-950 border-2 border-on-background px-6 py-2.5 font-headline-lg-mobile text-xs uppercase neo-brutalist-shadow neo-brutalist-hover transition-all flex items-center gap-1 font-black"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              New Event
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col gap-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-surface border-4 border-on-background p-5 neo-brutalist-shadow flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary-fixed text-on-background font-data-label text-[10px] font-black px-2 py-0.5 uppercase border-l-2 border-b-2 border-on-background">
              Active Events
            </div>
            <span className="font-data-label text-xs uppercase text-on-surface-variant mb-1 font-bold">Total Managed</span>
            <span className="font-display-xl text-5xl text-on-background font-black">{events.length}</span>
            <div className="mt-3 border-t-2 border-on-background pt-2 flex justify-between items-center text-xs font-mono">
              <span className="text-on-surface-variant font-bold">{metrics.totalShows} Scheduled Shows</span>
              <span className="material-symbols-outlined text-primary-container">event</span>
            </div>
          </div>

          <div className="bg-amber-100 border-4 border-amber-900 p-5 neo-brutalist-shadow flex flex-col relative overflow-hidden">
            <span className="font-data-label text-xs uppercase text-amber-950 mb-1 font-black">Gross Revenue</span>
            <span className="font-display-xl text-5xl text-amber-950 font-black">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
            <div className="mt-3 border-t-2 border-amber-900 pt-2 flex justify-between items-center text-xs font-mono text-amber-950 font-bold">
              <span>{metrics.totalBookedSeats} Tickets Sold</span>
              <span className="material-symbols-outlined">payments</span>
            </div>
          </div>

          <div className="bg-teal-100 border-4 border-teal-900 p-5 neo-brutalist-shadow flex flex-col relative overflow-hidden">
            <span className="font-data-label text-xs uppercase text-teal-950 mb-1 font-black">Capacity Utilization</span>
            <span className="font-display-xl text-5xl text-teal-950 font-black">
              {metrics.totalSeatsCapacity > 0 ? `${Math.round((metrics.totalBookedSeats / metrics.totalSeatsCapacity) * 100)}%` : '0%'}
            </span>
            <div className="mt-3 border-t-2 border-teal-900 pt-2 flex justify-between items-center text-xs font-mono text-teal-950 font-bold">
              <span>{metrics.totalSeatsCapacity} Total Seats</span>
              <span className="material-symbols-outlined">pie_chart</span>
            </div>
          </div>

          <div className="bg-purple-100 border-4 border-purple-900 p-5 neo-brutalist-shadow flex flex-col relative overflow-hidden">
            <span className="font-data-label text-xs uppercase text-purple-950 mb-1 font-black">Partner Venues</span>
            <span className="font-display-xl text-5xl text-purple-950 font-black">{venues.length}</span>
            <div className="mt-3 border-t-2 border-purple-900 pt-2 flex justify-between items-center text-xs font-mono text-purple-950 font-bold">
              <span>Cities: {Array.from(new Set(venues.map(v => v.city))).join(', ') || 'Delhi'}</span>
              <span className="material-symbols-outlined">location_city</span>
            </div>
          </div>
        </div>

        {/* TAB 1: EVENTS */}
        {activeTab === 'events' && (
          <div>
            <div className="flex justify-between items-center border-b-4 border-on-background pb-3 mb-6">
              <h2 className="font-headline-lg-mobile text-xl uppercase text-on-background font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                Managed Events & Shows
              </h2>
              <span className="font-mono text-xs uppercase bg-surface-variant border-2 border-on-background px-3 py-1 font-bold">
                Showing {events.length} Events
              </span>
            </div>

            {events.length === 0 ? (
              <div className="bg-surface border-4 border-on-background p-12 text-center neo-brutalist-shadow">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-2">event_busy</span>
                <p className="font-headline-lg-mobile text-lg uppercase font-black">No events created yet!</p>
                <p className="font-mono text-xs text-on-surface-variant mt-1 mb-4">
                  Create your first event, pick a venue, set show timings and category pricing.
                </p>
                <button
                  onClick={() => {
                    setEventStep(1);
                    setCreateEventModal(true);
                  }}
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg-mobile text-xs uppercase font-black neo-brutalist-shadow hover:bg-on-background hover:text-primary-fixed transition-all"
                >
                  + Create Event Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {events.map(event => {
                  const eventShows = event.shows || [];
                  const eventBookings = eventShows.flatMap((s: any) => s.bookings || []);
                  const eventRevenue = eventBookings.reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
                  const totalSeats = eventShows.reduce((sum: number, s: any) => sum + (s.seat_statuses?.length || 0), 0);
                  const bookedSeats = eventShows.reduce((sum: number, s: any) => sum + (s.seat_statuses?.filter((st: any) => st.status === 'booked').length || 0), 0);

                  return (
                    <div key={event.id} className="bg-surface border-4 border-on-background neo-brutalist-shadow overflow-hidden flex flex-col lg:flex-row">
                      {/* Event Poster */}
                      <div className="w-full lg:w-56 h-64 lg:h-auto border-b-4 lg:border-b-0 lg:border-r-4 border-on-background bg-slate-900 relative shrink-0">
                        {event.poster_url ? (
                          <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 font-mono text-xs uppercase">
                            <span className="material-symbols-outlined text-4xl mb-1">image_not_supported</span>
                            No Poster
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-yellow-300 text-yellow-950 font-mono font-black text-[10px] px-2 py-0.5 border border-yellow-900 uppercase">
                          {event.type}
                        </span>
                      </div>

                      {/* Details & Shows Breakdown */}
                      <div className="p-6 flex-grow flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 className="font-headline-lg-mobile text-2xl uppercase bg-on-background text-primary-fixed px-3 py-1 font-black">
                              {event.title}
                            </h3>
                            <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-950 border-2 border-emerald-800 px-3 py-1">
                              Revenue: ₹{eventRevenue.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-on-surface-variant uppercase line-clamp-2 mb-4">
                            {event.description}
                          </p>

                          {/* Show badges */}
                          <div className="bg-surface-variant border-2 border-on-background p-3 rounded-lg">
                            <div className="font-mono text-[11px] font-black uppercase text-on-surface-variant mb-2 flex items-center justify-between">
                              <span>SCHEDULED SHOWS ({eventShows.length})</span>
                              {totalSeats > 0 && (
                                <span>
                                  Occupancy: {bookedSeats}/{totalSeats} seats ({Math.round((bookedSeats / totalSeats) * 100)}%)
                                </span>
                              )}
                            </div>
                            {eventShows.length === 0 ? (
                              <p className="font-mono text-xs text-on-surface-variant italic">No shows scheduled yet for this event.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {eventShows.map((s: any) => (
                                  <div
                                    key={s.id}
                                    className={`border-2 border-on-background px-3 py-1.5 text-xs font-mono flex items-center gap-2 rounded ${
                                      s.status === 'cancelled' ? 'bg-red-100 text-red-950 line-through opacity-70' : 'bg-surface font-bold'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    <span>{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} @ {s.time}</span>
                                    <span className="bg-slate-200 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-black">
                                      {s.venue?.name || 'Venue'} ({s.venue?.city})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-3 border-t-2 border-on-background">
                          <button
                            onClick={() => handleManageEvent(event.id, event.title)}
                            className="bg-on-background text-primary-fixed border-2 border-on-background px-5 py-2 font-headline-lg-mobile text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-background transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-base">analytics</span>
                            Manage & Revenue Summary
                          </button>
                          <button
                            onClick={() => {
                              const defaultVenue = venues[0]?.id || '';
                              setAddShowModal({ event_id: event.id, title: event.title });
                              handleVenueSelectInWizard(defaultVenue);
                            }}
                            className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-4 py-2 font-headline-lg-mobile text-xs uppercase font-black hover:bg-cyan-400 transition-all flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-base">add_alarm</span>
                            + Add Show
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VENUES */}
        {activeTab === 'venues' && (
          <div>
            <div className="flex justify-between items-center border-b-4 border-on-background pb-3 mb-6">
              <h2 className="font-headline-lg-mobile text-xl uppercase text-on-background font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">stadium</span>
                Partner Venues & Seat Layouts
              </h2>
              <button
                onClick={() => setCreateVenueModal(true)}
                className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-4 py-1.5 font-headline-lg-mobile text-xs uppercase font-black neo-brutalist-shadow hover:bg-cyan-400 transition-all"
              >
                + Add New Venue
              </button>
            </div>

            {venues.length === 0 ? (
              <div className="bg-surface border-4 border-on-background p-12 text-center neo-brutalist-shadow">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-2">location_off</span>
                <p className="font-headline-lg-mobile text-lg uppercase font-black">No Venues Configured</p>
                <p className="font-mono text-xs text-on-surface-variant mt-1 mb-4">Add cinema halls, concert grounds, or sports stadiums.</p>
                <button
                  onClick={() => setCreateVenueModal(true)}
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg-mobile text-xs uppercase font-black neo-brutalist-shadow"
                >
                  + Add Venue Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map(v => (
                  <div key={v.id} className="bg-surface border-4 border-on-background p-5 neo-brutalist-shadow flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-headline-lg-mobile text-lg uppercase font-black bg-on-background text-primary-fixed px-2.5 py-1 inline-block">
                          {v.name}
                        </h3>
                        <span className="font-mono text-xs font-black bg-yellow-300 text-yellow-950 border border-yellow-900 px-2 py-0.5">
                          📍 {v.city}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-on-surface-variant mb-3">{v.address}</p>

                      <div className="bg-slate-100 border-2 border-slate-700 p-3 rounded font-mono text-xs flex flex-col gap-1">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>Total Capacity:</span>
                          <span className="text-emerald-700">{v._count?.seats || v.seats?.length || 0} Seats</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Hosted Shows:</span>
                          <span>{v._count?.shows || 0} Shows</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t-2 border-on-background pt-3 flex justify-between items-center text-xs font-mono text-on-surface-variant">
                      <span className="font-bold">ID: {v.id.substring(0, 8)}...</span>
                      <span className="text-emerald-700 font-bold">READY FOR BOOKINGS</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* CREATE EVENT WIZARD MODAL */}
      {createEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary border-b-4 border-on-background">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-300">confirmation_number</span>
                <h2 className="font-headline-lg-mobile text-xl uppercase tracking-tight font-black">
                  CREATE NEW EVENT — STEP {eventStep} OF 2
                </h2>
              </div>
              <button
                onClick={() => setCreateEventModal(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto blueprint-bg flex flex-col gap-5">
              {eventStep === 1 ? (
                /* STEP 1: EVENT DETAILS */
                <div className="flex flex-col gap-4">
                  <div className="bg-amber-100 border-2 border-amber-800 p-3 font-mono text-xs text-amber-950 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-amber-800">info</span>
                    <span>Enter basic event details including title, category type, poster image and target city.</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg-mobile text-xs uppercase font-black">Event Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dune: Part Two IMAX Release"
                      value={newEventData.title}
                      onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-fixed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg-mobile text-xs uppercase font-black">Event Category Type *</label>
                      <select
                        value={newEventData.type}
                        onChange={e => setNewEventData({ ...newEventData, type: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        <option value="movie">🎬 MOVIE</option>
                        <option value="concert">🎸 CONCERT</option>
                        <option value="comedy">🎙️ COMEDY</option>
                        <option value="sports">⚽ SPORTS</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg-mobile text-xs uppercase font-black">Primary City *</label>
                      <select
                        value={newEventData.city}
                        onChange={e => setNewEventData({ ...newEventData, city: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        {INDIAN_CITIES.map(c => (
                          <option key={c} value={c}>📍 {c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg-mobile text-xs uppercase font-black">Description *</label>
                    <textarea
                      placeholder="Detailed event synopsis, artists performing, or venue rules..."
                      value={newEventData.description}
                      onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm h-28 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg-mobile text-xs uppercase font-black">Poster URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/poster.jpg"
                      value={newEventData.poster_url}
                      onChange={e => setNewEventData({ ...newEventData, poster_url: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newEventData.title || !newEventData.description) {
                        alert('Please fill out Event Title and Description');
                        return;
                      }
                      setEventStep(2);
                    }}
                    className="mt-2 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg-mobile text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-all neo-brutalist-shadow flex items-center justify-center gap-2"
                  >
                    Next: Venue & Show Schedule ➡️
                  </button>
                </div>
              ) : (
                /* STEP 2: VENUE, SHOW & PRICING */
                <div className="flex flex-col gap-4">
                  <div className="bg-teal-100 border-2 border-teal-800 p-3 font-mono text-xs text-teal-950 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-teal-800">event_available</span>
                    <span>Schedule your first show & configure tier prices for each seating area.</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg-mobile text-xs uppercase font-black">Select Venue *</label>
                    <select
                      value={newShowData.venue_id}
                      onChange={e => handleVenueSelectInWizard(e.target.value)}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                    >
                      <option value="">-- Choose Partner Venue --</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>
                          🏛️ {v.name} ({v.city}) — Capacity: {v._count?.seats || v.seats?.length || 0} Seats
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg-mobile text-xs uppercase font-black">Show Date *</label>
                      <input
                        type="date"
                        value={newShowData.date}
                        onChange={e => setNewShowData({ ...newShowData, date: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg-mobile text-xs uppercase font-black">Show Time *</label>
                      <input
                        type="time"
                        value={newShowData.time}
                        onChange={e => setNewShowData({ ...newShowData, time: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Seat Category Price Configurator */}
                  {newShowData.pricing.length > 0 && (
                    <div className="bg-slate-100 border-2 border-slate-700 p-4 rounded-lg flex flex-col gap-3">
                      <div className="font-headline-lg-mobile text-xs uppercase font-black text-slate-900 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">sell</span>
                        <span>Seat Category Pricing (INR ₹)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {newShowData.pricing.map((p, idx) => (
                          <div key={p.category_id} className="bg-surface border border-slate-400 p-2.5 rounded flex items-center justify-between">
                            <span className="font-mono text-xs font-bold uppercase">{p.category_name}</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-black text-xs">₹</span>
                              <input
                                type="number"
                                value={p.price}
                                onChange={e => {
                                  const updated = [...newShowData.pricing];
                                  updated[idx].price = Number(e.target.value);
                                  setNewShowData({ ...newShowData, pricing: updated });
                                }}
                                className="w-24 bg-slate-50 border border-slate-300 p-1 font-mono text-xs font-bold text-right"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setEventStep(1)}
                      className="w-1/3 bg-surface text-on-surface border-2 border-on-background py-3 font-headline-lg-mobile text-xs uppercase font-black"
                    >
                      ⬅️ Back
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg-mobile text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-all neo-brutalist-shadow"
                    >
                      Publish Event & Show 🚀
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* CREATE VENUE MODAL */}
      {createVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-lg flex flex-col relative">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-lg uppercase font-black">ADD NEW PARTNER VENUE</h2>
              <button
                onClick={() => setCreateVenueModal(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="p-6 blueprint-bg flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-headline-lg-mobile text-xs uppercase font-black">Venue Name *</label>
                <input
                  type="text"
                  placeholder="e.g. PVR Director's Cut"
                  value={newVenueData.name}
                  onChange={e => setNewVenueData({ ...newVenueData, name: e.target.value })}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg-mobile text-xs uppercase font-black">City *</label>
                  <select
                    value={newVenueData.city}
                    onChange={e => setNewVenueData({ ...newVenueData, city: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  >
                    {INDIAN_CITIES.map(c => (
                      <option key={c} value={c}>📍 {c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg-mobile text-xs uppercase font-black">Total Rows *</label>
                  <input
                    type="number"
                    max={8}
                    min={2}
                    value={newVenueData.total_rows}
                    onChange={e => setNewVenueData({ ...newVenueData, total_rows: Number(e.target.value) })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline-lg-mobile text-xs uppercase font-black">Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Ambience Mall, Vasant Kunj"
                  value={newVenueData.address}
                  onChange={e => setNewVenueData({ ...newVenueData, address: e.target.value })}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="bg-yellow-100 border border-yellow-800 p-2.5 text-[11px] font-mono text-yellow-950">
                Calculated Total Capacity: <strong>{newVenueData.total_rows * newVenueData.seats_per_row} Seats</strong> across Standard, Premium & Recliner tiers.
              </div>

              <button
                type="submit"
                className="mt-2 bg-cyan-300 text-cyan-950 border-2 border-on-background py-3 font-headline-lg-mobile text-xs uppercase font-black neo-brutalist-shadow hover:bg-cyan-400"
              >
                Create & Save Venue
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD SHOW TO EXISTING EVENT MODAL */}
      {addShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-xl flex flex-col relative">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-lg uppercase font-black">
                SCHEDULE NEW SHOW FOR: {addShowModal.title}
              </h2>
              <button
                onClick={() => setAddShowModal(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddShow} className="p-6 blueprint-bg flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-headline-lg-mobile text-xs uppercase font-black">Venue *</label>
                <select
                  value={newShowData.venue_id}
                  onChange={e => handleVenueSelectInWizard(e.target.value)}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  required
                >
                  <option value="">-- Choose Venue --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      🏛️ {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg-mobile text-xs uppercase font-black">Date *</label>
                  <input
                    type="date"
                    value={newShowData.date}
                    onChange={e => setNewShowData({ ...newShowData, date: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg-mobile text-xs uppercase font-black">Time *</label>
                  <input
                    type="time"
                    value={newShowData.time}
                    onChange={e => setNewShowData({ ...newShowData, time: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Pricing Configurator */}
              {newShowData.pricing.length > 0 && (
                <div className="bg-slate-100 border border-slate-700 p-3 rounded flex flex-col gap-2">
                  <span className="font-mono text-xs font-black uppercase text-slate-900">Set Prices (₹ INR)</span>
                  {newShowData.pricing.map((p, idx) => (
                    <div key={p.category_id} className="flex justify-between items-center bg-surface p-2 border border-slate-300">
                      <span className="font-mono text-xs font-bold">{p.category_name}</span>
                      <input
                        type="number"
                        value={p.price}
                        onChange={e => {
                          const updated = [...newShowData.pricing];
                          updated[idx].price = Number(e.target.value);
                          setNewShowData({ ...newShowData, pricing: updated });
                        }}
                        className="w-24 bg-slate-50 border p-1 text-right font-mono text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg-mobile text-xs uppercase font-black neo-brutalist-shadow hover:bg-on-background hover:text-primary-fixed"
              >
                Save Show Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUMMARY & ANALYTICS MODAL */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-lg uppercase tracking-tight font-black">
                📊 {summaryModal.title} — MANAGEMENT & BOOKING LOGS
              </h2>
              <button
                onClick={() => setSummaryModal(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex-grow overflow-y-auto blueprint-bg flex flex-col gap-6">
              {/* Gross Revenue banner */}
              <div className="bg-amber-300 border-4 border-on-background p-5 neo-brutalist-shadow text-amber-950 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <span className="font-headline-lg-mobile text-xs uppercase font-black block text-amber-900">Total Event Revenue</span>
                  <span className="font-display-xl text-5xl font-black">₹{summaryModal.total_revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center gap-4 bg-amber-100 border-2 border-amber-900 px-4 py-2 font-mono text-xs font-black">
                  <span>🎟️ {summaryModal.total_tickets || 0} Tickets Booked</span>
                  <span>📅 {summaryModal.shows?.length || 0} Shows Active</span>
                </div>
              </div>

              {/* Show-by-show status */}
              <div>
                <h3 className="font-headline-lg-mobile text-sm uppercase bg-on-background text-primary-fixed inline-block px-3 py-1 font-black mb-3">
                  SHOWS BREAKDOWN & SEAT AVAILABILITY
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summaryModal.shows?.map((s: any) => (
                    <div key={s.show_id} className="bg-surface border-2 border-on-background p-4 neo-brutalist-shadow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-xs font-black bg-slate-900 text-slate-100 px-2 py-0.5">
                            {new Date(s.date).toLocaleDateString('en-IN')} @ {s.time}
                          </span>
                          <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 border ${
                            s.status === 'cancelled' ? 'bg-red-200 text-red-950 border-red-800' : 'bg-emerald-200 text-emerald-950 border-emerald-800'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                        <p className="font-mono text-xs text-on-surface-variant mb-2 font-bold">📍 {s.venue?.name} ({s.venue?.city})</p>

                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs my-2">
                          <div className="bg-emerald-100 border border-emerald-700 p-1.5 rounded">
                            <span className="text-[10px] block text-emerald-900 font-bold">AVAILABLE</span>
                            <span className="font-black text-emerald-950 text-base">{s.seats?.available || 0}</span>
                          </div>
                          <div className="bg-amber-100 border border-amber-700 p-1.5 rounded">
                            <span className="text-[10px] block text-amber-900 font-bold">BOOKED</span>
                            <span className="font-black text-amber-950 text-base">{s.seats?.booked || 0}</span>
                          </div>
                          <div className="bg-purple-100 border border-purple-700 p-1.5 rounded">
                            <span className="text-[10px] block text-purple-900 font-bold">WAITLIST</span>
                            <span className="font-black text-purple-950 text-base">{s.waitlist_waiting || 0}</span>
                          </div>
                        </div>
                      </div>

                      {s.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelShow(s.show_id)}
                          className="mt-2 w-full bg-red-100 text-red-900 border border-red-800 py-1 font-mono text-xs uppercase font-bold hover:bg-red-200"
                        >
                          Cancel Show
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bookings table */}
              <div>
                <h3 className="font-headline-lg-mobile text-sm uppercase bg-on-background text-primary-fixed inline-block px-3 py-1 font-black mb-3">
                  RECENT BOOKINGS LOG ({summaryModal.recent_bookings?.length || 0})
                </h3>
                {summaryModal.recent_bookings?.length === 0 ? (
                  <div className="bg-surface border-2 border-on-background p-4 text-center font-mono text-xs uppercase opacity-70">
                    No bookings logged yet for this event.
                  </div>
                ) : (
                  <div className="overflow-x-auto border-2 border-on-background bg-surface">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-900 text-slate-100 font-mono text-xs uppercase">
                        <tr>
                          <th className="p-2.5 border-r border-slate-700">Ref Code</th>
                          <th className="p-2.5 border-r border-slate-700">Customer Name</th>
                          <th className="p-2.5 border-r border-slate-700">Phone</th>
                          <th className="p-2.5 border-r border-slate-700 text-right">Amount (₹)</th>
                          <th className="p-2.5">Booking Date</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs uppercase">
                        {summaryModal.recent_bookings?.map((b: any) => (
                          <tr key={b.id} className="border-b border-on-background hover:bg-yellow-100">
                            <td className="p-2.5 border-r border-on-background font-black text-yellow-900">{b.reference}</td>
                            <td className="p-2.5 border-r border-on-background font-bold">{b.customer_name}</td>
                            <td className="p-2.5 border-r border-on-background">{b.customer_phone}</td>
                            <td className="p-2.5 border-r border-on-background text-right font-black text-emerald-700">
                              ₹{b.total_price.toFixed(2)}
                            </td>
                            <td className="p-2.5">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
