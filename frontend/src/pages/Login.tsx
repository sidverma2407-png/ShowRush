import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Unverified email handling state
  const [showOtpView, setShowOtpView] = useState(false);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const { showSuccess } = useModalStore();

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
      navigate(res.data.user.role === 'organiser' ? '/organiser/dashboard' : '/explore');
    } catch (err: any) {
      if (err.message?.includes('verify your email')) {
        // Trigger OTP resend and show OTP entry
        try {
          const resendRes = await fetchApi('/auth/resend-otp', {
            method: 'POST',
            body: JSON.stringify({ email })
          });
          if (resendRes.data?.dev_otp) setDevOtp(resendRes.data.dev_otp);
          setShowOtpView(true);
        } catch (resendErr) {
          setShowOtpView(true);
        }
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter 6-digit OTP code');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const res = await fetchApi('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp: otp.trim() })
      });
      showSuccess('Email verified! Logging you in...', {
        title: 'VERIFIED',
        onClose: () => {
          login(res.data.user, res.data.token);
          navigate(res.data.user.role === 'organiser' ? '/organiser/dashboard' : '/explore');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
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
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-data-label px-4 py-2 neo-border uppercase font-bold">Verified Email</span>
            <span className="bg-primary-container text-on-primary-container font-data-label text-data-label px-4 py-2 neo-border uppercase font-bold">QR Email Tickets</span>
            <span className="bg-secondary text-on-secondary font-data-label text-data-label px-4 py-2 neo-border uppercase font-bold">Instant Access</span>
          </div>
        </div>
        <div className="z-10 mt-auto pt-12">
          <p className="font-data-label text-data-label text-surface-variant max-w-sm uppercase font-bold">
            Access live events. Valid email required for verified tickets & automated QR code delivery.
          </p>
        </div>
        {/* Abstract background shape element */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container opacity-20 transform rotate-45 pointer-events-none"></div>
      </section>

      {/* Right Panel: Login / OTP Form */}
      <section className="w-full md:w-1/2 bg-surface p-6 md:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto flex flex-col gap-8">
          
          {!showOtpView ? (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase text-on-background font-black">Access Core</h2>
                <p className="font-body-md text-body-md text-on-surface-variant font-bold">Enter your verified email and access code.</p>
              </div>
              
              {error && (
                <div className="bg-error text-on-error neo-border px-4 py-3 font-data-label text-data-label flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-data-label text-data-label uppercase text-on-background font-bold">Email Identifier</label>
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
                    <label htmlFor="password" className="font-data-label text-data-label uppercase text-on-background font-bold">Access Code</label>
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
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg-mobile text-headline-lg-mobile uppercase py-4 neo-border neo-shadow neo-shadow-hover neo-shadow-active transition-all mt-4 flex justify-center items-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <span className="material-symbols-outlined font-bold">login</span>
                </button>
              </form>
              
              <div className="mt-8 text-center border-t-border-width border-on-background pt-6">
                <p className="font-data-label text-data-label text-on-surface-variant uppercase font-bold">
                  No access yet?{' '}
                  <Link to="/register" className="text-on-background font-black underline hover:bg-primary-container transition-colors px-1">
                    Register Entity
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* OTP Verification overlay for unverified login attempt */
            <div className="flex flex-col gap-6 bg-surface p-6 border-4 border-on-background neo-shadow">
              <div>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-3xl font-black">mark_email_read</span>
                  <span className="font-headline-lg-mobile text-xl uppercase font-black">Verify Email Required</span>
                </div>
                <p className="font-body-md text-on-surface-variant font-bold">
                  Please verify your email address (<span className="bg-primary-container px-1 font-black">{email}</span>) to log in.
                </p>
              </div>

              {devOtp && (
                <div className="bg-amber-200 border-2 border-on-background p-3">
                  <p className="font-data-label text-xs uppercase font-black text-on-background">DEV AUTO-FILL OTP: {devOtp}</p>
                </div>
              )}

              {error && (
                <div className="bg-error text-on-error neo-border px-4 py-3 font-data-label text-data-label flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full neo-border p-4 bg-surface-lowest text-on-background font-display-xl text-3xl text-center tracking-[8px] focus:outline-none"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg-mobile text-lg uppercase py-3 neo-border neo-shadow font-black"
                >
                  {verifying ? 'Verifying...' : 'VERIFY & SIGN IN'}
                </button>
              </form>

              <button
                onClick={() => setShowOtpView(false)}
                className="font-data-label text-xs uppercase font-bold text-center underline hover:text-primary cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
