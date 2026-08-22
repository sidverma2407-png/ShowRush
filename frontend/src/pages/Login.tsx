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

  const handleResendCode = async () => {
    setError('');
    try {
      const res = await fetchApi('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      showSuccess(`A new 6-digit verification code has been sent to ${email}.`, { title: 'CODE RESENT' });
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
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
    <main className="w-full max-w-[1200px] mx-auto flex flex-col md:flex-row border-2 sm:border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-surface my-4 md:my-10 min-h-0 md:min-h-[600px] md:h-[85vh]">
      {/* Left Panel: Brand / Visual Anchor */}
      <section className="w-full md:w-1/2 bg-on-background text-on-primary flex flex-col justify-between p-5 sm:p-8 md:p-12 border-b-4 md:border-b-0 md:border-r-4 border-on-background relative overflow-hidden">
        <div className="z-10 flex flex-col gap-4 sm:gap-8">
          <h1 className="font-display-xl text-3xl sm:text-4xl md:text-5xl uppercase text-primary-container leading-none font-black italic tracking-tighter">
            SEATZY
          </h1>
          <div className="mt-2 sm:mt-6">
            <h2 className="font-display-xl text-3xl sm:text-5xl md:text-[64px] uppercase text-primary-container leading-none font-black">
              GET IN<br className="hidden sm:inline" /> THE SEAT
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 sm:mt-6">
            <span className="bg-tertiary-fixed text-on-tertiary-fixed font-data-label text-[10px] sm:text-xs px-3 py-1.5 border border-sm:border-2 border-on-background uppercase font-bold">Verified Email</span>
            <span className="bg-primary-container text-on-primary-container font-data-label text-[10px] sm:text-xs px-3 py-1.5 border border-sm:border-2 border-on-background uppercase font-bold">QR Email Tickets</span>
            <span className="bg-secondary text-on-secondary font-data-label text-[10px] sm:text-xs px-3 py-1.5 border border-sm:border-2 border-on-background uppercase font-bold">Instant Access</span>
          </div>
        </div>
        <div className="z-10 mt-6 md:mt-auto pt-4 md:pt-12">
          <p className="font-data-label text-xs sm:text-sm text-surface-variant max-w-sm uppercase font-bold">
            Access live events. Valid email required for verified tickets & automated QR code delivery.
          </p>
        </div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container opacity-20 transform rotate-45 pointer-events-none"></div>
      </section>

      {/* Right Panel: Login / OTP Form */}
      <section className="w-full md:w-1/2 bg-surface p-5 sm:p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto flex flex-col gap-6 sm:gap-8">
          
          {!showOtpView ? (
            <>
              <div className="flex flex-col gap-1.5 sm:gap-2">
                <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl uppercase text-on-background font-black">Access Core</h2>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">Enter your verified email and access code.</p>
              </div>
              
              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs sm:text-sm flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-data-label text-xs sm:text-sm uppercase text-on-background font-bold">Email Identifier</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-lowest text-on-background font-data-label text-xs sm:text-sm px-4 py-3.5 border-2 border-on-background focus:outline-none focus:ring-0 focus:border-primary placeholder:text-outline-variant transition-colors min-h-[44px] font-bold"
                    placeholder="USER@SEATZY.COM"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="font-data-label text-xs sm:text-sm uppercase text-on-background font-bold">Access Code</label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-lowest text-on-background font-data-label text-xs sm:text-sm px-4 py-3.5 border-2 border-on-background focus:outline-none focus:ring-0 focus:border-primary placeholder:text-outline-variant transition-colors min-h-[44px] font-bold"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg text-sm sm:text-base uppercase py-3.5 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mt-2 flex justify-center items-center gap-2 disabled:opacity-50 font-black cursor-pointer min-h-[44px]"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <span className="material-symbols-outlined font-bold">login</span>
                </button>
              </form>
              
              <div className="mt-4 sm:mt-8 text-center border-t-2 border-on-background pt-4 sm:pt-6">
                <p className="font-data-label text-xs sm:text-sm text-on-surface-variant uppercase font-bold">
                  No access yet?{' '}
                  <Link to="/register" className="text-on-background font-black underline hover:bg-primary-container transition-colors px-1">
                    Register Entity
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* OTP Verification overlay for unverified login attempt */
            <div className="flex flex-col gap-4 sm:gap-6 bg-surface p-4 sm:p-6 border-2 sm:border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl font-black">mark_email_read</span>
                  <span className="font-headline-lg text-lg sm:text-xl uppercase font-black">Verify Email Required</span>
                </div>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">
                  Please verify your email address (<span className="bg-primary-container px-1 font-black">{email}</span>) to log in.
                </p>
              </div>

              {devOtp && (
                <div className="bg-amber-200 border-2 border-on-background p-2.5">
                  <p className="font-data-label text-xs uppercase font-black text-on-background">DEV AUTO-FILL OTP: {devOtp}</p>
                </div>
              )}

              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs flex items-center gap-2 font-bold">
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
                  className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-display-xl text-2xl sm:text-3xl text-center tracking-[6px] sm:tracking-[8px] focus:outline-none min-h-[44px]"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg text-sm sm:text-lg uppercase py-3 border-2 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black min-h-[44px]"
                >
                  {verifying ? 'Verifying...' : 'VERIFY & SIGN IN'}
                </button>
              </form>

              <div className="flex justify-between items-center border-t-2 border-on-background pt-3 font-data-label text-xs">
                <button
                  type="button"
                  onClick={() => setShowOtpView(false)}
                  className="uppercase font-bold underline hover:text-primary cursor-pointer min-h-[44px] flex items-center"
                >
                  Back to Sign In
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="uppercase font-bold text-primary underline hover:text-on-background cursor-pointer min-h-[44px] flex items-center"
                >
                  Resend OTP Code
                </button>
              </div>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
