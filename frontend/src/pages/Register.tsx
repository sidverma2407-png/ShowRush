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
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col md:flex-row bg-surface">
      {/* Left Side: Image/Branding */}
      <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-12 border-b-4 md:border-b-0 md:border-r-4 border-on-background relative overflow-hidden bg-primary-fixed flex flex-col justify-between min-h-[220px] md:min-h-full">
        <div className="absolute inset-0 blueprint-bg opacity-50 mix-blend-multiply"></div>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div>
            <h1 className="font-display-xl text-3xl sm:text-5xl md:text-6xl text-on-background uppercase leading-none font-black" style={{ textShadow: '2px 2px 0px #fff' }}>
              SEATZY<br className="hidden md:inline" /> JOIN THE RIOT
            </h1>
          </div>
          <div className="w-full border-2 sm:border-4 border-on-background bg-on-background p-3 sm:p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] md:rotate-[-2deg] mt-4">
            <p className="font-data-label text-[10px] sm:text-xs text-primary-fixed uppercase tracking-widest text-center font-black">
              TICKET_ID: REG-001 // ACCESS GRANTED
            </p>
          </div>
        </div>
        
        {/* Brutalist Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-luminosity opacity-30">
          <div className="absolute -top-[20%] -left-[20%] w-[80%] aspect-square rounded-full border-[20px] md:border-[40px] border-on-background" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[120%] bg-on-background transform rotate-12" />
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-1/2 flex flex-col bg-surface py-6 px-4 sm:px-8 md:px-12 blueprint-bg relative">
        <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
          
          {step === 'register' ? (
            <>
              <div>
                <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl uppercase font-black tracking-tighter">Register Entity</h2>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 font-bold uppercase">Claim your access</p>
              </div>

              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs sm:text-sm flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                {/* Role Toggle */}
                <div className="w-full flex border-2 border-on-background bg-surface-variant p-1">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="customer"
                      checked={role === 'customer'}
                      onChange={() => setRole('customer')}
                      className="peer sr-only"
                    />
                    <div className="w-full py-2.5 sm:py-3 text-center font-data-label text-xs sm:text-sm uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:border-2 peer-checked:border-on-background text-on-surface-variant min-h-[44px] flex items-center justify-center">
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
                    <div className="w-full py-2.5 sm:py-3 text-center font-data-label text-xs sm:text-sm uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:border-2 peer-checked:border-on-background text-on-surface-variant min-h-[44px] flex items-center justify-center">
                      Organiser
                    </div>
                  </label>
                </div>

                {/* Inputs */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="font-data-label text-xs sm:text-sm uppercase font-bold">Full Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="JOHN_DOE"
                    className="w-full border-2 border-on-background p-3.5 bg-on-tertiary text-on-surface font-data-label text-xs sm:text-sm focus:outline-none focus:ring-0 focus:border-on-background transition-all placeholder:text-surface-dim font-bold min-h-[44px]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-data-label text-xs sm:text-sm uppercase font-bold">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="USER@DOMAIN.COM"
                    className="w-full border-2 border-on-background p-3.5 bg-on-tertiary text-on-surface font-data-label text-xs sm:text-sm focus:outline-none focus:ring-0 focus:border-on-background transition-all placeholder:text-surface-dim font-bold min-h-[44px]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="font-data-label text-xs sm:text-sm uppercase font-bold">Access Code (Password)</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full border-2 border-on-background p-3.5 bg-on-tertiary text-on-surface font-data-label text-xs sm:text-sm focus:outline-none focus:ring-0 focus:border-on-background transition-all placeholder:text-surface-dim font-bold min-h-[44px]"
                    required
                  />
                </div>

                {/* Checkbox */}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    id="agreed"
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-6 h-6 border-2 border-on-background accent-primary-fixed focus:ring-0 cursor-pointer min-w-[24px]"
                  />
                  <label htmlFor="agreed" className="font-data-label text-xs uppercase cursor-pointer select-none font-bold">
                    I AGREE TO THE <a href="#" className="underline font-black">TERMS AND CONDITIONS</a>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background p-3.5 font-headline-lg text-sm sm:text-base uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-on-background hover:text-primary-fixed mt-2 min-h-[44px]"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>

              <div className="border-t-2 border-on-background pt-4 text-center">
                <p className="font-data-label text-xs sm:text-sm text-on-surface-variant uppercase font-bold">
                  ALREADY REGISTERED?{' '}
                  <Link to="/login" className="text-on-background font-black underline hover:bg-primary-container transition-colors px-1">
                    LOGIN HERE
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* STEP 2: OTP Verification UI */
            <div className="flex flex-col gap-6 bg-surface p-4 sm:p-6 border-2 sm:border-4 border-on-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 text-primary mb-2">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl font-black">mark_email_read</span>
                  <span className="font-headline-lg text-lg sm:text-xl uppercase font-black">Verify Email Code</span>
                </div>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">
                  Enter the 6-digit code sent to <span className="bg-primary-container px-1 text-on-background font-black">{pendingEmail}</span>.
                </p>
              </div>

              {devOtp && (
                <div className="bg-amber-200 border-2 border-on-background p-3 flex flex-col gap-1">
                  <div className="font-data-label text-xs uppercase font-black text-on-background">DEV AUTO-FILL OTP: {devOtp}</div>
                  {devPreview && (
                    <a href={devPreview} target="_blank" rel="noreferrer" className="text-[11px] font-mono underline font-bold text-amber-900">
                      View Dev SMTP Email Preview
                    </a>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs sm:text-sm flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full border-2 border-on-background p-3 bg-on-tertiary text-on-surface font-display-xl text-2xl sm:text-3xl text-center tracking-[6px] sm:tracking-[8px] focus:outline-none min-h-[44px]"
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background p-3 font-headline-lg text-sm sm:text-base uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all min-h-[44px]"
                >
                  {verifying ? 'Verifying...' : 'VERIFY & ENTER SEATZY'}
                </button>
              </form>

              <div className="flex justify-between items-center border-t-2 border-on-background pt-3 font-data-label text-xs">
                <button
                  onClick={() => setStep('register')}
                  className="uppercase font-bold underline hover:text-primary min-h-[44px] flex items-center"
                >
                  Change Email
                </button>
                <button
                  onClick={handleResendCode}
                  className="uppercase font-bold text-primary underline hover:text-on-background min-h-[44px] flex items-center"
                >
                  Resend OTP Code
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
