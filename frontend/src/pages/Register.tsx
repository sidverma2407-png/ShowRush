import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
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
    <div className="fixed inset-0 top-[57px] flex flex-col md:flex-row overflow-hidden">

      {/* ── LEFT PANEL: black brand block ── */}
      <div className="relative bg-seatzy-black flex flex-col justify-between p-10 md:p-14 w-full md:w-1/2 shrink-0 overflow-hidden border-r-4 border-seatzy-black">

        {/* Grid overlay — visible on black */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right,rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)',
            backgroundSize: '70px 70px'
          }}
        />

        {/* wordmark */}
        <div className="relative z-10">
          <h1 className="text-[clamp(4rem,10vw,8rem)] font-black uppercase tracking-tighter leading-none text-seatzy-acid-yellow"
            style={{ textShadow: '6px 6px 0 #F2FF00' }}>
            SEAT<br />ZY
          </h1>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mt-4 text-seatzy-white opacity-50">
            // Your ticket. Your seat. Now.
          </p>
        </div>

        {/* feature pills */}
        <div className="relative z-10 flex flex-col gap-3 mt-auto">
          {[
            { color: 'bg-seatzy-acid-yellow text-seatzy-black', text: '⚡ Real-time seat map' },
            { color: 'bg-seatzy-magenta text-seatzy-white', text: '🔒 Secure hold system' },
            { color: 'bg-seatzy-cyan text-seatzy-black', text: '📧 Instant QR tickets' },
          ].map(p => (
            <div key={p.text} className={`${p.color} border-2 border-seatzy-white font-mono text-xs font-bold px-3 py-2 shadow-neo-sm inline-block self-start`}>
              {p.text}
            </div>
          ))}
        </div>

        {/* big decorative number */}
        <span className="absolute bottom-6 right-8 text-[12rem] font-black text-seatzy-white opacity-5 leading-none select-none">02</span>
      </div>

      {/* ── RIGHT PANEL: form ── */}
      <div className="flex-grow bg-seatzy-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Page header band */}
          <div className="bg-seatzy-magenta text-seatzy-white border-4 border-seatzy-black shadow-neo-xl mb-8 px-6 py-4 flex items-center justify-between">
            <h2 className="text-4xl font-black uppercase tracking-tighter">Register</h2>
            <span className="font-mono text-seatzy-acid-yellow text-xs tracking-widest">→ step 1/1</span>
          </div>

          {error && (
            <div className="bg-seatzy-magenta text-seatzy-white border-4 border-seatzy-black shadow-neo px-4 py-3 mb-6 font-mono text-sm font-bold">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-black text-xs uppercase tracking-widest">Name</label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="neo-input w-full text-base"
                placeholder="Your full name"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-black text-xs uppercase tracking-widest">Email</label>
              <input
                id="register-email"
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
                id="register-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="neo-input w-full text-base"
                placeholder="Min 8 characters"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-black text-xs uppercase tracking-widest">I am a…</label>
              {/* Role selector as styled segmented buttons */}
              <div className="flex border-4 border-seatzy-black shadow-neo overflow-hidden">
                {(['customer', 'organiser'] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 font-black uppercase text-sm tracking-tight border-r-2 border-seatzy-black last:border-r-0 transition-colors
                      ${role === r
                        ? 'bg-seatzy-acid-yellow text-seatzy-black'
                        : 'bg-seatzy-white text-seatzy-black hover:bg-seatzy-gray-grid'
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="neo-btn-hero bg-seatzy-acid-yellow text-seatzy-black py-5 text-2xl w-full mt-2 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account →'}
            </button>
          </form>

          {/* Switch link */}
          <div className="mt-8 border-t-4 border-seatzy-black pt-6 flex items-center justify-between">
            <p className="font-mono text-sm">Already have an account?</p>
            <Link
              to="/login"
              className="neo-btn bg-seatzy-cyan text-seatzy-black px-5 py-2 text-sm shadow-neo"
            >
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
