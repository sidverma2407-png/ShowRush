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
    /* Full-viewport split — no outer padding so it truly bleeds */
    <div className="fixed inset-0 top-[57px] flex flex-col md:flex-row overflow-hidden">

      {/* ── LEFT PANEL: brand block ── */}
      <div className="relative bg-seatzy-acid-yellow border-r-4 border-seatzy-black flex flex-col justify-between p-10 md:p-14 w-full md:w-1/2 shrink-0 overflow-hidden">

        {/* Blueprint grid overlay on the yellow panel */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right,rgba(0,0,0,0.07) 1px,transparent 1px),linear-gradient(to bottom,rgba(0,0,0,0.07) 1px,transparent 1px)',
            backgroundSize: '70px 70px'
          }}
        />

        {/* wordmark */}
        <div className="relative z-10">
          <h1 className="text-[clamp(4rem,10vw,8rem)] font-black uppercase tracking-tighter leading-none text-seatzy-black"
            style={{ textShadow: '6px 6px 0 #000' }}>
            SEAT<br />ZY
          </h1>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mt-4 text-seatzy-black opacity-70">
            // Book smarter. Sit better.
          </p>
        </div>

        {/* bottom accent strip */}
        <div className="relative z-10 flex flex-col gap-3 mt-auto">
          <div className="flex gap-3">
            <div className="h-6 w-20 bg-seatzy-black border-2 border-seatzy-black" />
            <div className="h-6 w-10 bg-seatzy-magenta border-2 border-seatzy-black" />
            <div className="h-6 w-14 bg-seatzy-cyan border-2 border-seatzy-black" />
            <div className="h-6 w-8 bg-seatzy-black border-2 border-seatzy-black" />
          </div>
          <p className="font-mono text-xs opacity-60">Concurrent • Secure • Real-time</p>
        </div>

        {/* big decorative number */}
        <span className="absolute bottom-6 right-8 text-[12rem] font-black text-seatzy-black opacity-5 leading-none select-none">01</span>
      </div>

      {/* ── RIGHT PANEL: form ── */}
      <div className="flex-grow bg-seatzy-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Page header band */}
          <div className="bg-seatzy-black text-seatzy-white border-4 border-seatzy-black shadow-neo-xl mb-8 px-6 py-4 flex items-center justify-between">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Sign In</h2>
            <span className="font-mono text-seatzy-cyan text-xs tracking-widest">→ step 1/1</span>
          </div>

          {error && (
            <div className="bg-seatzy-magenta text-seatzy-white border-4 border-seatzy-black shadow-neo px-4 py-3 mb-6 font-mono text-sm font-bold">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <label className="font-black text-xs uppercase tracking-widest">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="neo-input w-full text-base"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-black text-xs uppercase tracking-widest">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="neo-input w-full text-base"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="neo-btn-hero bg-seatzy-acid-yellow text-seatzy-black py-5 text-2xl w-full mt-2 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          {/* Switch link */}
          <div className="mt-8 border-t-4 border-seatzy-black pt-6 flex items-center justify-between">
            <p className="font-mono text-sm">No account yet?</p>
            <Link
              to="/register"
              className="neo-btn bg-seatzy-cyan text-seatzy-black px-5 py-2 text-sm shadow-neo"
            >
              Register →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
