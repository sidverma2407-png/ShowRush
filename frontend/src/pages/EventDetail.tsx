import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../api/client';
import { useAuthStore } from '../store/auth';
import { io } from 'socket.io-client';

interface ShowItem {
  id: string;
  date: string;
  time: string;
  format?: string;
  language?: string;
  venue: {
    id: string;
    name: string;
    city: string;
    chain: string;
    address: string;
  };
}

interface ReviewItem {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  customer: {
    id: string;
    name: string;
  };
}

interface EventData {
  id: string;
  title: string;
  type: string;
  description: string;
  poster_url?: string;
  language?: string;
  format?: string;
  genre?: string;
  certification?: string;
  cast?: string;
  trailer_url?: string;
  average_rating?: number | null;
  review_count: number;
  user_has_booking: boolean;
  shows: ShowItem[];
  reviews: ReviewItem[];
}

// Utility to parse YouTube Embed URL or Video ID
function extractYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  let videoId = '';

  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('watch?v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1]?.split('?')[0];
  } else if (url.length === 11) {
    videoId = url;
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states for Cinema & Showtimes
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'grouped'>('cards');

  // Trailer Popup Modal state
  const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);

  // Review Form state
  const [userRating, setUserRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userReviewText, setUserReviewText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewStatusMessage, setReviewStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Seat count prompt modal
  const [pendingShowId, setPendingShowId] = useState<string | null>(null);
  const [selectedSeatsCount, setSelectedSeatsCount] = useState<number>(2);

  const fetchEventDetails = () => {
    if (!id) return;
    fetchApi(`/events/${id}`)
      .then((res: any) => {
        const data = res.data;
        setEvent(data);
        // Set default city from available shows
        if (data.shows && data.shows.length > 0) {
          const cities = Array.from(new Set(data.shows.map((s: ShowItem) => s.venue.city))) as string[];
          if (cities.length > 0 && selectedCity === 'All') {
            setSelectedCity(cities[0]);
          }
          // Set default date
          const dates = Array.from(new Set(data.shows.map((s: ShowItem) => s.date.split('T')[0]))) as string[];
          if (dates.length > 0 && !selectedDate) {
            setSelectedDate(dates[0]);
          }
        }
      })
      .catch((err: any) => {
        console.error('Failed to fetch event:', err);
        setError(err.message || 'Event not found');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEventDetails();

    // Socket.IO setup for live real-time rating & review updates
    const socket = io((import.meta as any).env?.VITE_API_URL || 'http://localhost:3000');
    socket.on('review_updated', (data: { event_id: string; average_rating?: number; review_count?: number; new_review?: ReviewItem }) => {
      if (data.event_id === id) {
        setEvent(prev => {
          if (!prev) return prev;
          const updatedReviews = data.new_review
            ? [data.new_review, ...prev.reviews.filter(r => r.id !== data.new_review?.id)]
            : prev.reviews;
          return {
            ...prev,
            average_rating: data.average_rating !== undefined ? data.average_rating : prev.average_rating,
            review_count: data.review_count !== undefined ? data.review_count : prev.review_count,
            reviews: updatedReviews
          };
        });
        fetchEventDetails();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !userReviewText.trim()) return;
    setSubmittingReview(true);
    setReviewStatusMessage(null);

    try {
      const res: any = await fetchApi(`/events/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: userRating,
          review_text: userReviewText
        })
      });

      setReviewStatusMessage({ text: 'Review published successfully!', isError: false });
      setUserReviewText('');
      
      // Update local state immediately with returned data
      if (res.data) {
        setEvent(prev => {
          if (!prev) return prev;
          const updatedReviews = res.data.review 
            ? [res.data.review, ...prev.reviews.filter(r => r.id !== res.data.review?.id)]
            : prev.reviews;
          return {
            ...prev,
            average_rating: res.data.average_rating,
            review_count: res.data.review_count,
            reviews: updatedReviews
          };
        });
      }
    } catch (err: any) {
      setReviewStatusMessage({ text: err.message || 'Failed to submit review', isError: true });
    } finally {
      setSubmittingReview(false);
    }
  };

  const scrollToReviewSection = () => {
    const el = document.getElementById('reviews-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-black border-t-yellow-400 animate-spin mb-4" />
        <span className="font-mono font-black text-xl uppercase tracking-widest text-slate-700">
          Loading Event Details...
        </span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-16 text-center">
        <div className="bg-yellow-100 border-4 border-black shadow-neo p-8 max-w-lg mx-auto">
          <h2 className="text-2xl font-black uppercase text-black mb-2">Event Not Found</h2>
          <p className="font-mono text-sm text-slate-700 mb-6">{error || 'The requested movie or event could not be found.'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-6 py-3 bg-black text-white font-black uppercase text-xs border-2 border-black shadow-neo hover:bg-yellow-400 hover:text-black transition-all cursor-pointer"
          >
            Return to Explore
          </button>
        </div>
      </div>
    );
  }

  const isMovie = event.type === 'movie';
  const embedUrl = isMovie ? extractYouTubeEmbedUrl(event.trailer_url) : null;

  // Group shows by City -> Date -> Cinema Chain / Venue
  const availableCities = Array.from(new Set(event.shows.map(s => s.venue.city)));
  const availableDates = Array.from(
    new Set(
      event.shows
        .filter(s => selectedCity === 'All' || s.venue.city === selectedCity)
        .map(s => s.date.split('T')[0])
    )
  );

  const availableFormats = Array.from(
    new Set(
      event.shows
        .map(s => s.format)
        .filter(Boolean) as string[]
    )
  );

  const filteredShows = event.shows.filter(s => {
    const cityMatch = selectedCity === 'All' || s.venue.city === selectedCity;
    const dateMatch = !selectedDate || s.date.split('T')[0] === selectedDate;
    const formatMatch = selectedFormatFilter === 'All' || s.format === selectedFormatFilter;
    return cityMatch && dateMatch && formatMatch;
  });

  // Group filtered shows by Venue
  const venueGroupMap = new Map<string, { venue: ShowItem['venue']; shows: ShowItem[] }>();
  filteredShows.forEach(s => {
    if (!venueGroupMap.has(s.venue.id)) {
      venueGroupMap.set(s.venue.id, { venue: s.venue, shows: [] });
    }
    venueGroupMap.get(s.venue.id)!.shows.push(s);
  });

  const venueGroups = Array.from(venueGroupMap.values());

  const handleShowClick = (showId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPendingShowId(showId);
  };

  const handleConfirmSeatCount = () => {
    if (pendingShowId) {
      navigate(`/events/${event.id}/shows/${pendingShowId}/map`, {
        state: { autoHoldCount: selectedSeatsCount }
      });
    }
  };

  const castMembers = event.cast ? event.cast.split(',').map(c => c.trim()) : [];

  return (
    <div className="pb-24 space-y-10">
      
      {/* 1. CINEMATIC HERO BANNER */}
      <div className="bg-[#0c0f17] text-white border-b-4 border-black p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 sm:gap-10 items-start relative z-10">
          
          {/* Poster Column */}
          <div className="w-full sm:w-80 md:w-72 flex-shrink-0 flex flex-col gap-3">
            <div className="border-4 border-yellow-400 shadow-neo bg-black overflow-hidden group relative">
              <img
                src={event.poster_url || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600'}
                alt={event.title}
                className="w-full h-96 md:h-[420px] object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3 bg-black text-yellow-300 border-2 border-black px-2.5 py-1 font-mono font-black text-xs uppercase shadow-neo-sm">
                {isMovie ? 'In Cinemas' : 'Live Event'}
              </div>
            </div>

            {/* Dedicated Watch Trailer Button Below Poster (ONLY FOR MOVIES) */}
            {isMovie && embedUrl && (
              <button
                onClick={() => setShowTrailerModal(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-mono font-black text-sm uppercase py-3 px-4 border-3 border-black shadow-neo flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl font-black">play_circle</span>
                <span>WATCH TRAILER</span>
              </button>
            )}
          </div>

          {/* Metadata & Synopsis */}
          <div className="flex-grow space-y-5">
            
            {/* Metadata Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-yellow-400 text-black border-2 border-black font-black text-xs uppercase px-3 py-1 shadow-neo-sm">
                {event.type}
              </span>
              
              {isMovie && event.certification && (
                <span className="bg-red-600 text-white border-2 border-black font-black text-xs uppercase px-3 py-1 shadow-neo-sm tracking-wider">
                  RATED {event.certification}
                </span>
              )}
              
              {event.language && (
                <span className="bg-white text-black border-2 border-black font-mono font-bold text-xs uppercase px-3 py-1 shadow-neo-sm">
                  {event.language}
                </span>
              )}
              
              {isMovie && event.format && (
                <span className="bg-blue-500 text-white border-2 border-black font-mono font-black text-xs uppercase px-3 py-1 shadow-neo-sm">
                  {event.format}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-yellow-300 leading-none">
              {event.title}
            </h1>

            {/* Viewer Aggregate Rating & Quick Actions */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-y-2 border-slate-700/60">
              <div className="flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 border-2 border-black font-mono font-black text-xl shadow-neo">
                <span className="text-2xl">★</span>
                <span>{event.average_rating !== null && event.average_rating !== undefined ? event.average_rating : 'N/A'}</span>
                <span className="text-xs font-bold text-black/70">/ 5</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm text-slate-300">
                  ({event.review_count} {event.review_count === 1 ? 'user rating' : 'user ratings'})
                </span>
                
                <button
                  onClick={scrollToReviewSection}
                  className="px-3.5 py-2 bg-white text-black border-2 border-black font-mono font-black text-xs uppercase hover:bg-yellow-300 transition-all shadow-neo-sm cursor-pointer"
                >
                  {isMovie ? 'Rate Movie' : 'Rate Event'}
                </button>

                {isMovie && embedUrl && (
                  <button
                    onClick={() => setShowTrailerModal(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-mono font-black text-xs uppercase transition-all shadow-neo-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">play_circle</span>
                    <span>Trailer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Genre & Cast Tags */}
            <div className="space-y-2 text-sm font-mono">
              {event.genre && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-yellow-400 font-bold uppercase text-xs">Genre:</span>
                  <span className="text-slate-200 bg-slate-800/80 px-2.5 py-0.5 border border-slate-700 font-bold text-xs uppercase">
                    {event.genre}
                  </span>
                </div>
              )}
              
              {isMovie && castMembers.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-yellow-400 font-bold uppercase text-xs">Cast:</span>
                  {castMembers.map((actor, idx) => (
                    <span key={idx} className="bg-slate-800 text-slate-100 border border-slate-600 px-2.5 py-0.5 text-xs font-bold">
                      {actor}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-3xl pt-1">
              {event.description}
            </p>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-10">

        {/* 2. COMPACT TRAILER PROMPT BANNER (MOVIES ONLY) */}
        {isMovie && embedUrl && (
          <div className="bg-yellow-300 border-4 border-black p-4 sm:p-5 shadow-neo flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-black text-yellow-300 border-2 border-black flex items-center justify-center font-black shrink-0">
                <span className="material-symbols-outlined text-2xl">movie</span>
              </div>
              <div>
                <span className="bg-black text-white font-mono font-black text-[10px] uppercase px-2 py-0.5 border border-black">
                  OFFICIAL TRAILER
                </span>
                <h3 className="font-black text-base sm:text-lg uppercase text-black leading-tight mt-0.5">
                  Watch {event.title} Official Trailer
                </h3>
              </div>
            </div>

            <button
              onClick={() => setShowTrailerModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-black text-white hover:bg-white hover:text-black font-black uppercase text-xs border-2 border-black shadow-neo-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              <span>Watch Trailer Popup</span>
            </button>
          </div>
        )}

        {/* 3. HIGH-CONTRAST SHOWTIMES & CINEMAS SECTION (Inspired by Image 3) */}
        <section className="blueprint-bg bg-stone-50 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 sm:p-8 space-y-6">
          
          {/* Header & City Selector */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-black pb-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl sm:text-3xl font-black text-yellow-500 bg-black p-2 border-2 border-black shadow-neo-sm">
                schedule
              </span>
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-600 block">
                  {isMovie ? 'REAL-TIME SEAT LOCK ENGINE' : 'LIVE EVENT TICKET SELECTION'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                  {isMovie ? 'SELECT SHOW TIMING' : 'AVAILABLE SHOWTIMES & TICKETS'}
                </h2>
              </div>
            </div>

            {/* Controls: View Mode Toggle & City Dropdown */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center border-2 border-black bg-white">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 font-mono font-black text-xs uppercase transition-all ${
                    viewMode === 'cards' ? 'bg-black text-yellow-300' : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  Show Cards
                </button>
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1.5 font-mono font-black text-xs uppercase transition-all ${
                    viewMode === 'grouped' ? 'bg-black text-yellow-300' : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  By Cinema
                </button>
              </div>

              {availableCities.length > 0 && (
                <div className="flex items-center gap-2 bg-yellow-300 border-2 border-black px-3 py-1.5 shadow-neo-sm">
                  <span className="font-mono text-xs font-black uppercase text-black">LOCATION:</span>
                  <select
                    value={selectedCity}
                    onChange={e => {
                      setSelectedCity(e.target.value);
                      setSelectedDate('');
                    }}
                    className="bg-white border border-black font-mono font-black text-xs uppercase px-2 py-0.5 outline-none cursor-pointer"
                  >
                    <option value="All">ALL CITIES</option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Date Selector Strip */}
          {availableDates.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-700">
                Select Date:
              </span>
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1">
                {availableDates.map(dStr => {
                  const dateObj = new Date(dStr);
                  const isSelected = selectedDate === dStr;
                  return (
                    <button
                      key={dStr}
                      onClick={() => setSelectedDate(dStr)}
                      className={`flex-shrink-0 w-24 p-3 border-3 border-black text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-yellow-400 text-black font-black shadow-neo translate-y-[-2px] scale-105'
                          : 'bg-white text-black hover:bg-yellow-200 shadow-neo-sm'
                      }`}
                    >
                      <span className="block text-[10px] font-mono uppercase font-bold text-slate-600">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      <span className="block text-2xl font-black font-mono my-0.5">
                        {dateObj.getDate()}
                      </span>
                      <span className="block text-[10px] font-mono uppercase font-black text-slate-700">
                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Format Attribute Filter Chips */}
          {availableFormats.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 pb-3 border-b-2 border-black/20">
              <span className="text-xs font-mono font-bold uppercase text-slate-700 mr-1">Filter Format:</span>
              <button
                onClick={() => setSelectedFormatFilter('All')}
                className={`px-3 py-1 font-mono font-bold text-xs uppercase border-2 border-black transition-all cursor-pointer ${
                  selectedFormatFilter === 'All'
                    ? 'bg-black text-yellow-300 shadow-neo-sm'
                    : 'bg-white text-black hover:bg-slate-100'
                }`}
              >
                All Formats
              </button>
              {availableFormats.map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setSelectedFormatFilter(fmt)}
                  className={`px-3 py-1 font-mono font-bold text-xs uppercase border-2 border-black transition-all cursor-pointer ${
                    selectedFormatFilter === fmt
                      ? 'bg-blue-600 text-white shadow-neo-sm'
                      : 'bg-white text-black hover:bg-slate-100'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          )}

          {/* SHOWTIMES DISPLAY SECTION */}
          {filteredShows.length === 0 ? (
            <div className="p-10 text-center bg-white border-3 border-dashed border-black font-mono font-bold uppercase text-slate-700">
              No showtimes available for the selected date or location filters. Please choose another date.
            </div>
          ) : viewMode === 'cards' ? (
            
            /* OPTION A: HIGH-CONTRAST SHOWTIME CARDS (DIRECT INSPO FROM IMAGE 3) */
            <div className="space-y-4 pt-2">
              {filteredShows.map((show, idx) => (
                <div
                  key={show.id}
                  className="bg-yellow-100/90 border-4 border-black p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  {/* Left: Show Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-black text-yellow-300 font-mono font-black text-xs uppercase px-2.5 py-1 border border-black shadow-neo-sm">
                        SHOW #{idx + 1}
                      </span>
                      
                      <span className="font-mono text-xs font-black uppercase text-black bg-white border border-black px-2 py-0.5">
                        {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </span>

                      {show.format && (
                        <span className="bg-blue-600 text-white font-mono font-black text-xs uppercase px-2 py-0.5 border border-black">
                          {show.format}
                        </span>
                      )}

                      {show.language && (
                        <span className="bg-stone-200 text-black font-mono font-black text-xs uppercase px-2 py-0.5 border border-black">
                          {show.language}
                        </span>
                      )}
                    </div>

                    {/* Display Time */}
                    <div className="flex items-baseline gap-3">
                      <h3 className="font-display-xl text-3xl sm:text-5xl font-black text-black tracking-tight leading-none">
                        {show.time} IST
                      </h3>
                    </div>

                    {/* Location Line */}
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 pt-1">
                      <span className="material-symbols-outlined text-base font-black text-red-600">location_on</span>
                      <span>{show.venue.name.toUpperCase()} ({show.venue.city.toUpperCase()})</span>
                    </div>
                  </div>

                  {/* Right: Book Seats Action Button */}
                  <div className="w-full md:w-auto flex md:flex-col items-end justify-between md:justify-center gap-2 pt-2 md:pt-0">
                    <button
                      onClick={() => handleShowClick(show.id)}
                      className="w-full md:w-auto bg-yellow-400 text-black font-headline-lg font-black text-sm uppercase px-6 py-3.5 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-yellow-400 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>BOOK SEATS</span>
                      <span className="font-black text-lg">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          ) : (
            
            /* OPTION B: CINEMA GROUPED VIEW */
            <div className="space-y-6 pt-2">
              {venueGroups.map(({ venue, shows }) => (
                <div
                  key={venue.id}
                  className="border-4 border-black p-5 sm:p-6 bg-white flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                >
                  {/* Left: Cinema Info */}
                  <div className="space-y-2 max-w-md">
                    <div className="flex items-center gap-2.5">
                      {venue.chain && venue.chain !== 'Independent' && (
                        <span className="bg-black text-yellow-300 font-mono font-black text-[11px] uppercase px-2.5 py-0.5 border border-black shadow-neo-sm">
                          {venue.chain}
                        </span>
                      )}
                      <h3 className="font-black text-lg sm:text-xl uppercase tracking-tight text-black">
                        {venue.name}
                      </h3>
                    </div>
                    
                    <p className="text-xs font-mono text-slate-700 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-red-600">location_on</span>
                      <span>{venue.address}, {venue.city}</span>
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="bg-slate-200 border border-slate-800 text-[9px] font-mono font-bold uppercase px-2 py-0.5">
                        M-Ticket
                      </span>
                      <span className="bg-slate-200 border border-slate-800 text-[9px] font-mono font-bold uppercase px-2 py-0.5">
                        F&B Available
                      </span>
                    </div>
                  </div>

                  {/* Right: Showtime Slots */}
                  <div className="flex flex-wrap gap-3.5 w-full lg:w-auto">
                    {shows.map(show => (
                      <button
                        key={show.id}
                        onClick={() => handleShowClick(show.id)}
                        className="group bg-yellow-100 border-3 border-black p-3.5 hover:bg-yellow-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-left min-w-[120px] cursor-pointer"
                      >
                        <span className="block font-mono font-black text-lg text-black group-hover:text-black">
                          {show.time}
                        </span>
                        
                        <div className="flex flex-col gap-0.5 text-[10px] font-mono font-bold uppercase mt-1">
                          {show.format && (
                            <span className="text-blue-800 font-black">
                              {show.format}
                            </span>
                          )}
                          {show.language && (
                            <span className="text-slate-700">
                              {show.language}
                            </span>
                          )}
                        </div>

                        <span className="block text-[10px] font-mono font-black text-emerald-800 uppercase mt-1.5">
                          Book Seats →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          )}
        </section>

        {/* 4. REAL-TIME AUDIENCE REVIEWS & RATINGS SECTION */}
        <section id="reviews-section" className="space-y-6 bg-white border-4 border-black shadow-neo p-6 sm:p-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-black pb-5">
            <div>
              <span className="text-xs font-mono font-black uppercase tracking-widest text-slate-500 block mb-1">
                Audience Feedback
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                Reviews & Ratings
              </h2>
            </div>

            <div className="bg-yellow-400 border-3 border-black px-5 py-2.5 shadow-neo flex items-center gap-3">
              <span className="text-2xl">★</span>
              <span className="font-mono font-black text-2xl">
                {event.average_rating !== null && event.average_rating !== undefined ? event.average_rating : 'N/A'}
              </span>
              <span className="font-mono text-xs font-bold text-black/80">/ 5</span>
            </div>
          </div>

          {/* Interactive Review Form */}
          <div className="bg-yellow-50 border-3 border-black p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black/20 pb-3">
              <h3 className="font-black text-xl uppercase text-black">Rate & Review Movie</h3>
              <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                Real-Time Community Rating
              </span>
            </div>

            {!user ? (
              <div className="bg-white border-2 border-black p-4 font-mono text-sm text-slate-800 flex items-center justify-between">
                <span>Sign in to post your review and rate this movie.</span>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-black text-white font-black text-xs uppercase border-2 border-black shadow-neo hover:bg-yellow-400 hover:text-black transition-all cursor-pointer"
                >
                  Log In
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-5">
                {reviewStatusMessage && (
                  <div className={`font-mono font-bold text-xs sm:text-sm p-3.5 border-2 border-black ${
                    reviewStatusMessage.isError ? 'bg-red-200 text-red-950' : 'bg-emerald-200 text-emerald-950'
                  }`}>
                    {reviewStatusMessage.text}
                  </div>
                )}

                {/* 5 Star Selection */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase text-black mb-2">
                    Select Your Rating:
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isActive = (hoverRating || userRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                          className={`w-12 h-12 font-mono font-black text-2xl border-2 border-black transition-all cursor-pointer ${
                            isActive
                              ? 'bg-yellow-400 text-black shadow-neo-sm scale-105'
                              : 'bg-white text-slate-300 hover:bg-yellow-100'
                          }`}
                        >
                          ★
                        </button>
                      );
                    })}
                    <span className="ml-3 font-mono font-black text-lg text-black">
                      {userRating} / 5 Stars
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-xs font-mono font-black uppercase text-black mb-2">
                    Your Written Review:
                  </label>
                  <textarea
                    value={userReviewText}
                    onChange={e => setUserReviewText(e.target.value)}
                    placeholder="Write your honest review about the movie performances, story, visual effects, and theater experience..."
                    rows={3}
                    className="w-full p-4 border-2 border-black font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-8 py-3.5 bg-black text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-neo hover:bg-yellow-400 hover:text-black transition-all cursor-pointer"
                >
                  {submittingReview ? 'Publishing Review...' : 'Post Review Now'}
                </button>
              </form>
            )}
          </div>

          {/* Existing Reviews Feed */}
          <div className="space-y-4 pt-2">
            <h4 className="font-mono font-black text-xs uppercase tracking-widest text-slate-600">
              Verified Audience Reviews ({event.reviews.length})
            </h4>

            {event.reviews.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 border-2 border-dashed border-slate-300 font-mono text-sm text-slate-600">
                No audience reviews posted yet. Be the first to rate and review!
              </div>
            ) : (
              <div className="space-y-4">
                {event.reviews.map(rev => (
                  <div key={rev.id} className="border-3 border-black p-5 bg-stone-50 space-y-2 hover:shadow-neo-sm transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black text-white font-mono font-black text-xs flex items-center justify-center border border-black">
                          {rev.customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-black text-sm uppercase text-black">{rev.customer.name}</span>
                        
                        <span className="bg-yellow-400 border border-black font-mono font-black text-xs px-2.5 py-0.5">
                          ★ {rev.rating} / 5
                        </span>
                      </div>
                      
                      <span className="font-mono text-[11px] text-slate-500 font-bold">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="font-mono text-sm text-slate-800 leading-relaxed pt-1">
                      "{rev.review_text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* POPUP TRAILER MODAL */}
      {showTrailerModal && embedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-yellow-300 border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-3xl w-full p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center border-b-3 border-black pb-3">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white font-mono font-black text-xs uppercase px-2.5 py-1">
                  OFFICIAL TRAILER
                </span>
                <h3 className="font-black text-lg uppercase text-black truncate max-w-md">
                  {event.title}
                </h3>
              </div>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="w-9 h-9 bg-red-600 text-white border-2 border-black font-black text-lg flex items-center justify-center hover:bg-black transition-all cursor-pointer shadow-neo-sm"
              >
                ✕
              </button>
            </div>

            <div className="w-full aspect-video border-4 border-black shadow-neo bg-black overflow-hidden relative">
              <iframe
                src={`${embedUrl}?autoplay=1`}
                title={`${event.title} Official Trailer`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* SEAT COUNT PROMPT MODAL */}
      {pendingShowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-yellow-300 border-4 border-black shadow-neo p-6 sm:p-8 max-w-md w-full space-y-6 animate-fade-in">
            <div className="flex justify-between items-center border-b-3 border-black pb-3">
              <h3 className="font-black text-xl uppercase text-black">Select Seats Count</h3>
              <button
                onClick={() => setPendingShowId(null)}
                className="w-8 h-8 bg-white border-2 border-black font-bold text-lg flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="font-mono text-sm text-black">
              How many tickets would you like to book?
            </p>

            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  onClick={() => setSelectedSeatsCount(count)}
                  className={`py-3 font-mono font-black text-lg border-2 border-black transition-all cursor-pointer ${
                    selectedSeatsCount === count
                      ? 'bg-black text-white shadow-neo'
                      : 'bg-white text-black hover:bg-yellow-100'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <button
              onClick={handleConfirmSeatCount}
              className="w-full py-4 bg-black text-white font-black uppercase text-sm border-2 border-black shadow-neo hover:bg-white hover:text-black transition-all cursor-pointer"
            >
              Select Seats on Map →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
