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
      if (err.status === 403 || err.data?.requires_verification || err.message?.toLowerCase().includes('verify')) {
        if (err.data?.dev_otp) setDevOtp(err.data.dev_otp);
        setShowOtpView(true);
      } else {
        setError(err.message || 'Invalid email or password. Please check your credentials.');
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
      setError('Please enter the 6-digit code sent to your email');
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
        title: 'VERIFICATION SUCCESS',
        onClose: () => {
          login(res.data.user, res.data.token);
          navigate(res.data.user.role === 'organiser' ? '/organiser/dashboard' : '/explore');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="w-full max-w-[1100px] mx-auto flex flex-col md:flex-row border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-surface my-6 md:my-12 min-h-0 md:min-h-[580px] overflow-hidden">
      {/* Left Branding Panel */}
      <section className="w-full md:w-5/12 bg-on-background text-on-primary flex flex-col justify-between p-6 sm:p-10 border-b-4 md:border-b-0 md:border-r-4 border-on-background relative overflow-hidden">
        <div className="z-10 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 bg-primary-fixed text-on-background font-mono text-xs font-black px-3 py-1 border-2 border-primary-fixed uppercase tracking-wider w-fit">
            SEATZY AUTH PORTAL
          </div>
          
          <div>
            <h1 className="font-display-xl text-4xl sm:text-5xl md:text-6xl uppercase text-primary-container leading-none font-black italic tracking-tighter">
              WELCOME BACK
            </h1>
            <p className="font-body-md text-sm text-surface-variant font-bold mt-3">
              Sign in to manage your bookings, discover exclusive live shows, and access instant QR tickets.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-3 bg-surface/10 p-3 border border-surface/20">
              <span className="material-symbols-outlined text-primary-container text-xl font-bold">verified_user</span>
              <span className="font-data-label text-xs uppercase text-on-primary font-bold">Email Verified Account Access</span>
            </div>
            <div className="flex items-center gap-3 bg-surface/10 p-3 border border-surface/20">
              <span className="material-symbols-outlined text-tertiary-fixed text-xl font-bold">qr_code_2</span>
              <span className="font-data-label text-xs uppercase text-on-primary font-bold">Instant Email QR Ticket Delivery</span>
            </div>
          </div>
        </div>

        <div className="z-10 mt-8 pt-4 border-t border-surface/20">
          <p className="font-mono text-[11px] text-surface-variant uppercase font-bold">
            Need help? Contact support@seatzy.com
          </p>
        </div>

        {/* Abstract Background Accent */}
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-primary-container/20 rounded-full blur-2xl pointer-events-none"></div>
      </section>

      {/* Right Form Panel */}
      <section className="w-full md:w-7/12 bg-surface p-6 sm:p-10 md:p-12 flex flex-col justify-center blueprint-bg">
        <div className="max-w-md w-full mx-auto flex flex-col gap-6">
          
          {!showOtpView ? (
            <>
              <div>
                <h2 className="font-headline-lg text-2xl sm:text-3xl uppercase text-on-background font-black tracking-tight">Sign In</h2>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold mt-1">Enter your registered account details below.</p>
              </div>
              
              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs sm:text-sm flex items-start gap-2.5 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-data-label text-xs uppercase text-on-background font-black flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">mail</span>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-lowest text-on-background font-data-label text-sm px-4 py-3 border-2 border-on-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold min-h-[46px]"
                    placeholder="name@example.com"
                    required
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="password" className="font-data-label text-xs uppercase text-on-background font-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">lock</span>
                      Password
                    </label>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-lowest text-on-background font-data-label text-sm px-4 py-3 border-2 border-on-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold min-h-[46px]"
                    placeholder="••••••••••••"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg text-sm sm:text-base uppercase py-3.5 border-2 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all mt-2 flex justify-center items-center gap-2 disabled:opacity-50 font-black cursor-pointer min-h-[46px]"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <span className="material-symbols-outlined font-bold text-base">arrow_forward</span>
                </button>
              </form>
              
              <div className="mt-4 text-center border-t-2 border-on-background/20 pt-5">
                <p className="font-data-label text-xs sm:text-sm text-on-surface-variant uppercase font-bold">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-on-background font-black underline hover:bg-primary-container transition-colors px-1 py-0.5">
                    Register Here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* OTP Verification overlay */
            <div className="flex flex-col gap-5 bg-surface p-5 sm:p-6 border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="material-symbols-outlined text-2xl font-black">mark_email_read</span>
                  <span className="font-headline-lg text-lg sm:text-xl uppercase font-black text-on-background">Verify Email Required</span>
                </div>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">
                  Please enter the 6-digit verification code sent to <span className="bg-primary-container text-on-background px-1.5 py-0.5 font-black">{email}</span>.
                </p>
              </div>

              <div className="bg-secondary-container border-2 border-on-background p-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-data-label text-[11px] uppercase font-black text-on-background">
                    {devOtp ? `DEV CODE: ${devOtp}` : 'TEST CODE READY'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp || '123456')}
                    className="bg-on-background text-on-primary text-[10px] font-mono font-bold px-2 py-0.5 border border-on-background hover:bg-primary-fixed hover:text-on-background transition-colors"
                  >
                    AUTO-FILL {devOtp || '123456'}
                  </button>
                </div>
                <p className="font-data-label text-[10px] text-on-surface-variant font-bold">
                  Didn't receive email? Enter code <strong className="text-on-background font-mono">123456</strong> to verify instantly.
                </p>
              </div>

              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-3.5 py-2.5 font-data-label text-xs flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-sm shrink-0">warning</span>
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
                  className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-display-xl text-3xl text-center tracking-[8px] focus:outline-none focus:border-primary min-h-[48px] font-bold"
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full bg-primary-container text-on-primary-container font-headline-lg text-sm uppercase py-3 border-2 border-on-background shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-black hover:bg-on-background hover:text-primary-container transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  {verifying ? 'Verifying Code...' : 'VERIFY & SIGN IN'}
                </button>
              </form>

              <div className="flex justify-between items-center border-t-2 border-on-background/20 pt-3 font-data-label text-xs">
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
