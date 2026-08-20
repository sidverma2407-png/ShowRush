import { useEffect, useState, type FormEvent } from 'react';
import { fetchApi } from '../api/client';

export default function AdminVenues() {
  const [venues, setVenues] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const loadVenues = () => {
    fetchApi('/venues')
      .then(res => setVenues(res.data))
      .catch(err => console.error('Failed to fetch venues:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const handleCreate = async (e: FormEvent) => {
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      <h1 className="text-4xl font-black uppercase bg-seatzy-black text-seatzy-white inline-block px-4 py-2 border-4 border-seatzy-black self-start">
        Admin: Venues
      </h1>

      <div className="neo-card p-6">
        <h2 className="text-2xl font-black uppercase mb-4 bg-seatzy-acid-yellow inline-block px-2 border-2 border-seatzy-black">Create Venue</h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input type="text" placeholder="Venue Name" value={name} onChange={e => setName(e.target.value)} className="neo-input flex-grow" required />
          <input type="text" placeholder="Address" value={address} onChange={e => setAddress(e.target.value)} className="neo-input flex-grow" required />
          <button type="submit" className="neo-btn bg-seatzy-cyan px-6">CREATE</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {venues.map(v => (
          <div key={v.id} className="neo-card p-4 flex flex-col gap-2">
            <h3 className="text-xl font-black uppercase">{v.name}</h3>
            <span className="font-mono text-sm">{v.address}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
