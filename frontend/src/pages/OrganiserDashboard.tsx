import { useEffect, useState, useRef } from 'react';
import { fetchApi, getSocketUrl } from '../api/client';
import { useModalStore } from '../store/modal';
import { getImageUrl } from '../utils/imageUrl';
import { io } from 'socket.io-client';

export default function OrganiserDashboard() {
  const [activeTab, setActiveTab] = useState<'events' | 'venues' | 'analytics'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [seatCategories, setSeatCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePulse, setLivePulse] = useState(false);

  // Modals state
  const [createEventModal, setCreateEventModal] = useState(false);
  const [editEventModal, setEditEventModal] = useState<any | null>(null);
  const [createVenueModal, setCreateVenueModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState<any | null>(null);
  const [addShowModal, setAddShowModal] = useState<any | null>(null);

  // File upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Form states for New Event Creation (Wizard style)
  const [eventStep, setEventStep] = useState(1);
  const [newEventData, setNewEventData] = useState({
    title: '',
    type: 'movie',
    description: '',
    poster_url: '',
    language: 'Hindi, English',
    format: '2D, IMAX 3D',
    genre: 'Action',
    certification: 'UA',
    cast: '',
    trailer_url: '',
    city: 'Delhi',
  });

  const [newShowData, setNewShowData] = useState({
    venue_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    language: 'English',
    format: 'IMAX 3D',
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

  const { showSuccess, showError } = useModalStore();

  const INDIAN_CITIES = ['Delhi', 'Noida', 'Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Vellore', 'Hyderabad'];
  const AVAILABLE_LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Punjabi', 'Kannada', 'Bengali', 'Marathi', 'Gujarati'];
  const AVAILABLE_FORMATS = ['2D', '3D', 'IMAX 3D', '4DX 3D', 'Dolby Atmos', 'ScreenX', 'Live Stage', 'Live Arena', 'Stadium Live', 'Open Air'];
  const GENRES = ['Action', 'Sci-Fi', 'Drama', 'Comedy', 'Thriller', 'Romance', 'Bollywood', 'Electronic/EDM', 'Rock/Indie', 'Cricket', 'Football'];
  const CERTIFICATIONS = ['U', 'UA', 'A', 'PG-13', '16+', '18+', 'All Ages'];

  const fetchData = async () => {
    try {
      const [eventsRes, venuesRes, categoriesRes] = await Promise.all([
        fetchApi('/organiser/events'),
        fetchApi('/organiser/venues').catch(() => ({ data: [] })),
        fetchApi('/seat-categories').catch(() => ({ data: [] })),
      ]);
      setEvents(eventsRes.data || []);
      setVenues(venuesRes.data || []);
      setSeatCategories(categoriesRes.data || []);
    } catch (err: any) {
      console.error('Failed to load organiser dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup real-time Socket.IO synchronization for live revenue & booking updates
    const socket = io(getSocketUrl());

    socket.on('dashboard_updated', (data) => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 2500);
      fetchData();
      if (summaryModal?.event_id && (!data.event_id || data.event_id === summaryModal.event_id)) {
        handleManageEvent(summaryModal.event_id, summaryModal.title);
      }
    });

    socket.on('booking_created', () => {
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 2500);
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [summaryModal?.event_id]);

  // Helper to toggle multiple languages in comma-separated string
  const toggleLanguage = (lang: string, isEdit = false) => {
    if (isEdit && editEventModal) {
      const current = (editEventModal.language || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const updated = current.includes(lang) ? current.filter((l: string) => l !== lang) : [...current, lang];
      setEditEventModal({ ...editEventModal, language: updated.join(', ') });
    } else {
      const current = (newEventData.language || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const updated = current.includes(lang) ? current.filter((l: string) => l !== lang) : [...current, lang];
      setNewEventData({ ...newEventData, language: updated.join(', ') });
    }
  };

  // Helper to toggle multiple formats in comma-separated string
  const toggleFormat = (fmt: string, isEdit = false) => {
    if (isEdit && editEventModal) {
      const current = (editEventModal.format || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const updated = current.includes(fmt) ? current.filter((f: string) => f !== fmt) : [...current, fmt];
      setEditEventModal({ ...editEventModal, format: updated.join(', ') });
    } else {
      const current = (newEventData.format || '')
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const updated = current.includes(fmt) ? current.filter((f: string) => f !== fmt) : [...current, fmt];
      setNewEventData({ ...newEventData, format: updated.join(', ') });
    }
  };

  // Universal Image File Upload (JPEG/PNG, any dimensions)
  const handleFileUpload = async (file: File, isEdit = false) => {
    if (!file) return;
    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        try {
          const res = await fetchApi('/upload', {
            method: 'POST',
            body: JSON.stringify({
              image: base64Data,
              filename: file.name
            })
          });

          const uploadedUrl = res.data?.url || base64Data;

          if (isEdit && editEventModal) {
            setEditEventModal((prev: any) => ({ ...prev, poster_url: uploadedUrl }));
          } else {
            setNewEventData((prev) => ({ ...prev, poster_url: uploadedUrl }));
          }

          showSuccess('Poster image uploaded successfully.', { title: 'IMAGE UPLOADED' });
        } catch {
          if (isEdit && editEventModal) {
            setEditEventModal((prev: any) => ({ ...prev, poster_url: base64Data }));
          } else {
            setNewEventData((prev) => ({ ...prev, poster_url: base64Data }));
          }
          showSuccess('Poster preview loaded.', { title: 'READY' });
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showError(err.message || 'Failed to read image file', { title: 'UPLOAD ERROR' });
      setUploadingImage(false);
    }
  };

  // Update default pricing when venue changes in event wizard
  const handleVenueSelectInWizard = (venueId: string) => {
    const selectedVenue = venues.find(v => v.id === venueId);
    let initialPricing: { category_id: string; category_name: string; price: number }[] = [];

    if (selectedVenue && selectedVenue.seats?.length > 0) {
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
      const eventRes = await fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify(newEventData),
      });
      const createdEvent = eventRes.data;

      if (newShowData.venue_id && newShowData.date && newShowData.time) {
        await fetchApi(`/events/${createdEvent.id}/shows`, {
          method: 'POST',
          body: JSON.stringify({
            venue_id: newShowData.venue_id,
            date: newShowData.date,
            time: newShowData.time,
            language: newShowData.language,
            format: newShowData.format,
            pricing: newShowData.pricing.map(p => ({ category_id: p.category_id, price: Number(p.price) })),
          }),
        });
      }

      setCreateEventModal(false);
      setEventStep(1);
      setNewEventData({
        title: '',
        type: 'movie',
        description: '',
        poster_url: '',
        language: 'Hindi, English',
        format: '2D, IMAX 3D',
        genre: 'Action',
        certification: 'UA',
        cast: '',
        trailer_url: '',
        city: 'Delhi',
      });
      setNewShowData({
        venue_id: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        language: 'English',
        format: 'IMAX 3D',
        pricing: []
      });
      showSuccess('Event and initial show published successfully.', { title: 'EVENT CREATED' });
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to create event', { title: 'CREATION FAILED' });
    }
  };

  // Submit Edit Event
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEventModal) return;

    try {
      await fetchApi(`/events/${editEventModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editEventModal.title,
          type: editEventModal.type,
          description: editEventModal.description,
          poster_url: editEventModal.poster_url,
          language: editEventModal.language,
          format: editEventModal.format,
          genre: editEventModal.genre,
          certification: editEventModal.certification,
          cast: editEventModal.cast,
          trailer_url: editEventModal.trailer_url,
        }),
      });

      showSuccess('Event details updated successfully.', { title: 'EVENT UPDATED' });
      setEditEventModal(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update event', { title: 'UPDATE FAILED' });
    }
  };

  // Delete Event
  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete event "${title}" and all its shows?`)) return;

    try {
      await fetchApi(`/events/${eventId}`, { method: 'DELETE' });
      showSuccess(`Event "${title}" has been deleted.`, { title: 'EVENT DELETED' });
      if (summaryModal?.event_id === eventId) setSummaryModal(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete event', { title: 'DELETE ERROR' });
    }
  };

  // Create Venue
  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      showSuccess('Partner venue created and configured.', { title: 'VENUE ADDED' });
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to create venue', { title: 'VENUE ERROR' });
    }
  };

  // Open Manage Summary Modal
  const handleManageEvent = async (eventId: string, title: string) => {
    try {
      const res = await fetchApi(`/events/${eventId}/summary`);
      setSummaryModal({ ...res.data, event_id: eventId, title });
    } catch (err: any) {
      showError(err.message || 'Failed to load summary', { title: 'ERROR' });
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
          language: newShowData.language,
          format: newShowData.format,
          pricing: newShowData.pricing.map(p => ({ category_id: p.category_id, price: Number(p.price) })),
        }),
      });
      setAddShowModal(null);
      showSuccess('New showtime added successfully.', { title: 'SHOW SCHEDULED' });
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to add show', { title: 'ERROR' });
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
      showSuccess('Show cancelled successfully.', { title: 'SHOW CANCELLED' });
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to cancel show', { title: 'ERROR' });
    }
  };

  // Calculate Metrics
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
              if (b.status !== 'cancelled') {
                totalRevenue += Number(b.total_price || 0);
              }
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
        <div className="bg-primary-fixed text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8 text-center">
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
              <span className={`font-mono text-xs flex items-center gap-1.5 font-bold px-2.5 py-0.5 border ${
                livePulse ? 'bg-emerald-400 text-emerald-950 border-emerald-950 animate-bounce' : 'bg-slate-800 text-emerald-400 border-emerald-500'
              }`}>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                {livePulse ? 'SYNCED LIVE BOOKING' : 'LIVE REAL-TIME SYNC'}
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-6xl md:text-7xl font-black text-on-primary uppercase leading-none break-words italic">
              COMMAND<br />CENTER
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-5 py-2.5 font-headline-lg text-xs uppercase border-2 border-on-background transition-all neo-brutalist-shadow cursor-pointer ${
                activeTab === 'events' ? 'bg-primary-fixed text-on-background font-black' : 'bg-surface text-on-surface hover:bg-surface-variant'
              }`}
            >
              Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('venues')}
              className={`px-5 py-2.5 font-headline-lg text-xs uppercase border-2 border-on-background transition-all neo-brutalist-shadow cursor-pointer ${
                activeTab === 'venues' ? 'bg-primary-fixed text-on-background font-black' : 'bg-surface text-on-surface hover:bg-surface-variant'
              }`}
            >
              Venues ({venues.length})
            </button>
            <button
              onClick={() => setCreateVenueModal(true)}
              className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-5 py-2.5 font-headline-lg text-xs uppercase neo-brutalist-shadow hover:bg-cyan-400 transition-all flex items-center gap-1 font-black cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_location_alt</span>
              New Venue
            </button>
            <button
              onClick={() => {
                setEventStep(1);
                setCreateEventModal(true);
              }}
              className="bg-primary-fixed text-black border-2 border-on-background px-6 py-2.5 font-headline-lg text-xs uppercase neo-brutalist-shadow hover:bg-black hover:text-primary-fixed transition-all flex items-center gap-1 font-black cursor-pointer"
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
              <span className="material-symbols-outlined text-primary-fixed">event</span>
            </div>
          </div>

          <div className="bg-primary-fixed/20 border-4 border-on-background p-5 neo-brutalist-shadow flex flex-col relative overflow-hidden">
            <span className="font-data-label text-xs uppercase text-on-background mb-1 font-black">Gross Revenue</span>
            <span className="font-display-xl text-5xl text-on-background font-black">₹{metrics.totalRevenue.toLocaleString('en-IN')}</span>
            <div className="mt-3 border-t-2 border-on-background pt-2 flex justify-between items-center text-xs font-mono text-on-background font-bold">
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
              <h2 className="font-headline-lg text-xl uppercase text-on-background font-black flex items-center gap-2">
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
                <p className="font-headline-lg text-lg uppercase font-black">No events created yet.</p>
                <p className="font-mono text-xs text-on-surface-variant mt-1 mb-4">
                  Create your first event, pick a venue, set show timings and category pricing.
                </p>
                <button
                  onClick={() => {
                    setEventStep(1);
                    setCreateEventModal(true);
                  }}
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg text-xs uppercase font-black neo-brutalist-shadow hover:bg-on-background hover:text-primary-fixed transition-all cursor-pointer"
                >
                  + Create Event Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {events.map(event => {
                  const eventShows = event.shows || [];
                  const eventBookings = eventShows.flatMap((s: any) => s.bookings || []);
                  const eventRevenue = eventBookings
                    .filter((b: any) => b.status !== 'cancelled')
                    .reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
                  const totalSeats = eventShows.reduce((sum: number, s: any) => sum + (s.seat_statuses?.length || 0), 0);
                  const bookedSeats = eventShows.reduce((sum: number, s: any) => sum + (s.seat_statuses?.filter((st: any) => st.status === 'booked').length || 0), 0);
                  const resolvedPosterUrl = getImageUrl(event.poster_url);
                  const languagesList = (event.language || '').split(',').map((l: string) => l.trim()).filter(Boolean);
                  const formatsList = (event.format || '').split(',').map((f: string) => f.trim()).filter(Boolean);

                  return (
                    <div key={event.id} className="bg-surface border-4 border-on-background neo-brutalist-shadow overflow-hidden flex flex-col lg:flex-row">
                      {/* Responsive Poster Container */}
                      <div className="w-full lg:w-64 h-64 lg:h-auto border-b-4 lg:border-b-0 lg:border-r-4 border-on-background bg-black relative shrink-0 overflow-hidden flex items-center justify-center">
                        {resolvedPosterUrl ? (
                          <>
                            <img
                              src={resolvedPosterUrl}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                            />
                            <img
                              src={resolvedPosterUrl}
                              alt={event.title}
                              className="relative z-10 w-full h-full object-cover"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 font-mono text-xs uppercase">
                            <span className="material-symbols-outlined text-4xl mb-1">image_not_supported</span>
                            No Poster
                          </div>
                        )}
                        <span className="absolute top-2 left-2 z-20 bg-primary-fixed text-black font-mono font-black text-[10px] px-2 py-0.5 border border-black uppercase">
                          {event.type}
                        </span>
                      </div>

                      {/* Details & Shows Breakdown */}
                      <div className="p-6 flex-grow flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <h3 className="font-headline-lg text-2xl uppercase bg-on-background text-primary-fixed px-3 py-1 font-black">
                              {event.title}
                            </h3>
                            <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-950 border-2 border-emerald-800 px-3 py-1">
                              Revenue: ₹{eventRevenue.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Multi-Language & Multi-Format Chips */}
                          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
                            {languagesList.map((lang: string) => (
                              <span key={lang} className="bg-sky-100 text-sky-950 border border-sky-800 font-mono text-[10px] font-black px-2 py-0.5 uppercase">
                                {lang}
                              </span>
                            ))}
                            {formatsList.map((fmt: string) => (
                              <span key={fmt} className="bg-primary-fixed text-black border border-black font-mono text-[10px] font-black px-2 py-0.5 uppercase">
                                {fmt}
                              </span>
                            ))}
                            {event.genre && (
                              <span className="bg-surface-variant border border-on-background font-mono text-[10px] font-bold px-2 py-0.5 uppercase">
                                {event.genre}
                              </span>
                            )}
                            {event.certification && (
                              <span className="bg-red-100 text-red-950 border border-red-800 font-mono text-[10px] font-black px-2 py-0.5 uppercase">
                                Rated {event.certification}
                              </span>
                            )}
                            {event.cast && (
                              <span className="bg-amber-100 text-amber-950 border border-amber-800 font-mono text-[10px] font-bold px-2 py-0.5 uppercase">
                                Cast: {event.cast}
                              </span>
                            )}
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
                                    {s.format && <span className="bg-primary-fixed text-black text-[10px] px-1 py-0.2 rounded font-black">{s.format}</span>}
                                    {s.language && <span className="bg-sky-100 text-sky-950 text-[10px] px-1 py-0.2 rounded font-bold">{s.language}</span>}
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
                        <div className="flex flex-wrap gap-2 pt-3 border-t-2 border-on-background">
                          <button
                            onClick={() => handleManageEvent(event.id, event.title)}
                            className="bg-on-background text-primary-fixed border-2 border-on-background px-4 py-2 font-headline-lg text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-background transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">analytics</span>
                            Manage & Analytics
                          </button>
                          <button
                            onClick={() => {
                              const defaultVenue = venues[0]?.id || '';
                              setAddShowModal({ event_id: event.id, title: event.title, event_language: event.language, event_format: event.format });
                              handleVenueSelectInWizard(defaultVenue);
                            }}
                            className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-4 py-2 font-headline-lg text-xs uppercase font-black hover:bg-cyan-400 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">add_alarm</span>
                            + Add Show
                          </button>
                          <button
                            onClick={() => setEditEventModal(event)}
                            className="bg-surface text-on-background border-2 border-on-background px-3 py-2 font-headline-lg text-xs uppercase font-black hover:bg-surface-variant transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            className="bg-error text-on-error border-2 border-on-background px-3 py-2 font-headline-lg text-xs uppercase font-black hover:bg-on-background hover:text-error transition-all flex items-center gap-1 cursor-pointer ml-auto"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                            Delete
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
              <h2 className="font-headline-lg text-xl uppercase text-on-background font-black flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">stadium</span>
                Partner Venues & Seat Layouts
              </h2>
              <button
                onClick={() => setCreateVenueModal(true)}
                className="bg-cyan-300 text-cyan-950 border-2 border-on-background px-4 py-1.5 font-headline-lg text-xs uppercase font-black neo-brutalist-shadow hover:bg-cyan-400 transition-all cursor-pointer"
              >
                + Add New Venue
              </button>
            </div>

            {venues.length === 0 ? (
              <div className="bg-surface border-4 border-on-background p-12 text-center neo-brutalist-shadow">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-2">location_off</span>
                <p className="font-headline-lg text-lg uppercase font-black">No Venues Configured</p>
                <p className="font-mono text-xs text-on-surface-variant mt-1 mb-4">Add cinema halls, concert grounds, or sports stadiums.</p>
                <button
                  onClick={() => setCreateVenueModal(true)}
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg text-xs uppercase font-black neo-brutalist-shadow cursor-pointer"
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
                        <h3 className="font-headline-lg text-lg uppercase font-black bg-on-background text-primary-fixed px-2.5 py-1 inline-block">
                          {v.name}
                        </h3>
                        <span className="font-mono text-xs font-black bg-primary-fixed text-black border border-black px-2 py-0.5">
                          {v.city}
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
                <span className="material-symbols-outlined text-primary-fixed">confirmation_number</span>
                <h2 className="font-headline-lg text-xl uppercase tracking-tight font-black">
                  CREATE NEW EVENT — STEP {eventStep} OF 3
                </h2>
              </div>
              <button
                onClick={() => setCreateEventModal(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto blueprint-bg flex flex-col gap-5">
              {eventStep === 1 && (
                /* STEP 1: BASIC DETAILS & POSTER UPLOAD */
                <div className="flex flex-col gap-4">
                  <div className="bg-primary-fixed/20 border-2 border-on-background p-3 font-mono text-xs text-on-background font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">info</span>
                    <span>Step 1: Event Title, Type, Target City & Poster Image.</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg text-xs uppercase font-black">Event Title *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dune: Part Two"
                      value={newEventData.title}
                      onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-fixed"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Category Type *</label>
                      <select
                        value={newEventData.type}
                        onChange={e => setNewEventData({ ...newEventData, type: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        <option value="movie">MOVIE</option>
                        <option value="concert">CONCERT</option>
                        <option value="comedy">COMEDY</option>
                        <option value="sports">SPORTS</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Primary City *</label>
                      <select
                        value={newEventData.city}
                        onChange={e => setNewEventData({ ...newEventData, city: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        {INDIAN_CITIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg text-xs uppercase font-black">Event Description & Synopsis *</label>
                    <textarea
                      placeholder="Detailed event synopsis, performer details, agenda or venue rules..."
                      value={newEventData.description}
                      onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm h-24 focus:outline-none"
                      required
                    />
                  </div>

                  {/* UNIVERSAL POSTER IMAGE UPLOADER */}
                  <div className="flex flex-col gap-2 bg-surface-lowest border-2 border-on-background p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <label className="font-headline-lg text-xs uppercase font-black flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-base">image</span>
                        Event Poster Image (Upload File or Enter Image Link)
                      </span>
                      {uploadingImage && <span className="text-xs text-primary font-mono font-bold animate-pulse">Uploading...</span>}
                    </label>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      {/* Image Preview Container */}
                      <div className="w-32 h-36 border-2 border-on-background bg-black relative flex items-center justify-center overflow-hidden shrink-0">
                        {newEventData.poster_url ? (
                          <>
                            <img
                              src={getImageUrl(newEventData.poster_url)}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40 scale-110 pointer-events-none"
                            />
                            <img
                              src={getImageUrl(newEventData.poster_url)}
                              alt="Poster preview"
                              className="relative z-10 w-full h-full object-cover"
                            />
                          </>
                        ) : (
                          <div className="text-center p-2 text-on-surface-variant font-mono text-[10px] uppercase font-bold">
                            <span className="material-symbols-outlined text-2xl block mb-0.5">add_photo_alternate</span>
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/jpeg,image/png,image/webp,image/jpg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, false);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-on-background text-primary-fixed border-2 border-on-background px-4 py-2.5 font-headline-lg text-xs uppercase font-black hover:bg-primary-fixed hover:text-on-background transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-base">upload_file</span>
                            Upload Image File (JPG/PNG)
                          </button>
                        </div>
                        <p className="font-mono text-[11px] text-on-surface-variant font-bold">
                          Option 1: Choose any picture from your device.
                        </p>
                        <div className="flex flex-col gap-1 mt-1">
                          <label className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">
                            Option 2: Or enter/paste web image link (e.g. https://images.unsplash.com/...)
                          </label>
                          <input
                            type="text"
                            placeholder="https://example.com/poster.jpg"
                            value={newEventData.poster_url}
                            onChange={e => setNewEventData({ ...newEventData, poster_url: e.target.value })}
                            className="w-full bg-surface border border-on-background p-2 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
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
                    className="mt-2 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-all neo-brutalist-shadow flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Next: Multiple Languages, Formats & Details
                  </button>
                </div>
              )}

              {eventStep === 2 && (
                /* STEP 2: METADATA & MULTI-LANGUAGE / MULTI-FORMAT SELECTION */
                <div className="flex flex-col gap-5">
                  <div className="bg-primary-fixed/20 border-2 border-on-background p-3 font-mono text-xs text-on-background font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">category</span>
                    <span>Step 2: Choose all supported Languages & Formats (Multi-Select Enabled).</span>
                  </div>

                  {/* MULTI-LANGUAGE SELECTOR */}
                  <div className="bg-surface-lowest border-2 border-on-background p-3.5 flex flex-col gap-2">
                    <label className="font-headline-lg text-xs uppercase font-black flex justify-between">
                      <span>Supported Languages (Select all that apply) *</span>
                      <span className="text-primary-fixed bg-black px-2 py-0.5 text-[10px] font-mono">
                        {newEventData.language || 'None Selected'}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_LANGUAGES.map(lang => {
                        const selected = (newEventData.language || '').split(',').map(s => s.trim()).includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={() => toggleLanguage(lang, false)}
                            className={`px-3 py-1 font-mono text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                              selected
                                ? 'bg-primary-fixed text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105'
                                : 'bg-surface text-slate-700 border-slate-400 hover:border-black'
                            }`}
                          >
                            {selected ? '[X] ' : '[ ] '} {lang}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={newEventData.language}
                      onChange={e => setNewEventData({ ...newEventData, language: e.target.value })}
                      placeholder="Custom language list (e.g. English, Hindi, Telugu)"
                      className="bg-surface border border-on-background p-2 font-mono text-xs mt-1"
                    />
                  </div>

                  {/* MULTI-FORMAT SELECTOR */}
                  <div className="bg-surface-lowest border-2 border-on-background p-3.5 flex flex-col gap-2">
                    <label className="font-headline-lg text-xs uppercase font-black flex justify-between">
                      <span>Experience Formats (Select all that apply) *</span>
                      <span className="text-primary-fixed bg-black px-2 py-0.5 text-[10px] font-mono">
                        {newEventData.format || 'None Selected'}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_FORMATS.map(fmt => {
                        const selected = (newEventData.format || '').split(',').map(s => s.trim()).includes(fmt);
                        return (
                          <button
                            type="button"
                            key={fmt}
                            onClick={() => toggleFormat(fmt, false)}
                            className={`px-3 py-1 font-mono text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                              selected
                                ? 'bg-primary-fixed text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-105'
                                : 'bg-surface text-slate-700 border-slate-400 hover:border-black'
                            }`}
                          >
                            {selected ? '[X] ' : '[ ] '} {fmt}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      value={newEventData.format}
                      onChange={e => setNewEventData({ ...newEventData, format: e.target.value })}
                      placeholder="Custom formats (e.g. 2D, 3D, IMAX 3D, 4DX 3D)"
                      className="bg-surface border border-on-background p-2 font-mono text-xs mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Genre</label>
                      <select
                        value={newEventData.genre}
                        onChange={e => setNewEventData({ ...newEventData, genre: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        {GENRES.map(gnr => (
                          <option key={gnr} value={gnr}>{gnr}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Age Certification</label>
                      <select
                        value={newEventData.certification}
                        onChange={e => setNewEventData({ ...newEventData, certification: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                      >
                        {CERTIFICATIONS.map(cert => (
                          <option key={cert} value={cert}>{cert}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg text-xs uppercase font-black">Cast / Performers / Artists</label>
                    <input
                      type="text"
                      placeholder="e.g. Timothée Chalamet, Zendaya, Rebecca Ferguson"
                      value={newEventData.cast}
                      onChange={e => setNewEventData({ ...newEventData, cast: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm focus:outline-none font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg text-xs uppercase font-black">Official Trailer URL (YouTube Link)</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={newEventData.trailer_url}
                      onChange={e => setNewEventData({ ...newEventData, trailer_url: e.target.value })}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setEventStep(1)}
                      className="w-1/3 bg-surface text-on-surface border-2 border-on-background py-3 font-headline-lg text-xs uppercase font-black cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setEventStep(3)}
                      className="w-2/3 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-all neo-brutalist-shadow cursor-pointer"
                    >
                      Next: Venue & Show Schedule
                    </button>
                  </div>
                </div>
              )}

              {eventStep === 3 && (
                /* STEP 3: VENUE, SHOW & PRICING */
                <div className="flex flex-col gap-4">
                  <div className="bg-teal-100 border-2 border-teal-800 p-3 font-mono text-xs text-teal-950 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-teal-800">event_available</span>
                    <span>Step 3: Schedule first show & configure tier prices for each seating category.</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-headline-lg text-xs uppercase font-black">Select Venue *</label>
                    <select
                      value={newShowData.venue_id}
                      onChange={e => handleVenueSelectInWizard(e.target.value)}
                      className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                    >
                      <option value="">-- Choose Partner Venue --</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.city}) — Capacity: {v._count?.seats || v.seats?.length || 0} Seats
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Show Date *</label>
                      <input
                        type="date"
                        value={newShowData.date}
                        onChange={e => setNewShowData({ ...newShowData, date: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Show Time *</label>
                      <input
                        type="time"
                        value={newShowData.time}
                        onChange={e => setNewShowData({ ...newShowData, time: e.target.value })}
                        className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Show specific Language & Format */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Show Language</label>
                      <select
                        value={newShowData.language}
                        onChange={e => setNewShowData({ ...newShowData, language: e.target.value })}
                        className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                      >
                        {AVAILABLE_LANGUAGES.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="font-headline-lg text-xs uppercase font-black">Show Format</label>
                      <select
                        value={newShowData.format}
                        onChange={e => setNewShowData({ ...newShowData, format: e.target.value })}
                        className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                      >
                        {AVAILABLE_FORMATS.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seat Category Price Configurator */}
                  {newShowData.pricing.length > 0 && (
                    <div className="bg-slate-100 border-2 border-slate-700 p-4 rounded-lg flex flex-col gap-3">
                      <div className="font-headline-lg text-xs uppercase font-black text-slate-900 flex items-center gap-1">
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
                      onClick={() => setEventStep(2)}
                      className="w-1/3 bg-surface text-on-surface border-2 border-on-background py-3 font-headline-lg text-xs uppercase font-black cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg text-sm uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-all neo-brutalist-shadow cursor-pointer"
                    >
                      Publish Event & Show
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* EDIT EVENT MODAL */}
      {editEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary border-b-4 border-on-background">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed">edit</span>
                <h2 className="font-headline-lg text-xl uppercase tracking-tight font-black">
                  EDIT EVENT: {editEventModal.title}
                </h2>
              </div>
              <button
                onClick={() => setEditEventModal(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="p-6 overflow-y-auto blueprint-bg flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Event Title *</label>
                <input
                  type="text"
                  value={editEventModal.title}
                  onChange={e => setEditEventModal({ ...editEventModal, title: e.target.value })}
                  className="bg-surface border-2 border-on-background p-3 font-mono text-sm font-bold focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Category Type</label>
                  <select
                    value={editEventModal.type}
                    onChange={e => setEditEventModal({ ...editEventModal, type: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm font-bold focus:outline-none"
                  >
                    <option value="movie">MOVIE</option>
                    <option value="concert">CONCERT</option>
                    <option value="comedy">COMEDY</option>
                    <option value="sports">SPORTS</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Age Certification</label>
                  <select
                    value={editEventModal.certification || 'UA'}
                    onChange={e => setEditEventModal({ ...editEventModal, certification: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm font-bold focus:outline-none"
                  >
                    {CERTIFICATIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* MULTI-LANGUAGE EDIT */}
              <div className="bg-surface-lowest border-2 border-on-background p-3 flex flex-col gap-2">
                <label className="font-headline-lg text-xs uppercase font-black flex justify-between">
                  <span>Languages (Multi-Select)</span>
                  <span className="text-primary-fixed bg-black px-2 py-0.5 text-[10px] font-mono">
                    {editEventModal.language || 'None'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_LANGUAGES.map(lang => {
                    const selected = (editEventModal.language || '').split(',').map((s: string) => s.trim()).includes(lang);
                    return (
                      <button
                        type="button"
                        key={lang}
                        onClick={() => toggleLanguage(lang, true)}
                        className={`px-2.5 py-0.5 font-mono text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                          selected
                            ? 'bg-primary-fixed text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-surface text-slate-700 border-slate-400'
                        }`}
                      >
                        {selected ? '[X] ' : '[ ] '} {lang}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={editEventModal.language || ''}
                  onChange={e => setEditEventModal({ ...editEventModal, language: e.target.value })}
                  className="bg-surface border border-on-background p-1.5 font-mono text-xs"
                />
              </div>

              {/* MULTI-FORMAT EDIT */}
              <div className="bg-surface-lowest border-2 border-on-background p-3 flex flex-col gap-2">
                <label className="font-headline-lg text-xs uppercase font-black flex justify-between">
                  <span>Formats (Multi-Select)</span>
                  <span className="text-primary-fixed bg-black px-2 py-0.5 text-[10px] font-mono">
                    {editEventModal.format || 'None'}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_FORMATS.map(fmt => {
                    const selected = (editEventModal.format || '').split(',').map((s: string) => s.trim()).includes(fmt);
                    return (
                      <button
                        type="button"
                        key={fmt}
                        onClick={() => toggleFormat(fmt, true)}
                        className={`px-2.5 py-0.5 font-mono text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                          selected
                            ? 'bg-primary-fixed text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-surface text-slate-700 border-slate-400'
                        }`}
                      >
                        {selected ? '[X] ' : '[ ] '} {fmt}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={editEventModal.format || ''}
                  onChange={e => setEditEventModal({ ...editEventModal, format: e.target.value })}
                  className="bg-surface border border-on-background p-1.5 font-mono text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Genre</label>
                <select
                  value={editEventModal.genre || 'Action'}
                  onChange={e => setEditEventModal({ ...editEventModal, genre: e.target.value })}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm font-bold focus:outline-none"
                >
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Description & Synopsis</label>
                <textarea
                  value={editEventModal.description}
                  onChange={e => setEditEventModal({ ...editEventModal, description: e.target.value })}
                  className="bg-surface border-2 border-on-background p-3 font-mono text-sm h-24 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Cast / Performers</label>
                <input
                  type="text"
                  value={editEventModal.cast || ''}
                  onChange={e => setEditEventModal({ ...editEventModal, cast: e.target.value })}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Trailer URL</label>
                <input
                  type="text"
                  value={editEventModal.trailer_url || ''}
                  onChange={e => setEditEventModal({ ...editEventModal, trailer_url: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                />
              </div>

              {/* Poster Upload in Edit */}
              <div className="flex flex-col gap-2 bg-surface-lowest border-2 border-on-background p-3">
                <label className="font-headline-lg text-xs uppercase font-black">Poster Image (Upload File or Enter Image Link)</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-24 bg-black border-2 border-on-background relative overflow-hidden flex items-center justify-center shrink-0">
                    {editEventModal.poster_url ? (
                      <img src={getImageUrl(editEventModal.poster_url)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-mono text-[9px] text-slate-400 uppercase">No Image</span>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col gap-1.5">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, true);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="bg-on-background text-primary-fixed border-2 border-on-background px-3 py-1.5 font-headline-lg text-xs uppercase font-black w-fit cursor-pointer hover:bg-primary-fixed hover:text-on-background transition-colors"
                    >
                      Upload New Image File (JPG/PNG)
                    </button>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[10px] text-on-surface-variant font-bold">Or enter/paste web image link:</span>
                      <input
                        type="text"
                        value={editEventModal.poster_url || ''}
                        onChange={e => setEditEventModal({ ...editEventModal, poster_url: e.target.value })}
                        placeholder="https://example.com/poster.jpg"
                        className="bg-surface border border-on-background p-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-on-background">
                <button
                  type="button"
                  onClick={() => setEditEventModal(null)}
                  className="bg-surface text-on-surface border-2 border-on-background px-5 py-2.5 font-headline-lg text-xs uppercase font-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-2.5 font-headline-lg text-xs uppercase font-black hover:bg-on-background hover:text-primary-fixed transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE VENUE MODAL */}
      {createVenueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-lg flex flex-col relative">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg text-lg uppercase font-black">ADD NEW PARTNER VENUE</h2>
              <button
                onClick={() => setCreateVenueModal(false)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVenue} className="p-6 blueprint-bg flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Venue Name *</label>
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
                  <label className="font-headline-lg text-xs uppercase font-black">City *</label>
                  <select
                    value={newVenueData.city}
                    onChange={e => setNewVenueData({ ...newVenueData, city: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  >
                    {INDIAN_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Total Rows *</label>
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
                <label className="font-headline-lg text-xs uppercase font-black">Address *</label>
                <input
                  type="text"
                  placeholder="e.g. Ambience Mall, Vasant Kunj"
                  value={newVenueData.address}
                  onChange={e => setNewVenueData({ ...newVenueData, address: e.target.value })}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="bg-stone-100 border border-black p-2.5 text-[11px] font-mono text-black">
                Calculated Total Capacity: <strong>{newVenueData.total_rows * newVenueData.seats_per_row} Seats</strong> across Standard, Premium & Recliner tiers.
              </div>

              <button
                type="submit"
                className="mt-2 bg-cyan-300 text-cyan-950 border-2 border-on-background py-3 font-headline-lg text-xs uppercase font-black neo-brutalist-shadow hover:bg-cyan-400 cursor-pointer"
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
              <h2 className="font-headline-lg text-lg uppercase font-black">
                SCHEDULE NEW SHOW: {addShowModal.title}
              </h2>
              <button
                onClick={() => setAddShowModal(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddShow} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-headline-lg text-xs uppercase font-black">Select Venue *</label>
                <select
                  value={newShowData.venue_id}
                  onChange={e => handleVenueSelectInWizard(e.target.value)}
                  className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  required
                >
                  <option value="">-- Choose Venue --</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Date *</label>
                  <input
                    type="date"
                    value={newShowData.date}
                    onChange={e => setNewShowData({ ...newShowData, date: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Time *</label>
                  <input
                    type="time"
                    value={newShowData.time}
                    onChange={e => setNewShowData({ ...newShowData, time: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Show Language</label>
                  <select
                    value={newShowData.language}
                    onChange={e => setNewShowData({ ...newShowData, language: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  >
                    {AVAILABLE_LANGUAGES.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-headline-lg text-xs uppercase font-black">Show Format</label>
                  <select
                    value={newShowData.format}
                    onChange={e => setNewShowData({ ...newShowData, format: e.target.value })}
                    className="bg-surface border-2 border-on-background p-2.5 font-mono text-sm focus:outline-none"
                  >
                    {AVAILABLE_FORMATS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Category Pricing inputs for this show */}
              {newShowData.pricing.length > 0 && (
                <div className="bg-surface-variant border-2 border-on-background p-3 flex flex-col gap-2">
                  <div className="font-headline-lg text-xs uppercase font-black">Configure Seat Prices for this Show (₹)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {newShowData.pricing.map((p, idx) => (
                      <div key={p.category_id} className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] uppercase font-bold text-on-surface-variant">{p.category_name}</label>
                        <input
                          type="number"
                          value={p.price}
                          onChange={e => {
                            const updated = [...newShowData.pricing];
                            updated[idx].price = Number(e.target.value);
                            setNewShowData({ ...newShowData, pricing: updated });
                          }}
                          className="bg-surface border-2 border-on-background p-1.5 font-mono text-xs font-black"
                          min={50}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="mt-2 bg-primary-fixed text-on-background border-2 border-on-background py-3 font-headline-lg text-xs uppercase font-black neo-brutalist-shadow hover:bg-on-background hover:text-primary-fixed transition-colors cursor-pointer"
              >
                Save & Open Ticket Sales
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EVENT REVENUE SUMMARY MODAL */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary border-b-4 border-on-background">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-fixed">analytics</span>
                <h2 className="font-headline-lg text-lg uppercase font-black">
                  FINANCIAL & ATTENDANCE SUMMARY: {summaryModal.title || summaryModal.event_title}
                </h2>
              </div>
              <button
                onClick={() => setSummaryModal(null)}
                className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 flex-grow overflow-y-auto blueprint-bg flex flex-col gap-6">
              {/* Gross Revenue banner */}
              <div className="bg-primary-fixed border-4 border-on-background p-5 neo-brutalist-shadow text-black flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <span className="font-headline-lg text-xs uppercase font-black block text-black">Total Event Revenue</span>
                  <span className="font-display-xl text-5xl font-black">₹{summaryModal.total_revenue?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex items-center gap-4 bg-white border-2 border-black px-4 py-2 font-mono text-xs font-black">
                  <span>{summaryModal.total_tickets || 0} Tickets Booked</span>
                  <span>{summaryModal.shows?.length || 0} Shows Active</span>
                </div>
              </div>

              {/* Show-by-show status */}
              <div>
                <h3 className="font-headline-lg text-sm uppercase bg-on-background text-primary-fixed inline-block px-3 py-1 font-black mb-3">
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
                        <p className="font-mono text-xs text-on-surface-variant mb-2 font-bold">{s.venue?.name} ({s.venue?.city})</p>

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
                          className="mt-2 w-full bg-red-100 text-red-900 border border-red-800 py-1 font-mono text-xs uppercase font-bold hover:bg-red-200 cursor-pointer"
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
                <h3 className="font-headline-lg text-sm uppercase bg-on-background text-primary-fixed inline-block px-3 py-1 font-black mb-3">
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
                          <tr key={b.id} className="border-b border-on-background hover:bg-primary-fixed/20">
                            <td className="p-2.5 border-r border-on-background font-black text-black">{b.reference}</td>
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
