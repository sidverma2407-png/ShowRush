import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { Link } from 'react-router-dom';

export default function OrganiserDashboard() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryModal, setSummaryModal] = useState<any | null>(null);
  const [createEventModal, setCreateEventModal] = useState(false);
  const [newEventData, setNewEventData] = useState({ title: '', type: 'movie', description: '', poster_url: '' });

  const fetchDashboardEvents = () => {
    fetchApi('/organiser/events')
      .then(res => setEvents(res.data))
      .catch(err => console.error('Failed to fetch dashboard events:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardEvents();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-primary-container text-on-background border-4 border-on-background neo-brutalist-shadow px-12 py-8">
        <p className="font-display-xl text-4xl uppercase tracking-tighter">Loading Data...</p>
      </div>
    </div>
  );

  const handleManage = async (eventId: string, title: string) => {
    try {
      const res = await fetchApi(`/events/${eventId}/summary`); // This endpoint is mapped as /events/:id/summary
      setSummaryModal({ ...res.data, title });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/events', {
        method: 'POST',
        body: JSON.stringify(newEventData)
      });
      setCreateEventModal(false);
      setNewEventData({ title: '', type: 'movie', description: '', poster_url: '' });
      fetchDashboardEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full">
      {/* Header section */}
      <section className="bg-on-background py-8 px-margin-mobile md:px-margin-desktop border-b-4 border-on-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="font-display-xl text-display-xl text-on-primary uppercase leading-none break-words">
              COMMAND<br />CENTER
            </h1>
          </div>
          <div className="flex gap-4">
            <button className="bg-surface text-on-surface border-2 border-on-background px-6 py-3 font-headline-lg-mobile text-sm uppercase neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all">
              Reports
            </button>
            <button onClick={() => setCreateEventModal(true)} className="bg-primary-fixed text-on-background border-2 border-on-background px-6 py-3 font-headline-lg-mobile text-sm uppercase neo-brutalist-shadow neo-brutalist-hover neo-brutalist-active transition-all flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
              New Event
            </button>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-12">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface border-border-width border-on-background p-6 neo-brutalist-shadow flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-primary-fixed text-on-background font-data-label text-data-label px-2 py-1 uppercase border-l-4 border-b-4 border-on-background">Live</div>
             <span className="font-data-label text-data-label uppercase text-on-surface-variant mb-2">Total Events</span>
             <span className="font-display-xl text-6xl text-on-background">{events.length}</span>
             <div className="mt-4 border-t-2 border-on-background pt-4 flex justify-between items-center">
                <span className="font-data-label text-data-label uppercase text-on-surface-variant">+2 this month</span>
                <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
             </div>
          </div>
          <div className="bg-surface border-border-width border-on-background p-6 neo-brutalist-shadow flex flex-col relative overflow-hidden">
             <span className="font-data-label text-data-label uppercase text-on-surface-variant mb-2">Total Revenue</span>
             <span className="font-display-xl text-6xl text-on-background">₹0</span>
             <div className="mt-4 border-t-2 border-on-background pt-4 flex justify-between items-center">
                <span className="font-data-label text-data-label uppercase text-on-surface-variant">Waiting for sales</span>
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
             </div>
          </div>
          <div className="bg-surface border-border-width border-on-background p-6 neo-brutalist-shadow flex flex-col relative overflow-hidden bg-tertiary-container blueprint-bg">
             <span className="font-data-label text-data-label uppercase text-on-surface-variant mb-2">Active Holds</span>
             <span className="font-display-xl text-6xl text-on-background">0</span>
             <div className="mt-4 border-t-2 border-on-background pt-4 flex justify-between items-center">
                <span className="font-data-label text-data-label uppercase text-on-surface-variant">Seats currently locked</span>
                <span className="material-symbols-outlined text-on-background" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
             </div>
          </div>
        </div>

        {/* Event List */}
        <div>
          <div className="flex justify-between items-end border-b-4 border-on-background pb-4 mb-8">
             <h2 className="font-headline-lg-mobile text-headline-lg-mobile uppercase text-on-background">Active Events</h2>
             <Link to="#" className="font-data-label text-data-label uppercase text-on-surface-variant hover:text-primary transition-colors underline">View All</Link>
          </div>

          <div className="flex flex-col gap-6">
            {events.length === 0 ? (
               <div className="bg-surface-variant border-4 border-on-background p-12 text-center neo-brutalist-shadow">
                 <p className="font-data-label text-data-label uppercase">No events managed yet.</p>
               </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-surface border-border-width border-on-background flex flex-col md:flex-row neo-brutalist-shadow neo-brutalist-hover transition-all group overflow-hidden">
                  <div className="w-full md:w-48 h-48 md:h-auto border-b-4 md:border-b-0 md:border-r-4 border-on-background bg-surface-dim relative">
                    {event.poster_url ? (
                       <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center font-data-label text-data-label uppercase text-on-surface-variant blueprint-bg">No Poster</div>
                    )}
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-headline-lg-mobile text-xl uppercase bg-on-background text-primary-container px-2 py-1 inline-block">{event.title}</h3>
                        <span className="font-data-label text-xs uppercase bg-surface-variant border-2 border-on-background px-2 py-1">{event.type || 'Standard'}</span>
                      </div>
                      <p className="font-data-label text-data-label text-on-surface-variant uppercase line-clamp-1">{event.description}</p>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t-2 border-on-background">
                       <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
                         <span className="font-data-label text-data-label uppercase font-bold">{event.shows?.length || 0} Shows</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>confirmation_number</span>
                         <span className="font-data-label text-data-label uppercase font-bold">0 Sold</span>
                       </div>
                    </div>
                  </div>
                  <div className="w-full md:w-48 border-t-4 md:border-t-0 md:border-l-4 border-on-background p-6 flex flex-col justify-center items-center bg-surface-container gap-4">
                     <button 
                       onClick={() => handleManage(event.id, event.title)}
                       className="w-full bg-on-background text-on-primary border-2 border-on-background py-2 font-data-label text-data-label uppercase hover:bg-primary-fixed hover:text-on-background transition-colors"
                     >
                       Manage
                     </button>
                     <button className="w-full bg-surface text-on-surface border-2 border-on-background py-2 font-data-label text-data-label uppercase hover:bg-error hover:text-on-error transition-colors">
                       Cancel
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Summary Modal */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-xl uppercase tracking-tight">{summaryModal.title} - SUMMARY</h2>
              <button onClick={() => setSummaryModal(null)} className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 flex-grow overflow-y-auto blueprint-bg flex flex-col gap-6">
               <div className="bg-primary-fixed text-on-primary-fixed border-4 border-on-background p-6 neo-brutalist-shadow text-center">
                 <span className="font-data-label text-data-label uppercase mb-2 block">Total Revenue</span>
                 <span className="font-display-xl text-6xl block">₹{summaryModal.total_revenue.toFixed(2)}</span>
               </div>

               <div>
                 <h3 className="font-headline-lg-mobile text-lg uppercase bg-on-background text-primary-container inline-block px-2 py-1 mb-4">Recent Bookings</h3>
                 {summaryModal.recent_bookings?.length === 0 ? (
                   <div className="bg-surface border-2 border-on-background p-4 text-center font-data-label uppercase opacity-70">
                     No bookings yet.
                   </div>
                 ) : (
                   <div className="overflow-x-auto border-4 border-on-background bg-surface">
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-surface-variant font-data-label text-xs uppercase text-on-surface-variant border-b-4 border-on-background">
                         <tr>
                           <th className="p-3 border-r-2 border-on-background">Ref</th>
                           <th className="p-3 border-r-2 border-on-background">Customer</th>
                           <th className="p-3 border-r-2 border-on-background">Phone</th>
                           <th className="p-3 border-r-2 border-on-background text-right">Price</th>
                           <th className="p-3">Date</th>
                         </tr>
                       </thead>
                       <tbody className="font-data-label text-sm uppercase">
                         {summaryModal.recent_bookings?.map((b: any) => (
                           <tr key={b.id} className="border-b-2 border-on-background hover:bg-primary-container transition-colors">
                             <td className="p-3 border-r-2 border-on-background font-bold">{b.reference}</td>
                             <td className="p-3 border-r-2 border-on-background">{b.customer_name}</td>
                             <td className="p-3 border-r-2 border-on-background">{b.customer_phone}</td>
                             <td className="p-3 border-r-2 border-on-background text-right">₹{b.total_price.toFixed(2)}</td>
                             <td className="p-3">{new Date(b.date).toLocaleDateString()}</td>
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

      {/* Create Event Modal */}
      {createEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/80 backdrop-blur-sm">
          <div className="bg-surface border-4 border-on-background neo-brutalist-shadow w-full max-w-2xl flex flex-col relative">
            <div className="bg-on-background p-4 flex justify-between items-center text-on-primary">
              <h2 className="font-headline-lg-mobile text-xl uppercase tracking-tight">Create New Event</h2>
              <button onClick={() => setCreateEventModal(false)} className="w-8 h-8 flex items-center justify-center border-2 border-on-background bg-surface text-on-surface hover:bg-error hover:text-on-error transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-8 flex flex-col gap-6 blueprint-bg">
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Event Title</label>
                <input 
                  type="text" 
                  value={newEventData.title}
                  onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                  className="w-full bg-surface border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed"
                  required 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Event Type</label>
                <select 
                  value={newEventData.type}
                  onChange={e => setNewEventData({...newEventData, type: e.target.value})}
                  className="w-full bg-surface border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed"
                >
                  <option value="movie">MOVIE</option>
                  <option value="concert">CONCERT</option>
                  <option value="comedy">COMEDY</option>
                  <option value="sports">SPORTS</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Description</label>
                <textarea 
                  value={newEventData.description}
                  onChange={e => setNewEventData({...newEventData, description: e.target.value})}
                  className="w-full bg-surface border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed h-32"
                  required 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-data-label text-data-label uppercase">Poster URL (Optional)</label>
                <input 
                  type="url" 
                  value={newEventData.poster_url}
                  onChange={e => setNewEventData({...newEventData, poster_url: e.target.value})}
                  className="w-full bg-surface border-2 border-on-background p-3 font-data-label text-data-label focus:outline-none focus:border-primary-fixed"
                />
              </div>
              <button type="submit" className="mt-4 bg-primary-fixed text-on-background border-2 border-on-background py-4 font-headline-lg-mobile text-sm uppercase hover:bg-on-background hover:text-primary-fixed transition-colors neo-brutalist-shadow">
                Create Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
