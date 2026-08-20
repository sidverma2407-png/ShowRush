import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(res.data.user, res.data.token);
      navigate('/events');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-[1200px] mx-auto my-auto flex flex-col md:flex-row neo-border neo-shadow bg-surface min-h-[600px] h-[85vh] mt-[5vh]">
      {/* Left Panel: Brand / Visual Anchor */}
      <section className="w-full md:w-1/2 bg-on-background text-on-primary flex flex-col justify-between p-6 md:p-12 border-b-border-width md:border-b-0 md:border-r-border-width border-on-background relative overflow-hidden">
        <div className="z-10 flex flex-col gap-8">
          <h1 className="font-display-xl text-display-xl uppercase text-primary-container leading-none font-black italic tracking-tighter">
            SEATZY
          </h1>
          <div className="mt-8">
            <h1 className="font-display-xl text-[64px] uppercase text-primary-container leading-none">
              GET IN<br />THE SEAT
            </h1>
          </div>
          <div className="flex flex-wrap gap-4 mt-6">
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label px-4 py-2 neo-border uppercase">Fast</span>
            <span className="bg-primary-container text-on-primary-container font-data-label text-data-label px-4 py-2 neo-border uppercase">Live</span>
            <span className="bg-secondary text-on-secondary font-data-label text-data-label px-4 py-2 neo-border uppercase">Raw</span>
          </div>
        </div>
        <div className="z-10 mt-auto pt-12">
          <p className="font-data-label text-data-label text-surface-variant max-w-sm uppercase">
            Access the rawest live events. No soft tickets, no hidden fees. Just hard entry.
          </p>
        </div>
        {/* Abstract background shape element */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container opacity-20 transform rotate-45 pointer-events-none"></div>
      </section>

      {/* Right Panel: Login Form */}
      <section className="w-full md:w-1/2 bg-surface p-6 md:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-on-background">Access Core</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Enter your credentials to proceed.</p>
          </div>
          
          {error && (
            <div className="bg-error text-on-error neo-border px-4 py-3 font-data-label text-data-label">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-data-label text-data-label uppercase text-on-background">Email Identifier</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-lowest text-on-background font-data-label text-data-label px-4 py-4 neo-border focus:outline-none focus:ring-0 focus:border-primary placeholder:text-outline-variant transition-colors"
                placeholder="USER@SEATZY.COM"
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="font-data-label text-data-label uppercase text-on-background">Access Code</label>
                <Link to="#" className="font-data-label text-data-label text-secondary hover:text-primary transition-colors underline uppercase">Lost Code?</Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-lowest text-on-background font-data-label text-data-label px-4 py-4 neo-border focus:outline-none focus:ring-0 focus:border-primary placeholder:text-outline-variant transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-container font-headline-lg-mobile text-headline-lg-mobile uppercase py-4 neo-border neo-shadow neo-shadow-hover neo-shadow-active transition-all mt-4 flex justify-center items-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <span className="material-symbols-outlined font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
            </button>
          </form>
          
          <div className="mt-8 text-center border-t-border-width border-on-background pt-6">
            <p className="font-data-label text-data-label text-on-surface-variant uppercase">
              No access yet?{' '}
              <Link to="/register" className="text-on-background font-bold underline hover:bg-primary-container transition-colors px-1">
                Register Entity
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
