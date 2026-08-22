import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../api/client';
import { useModalStore } from '../store/modal';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  // OTP Verification state
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [devPreview, setDevPreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();
  const { showSuccess, showError } = useModalStore();

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('You must agree to the Terms.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });

      if (res.data?.requires_verification) {
        setPendingEmail(res.data.email);
        setDevOtp(res.data.dev_otp || null);
        setDevPreview(res.data.dev_email_preview || null);
        setStep('otp');
        showSuccess(`A 6-digit verification code has been sent to ${res.data.email}.\n\nPlease check your inbox to activate your account.`, {
          title: 'EMAIL CODE SENT'
        });
      } else {
        login(res.data.user, res.data.token);
        navigate(res.data.user.role === 'organiser' ? '/organiser/dashboard' : '/explore');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const res = await fetchApi('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail, otp: otp.trim() })
      });

      showSuccess('Your email has been verified! Welcome to Seatzy.', {
        title: 'VERIFICATION COMPLETE',
        onClose: () => {
          login(res.data.user, res.data.token);
          navigate(res.data.user.role === 'organiser' ? '/organiser/dashboard' : '/explore');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    try {
      const res = await fetchApi('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email: pendingEmail })
      });
      if (res.data?.dev_otp) setDevOtp(res.data.dev_otp);
      if (res.data?.dev_email_preview) setDevPreview(res.data.dev_email_preview);
      showSuccess(`A new 6-digit verification code has been sent to ${pendingEmail}.`, { title: 'CODE RESENT' });
    } catch (err: any) {
      showError(err.message || 'Failed to resend code');
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Left Side: Image/Branding */}
      <div className="hidden md:flex w-1/2 h-full neo-brutalism-border border-r-0 border-y-0 border-l-0 border-r-border-width relative overflow-hidden bg-primary-fixed">
        <div className="absolute inset-0 blueprint-bg opacity-50 mix-blend-multiply"></div>
        <div className="absolute inset-0 p-margin-desktop flex flex-col justify-between z-10">
          <div>
            <h1 className="font-display-xl text-display-xl text-on-background uppercase leading-none mix-blend-exclusion" style={{ color: '#1b1b1b', textShadow: '2px 2px 0px #fff' }}>
              SEATZY<br />JOIN<br />THE<br />RIOT
            </h1>
          </div>
          <div className="w-full neo-brutalism-border bg-on-background p-4 neo-brutalism-shadow rotate-[-2deg]">
            <p className="font-data-label text-data-label text-primary-fixed uppercase tracking-widest text-center">
              TICKET_ID: REG-001 // ACCESS GRANTED
            </p>
          </div>
        </div>
        
        {/* Brutalist Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-luminosity opacity-40">
          <div className="absolute -top-[20%] -left-[20%] w-[80%] aspect-square rounded-full border-[40px] border-on-background" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[120%] bg-on-background transform rotate-12" />
          <div className="absolute bottom-[10%] left-[20%] w-[40%] aspect-square bg-transparent border-[20px] border-on-background border-dashed transform -rotate-12" />
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col bg-surface overflow-y-auto blueprint-bg relative">
        <div className="w-full max-w-lg mx-auto my-auto p-margin-mobile md:p-margin-desktop flex flex-col gap-gutter">
          
          {step === 'register' ? (
            <>
              <div className="mb-4">
                <h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg uppercase font-black tracking-tighter">Register</h2>
                <p className="font-body-md text-on-surface-variant mt-2 font-bold uppercase">Claim your access</p>
              </div>

              {error && (
                <div className="bg-error text-on-error neo-brutalism-border px-4 py-3 font-data-label text-data-label flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                {/* Role Toggle */}
                <div className="w-full flex neo-brutalism-border bg-surface-variant p-1">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={role === 'customer'}
                      onChange={() => setRole('customer')}
                      className="peer sr-only"
                    />
                    <div className="w-full py-3 text-center font-data-label text-data-label uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:neo-brutalism-border text-on-surface-variant border-transparent border-4 hover:bg-surface-dim">
                      Customer
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="organiser"
                      checked={role === 'organiser'}
                      onChange={() => setRole('organiser')}
                      className="peer sr-only"
                    />
                    <div className="w-full py-3 text-center font-data-label text-data-label uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:neo-brutalism-border text-on-surface-variant border-transparent border-4 hover:bg-surface-dim">
                      Organiser
                    </div>
                  </label>
                </div>

                {/* Inputs */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="font-data-label text-data-label uppercase">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="JOHN_DOE"
                    className="w-full neo-brutalism-border p-4 bg-on-tertiary text-on-surface font-data-label focus:outline-none focus:ring-0 focus:border-on-background neo-brutalism-shadow-hover transition-all placeholder:text-surface-dim"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="font-data-label text-data-label uppercase">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="USER@DOMAIN.COM"
                    className="w-full neo-brutalism-border p-4 bg-on-tertiary text-on-surface font-data-label focus:outline-none focus:ring-0 focus:border-on-background neo-brutalism-shadow-hover transition-all placeholder:text-surface-dim"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="password" className="font-data-label text-data-label uppercase">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full neo-brutalism-border p-4 bg-on-tertiary text-on-surface font-data-label focus:outline-none focus:ring-0 focus:border-on-background neo-brutalism-shadow-hover transition-all placeholder:text-surface-dim"
                    required
                  />
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="appearance-none w-6 h-6 neo-brutalism-border bg-on-tertiary checked:bg-primary-fixed checked:after:content-['✓'] checked:after:text-on-background checked:after:font-bold checked:after:flex checked:after:justify-center checked:after:items-center cursor-pointer"
                  />
                  <label htmlFor="terms" className="font-data-label text-data-label uppercase cursor-pointer">
                    I agree to the <Link to="#" className="underline decoration-2 underline-offset-4 hover:text-primary transition-colors">Terms</Link>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-primary-fixed text-on-background font-headline-lg-mobile text-headline-lg-mobile py-4 uppercase neo-brutalism-border neo-brutalism-shadow neo-brutalism-shadow-hover neo-brutalism-shadow-active transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending Code...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center border-t-4 border-on-background pt-6">
                <p className="font-data-label text-data-label uppercase">
                  Already registered? <Link to="/login" className="text-on-background font-black underline decoration-4 underline-offset-4 hover:bg-primary-fixed transition-colors p-1">Log in here</Link>
                </p>
              </div>
            </>
          ) : (
            /* Step 2: OTP Verification Card */
            <div className="flex flex-col gap-6 bg-surface p-8 border-4 border-on-background neo-brutalism-shadow">
              <div>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-3xl font-black">mark_email_read</span>
                  <span className="font-headline-lg-mobile text-xl uppercase font-black">Verify Email</span>
                </div>
                <p className="font-body-md text-on-surface-variant font-bold">
                  Enter the 6-digit verification code sent to <span className="bg-primary-container px-2 py-0.5 border border-on-background font-black text-on-background">{pendingEmail}</span>
                </p>
              </div>

              {devOtp && (
                <div className="bg-amber-200 border-4 border-on-background p-4 neo-brutalism-shadow">
                  <p className="font-data-label text-xs uppercase font-black text-on-background">🔑 DEV TESTING AUTO-FILL OTP</p>
                  <p className="font-display-xl text-3xl font-black tracking-widest text-on-background my-1">{devOtp}</p>
                  {devPreview && (
                    <a href={devPreview} target="_blank" rel="noreferrer" className="font-data-label text-xs uppercase underline font-bold hover:text-primary">
                      View Email Preview Inbox →
                    </a>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-error text-on-error neo-brutalism-border px-4 py-3 font-data-label text-data-label flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="otp" className="font-data-label text-data-label uppercase font-black">6-Digit Code</label>
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full neo-brutalism-border p-4 bg-on-tertiary text-on-surface font-display-xl text-3xl text-center tracking-[10px] focus:outline-none focus:ring-0 focus:border-on-background"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full mt-4 bg-primary-fixed text-on-background font-headline-lg-mobile text-headline-lg-mobile py-4 uppercase neo-brutalism-border neo-brutalism-shadow hover:bg-on-background hover:text-primary-fixed transition-all cursor-pointer disabled:opacity-50 font-black"
                >
                  {verifying ? 'Verifying...' : 'VERIFY & ENTER SEATZY'}
                </button>
              </form>

              <div className="flex justify-between items-center border-t-2 border-on-background pt-4 text-xs font-data-label uppercase">
                <button
                  onClick={handleResendCode}
                  className="font-bold underline hover:text-primary cursor-pointer"
                >
                  Resend Code
                </button>
                <button
                  onClick={() => setStep('register')}
                  className="font-bold text-on-surface-variant hover:text-on-background cursor-pointer"
                >
                  Change Email
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
