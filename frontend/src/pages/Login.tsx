import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(res.data.user, res.data.token);
      
      if (res.data.user.role === 'admin') navigate('/admin/venues');
      else if (res.data.user.role === 'organiser') navigate('/organiser/dashboard');
      else navigate('/events');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 neo-card p-8">
      <h1 className="text-4xl font-black uppercase mb-6 bg-seatzy-acid-yellow inline-block px-2 border-2 border-seatzy-black">Login</h1>
      {error && <div className="bg-seatzy-magenta text-seatzy-white p-3 font-mono mb-4 border-2 border-seatzy-black">{error}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-bold uppercase text-sm">Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="neo-input" 
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-bold uppercase text-sm">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            className="neo-input" 
            required
          />
        </div>
        <button type="submit" className="neo-btn bg-seatzy-cyan text-seatzy-black py-3 mt-4 text-xl">Sign In</button>
      </form>
    </div>
  );
}
