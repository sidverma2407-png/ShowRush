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
      setError('You must agree to the Terms & Conditions to proceed.');
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
    <main className="w-full max-w-[1100px] mx-auto flex flex-col md:flex-row border-4 border-on-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-surface my-6 md:my-12 min-h-0 md:min-h-[620px] overflow-hidden">
      {/* Left Side: Branding / Intro */}
      <div className="w-full md:w-5/12 p-6 sm:p-10 border-b-4 md:border-b-0 md:border-r-4 border-on-background relative overflow-hidden bg-primary-fixed flex flex-col justify-between">
        <div className="relative z-10 flex flex-col justify-between h-full gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-on-background text-primary-fixed font-mono text-xs font-black px-3 py-1 border-2 border-on-background uppercase tracking-wider w-fit mb-4">
              NEW ACCOUNT REGISTRATION
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl md:text-6xl text-on-background uppercase leading-none font-black italic">
              JOIN THE<br />LIVE RIOT
            </h1>
            <p className="font-body-md text-sm text-on-background/80 font-bold mt-3">
              Create your free account to book live concerts, blockbusters, comedy clubs, and stadium matches with live seat locks.
            </p>
          </div>

          <div className="w-full border-4 border-on-background bg-on-background p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-1deg] mt-4">
            <div className="flex items-center justify-between text-primary-fixed font-mono text-xs font-black uppercase">
              <span>TICKET_ID: REG-001</span>
              <span className="bg-primary-fixed text-on-background px-1.5 py-0.5 font-black text-[10px]">ACCESS UNLOCKED</span>
            </div>
          </div>
        </div>
        
        {/* Brutalist Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mix-blend-luminosity opacity-25">
          <div className="absolute -top-[20%] -left-[20%] w-[80%] aspect-square rounded-full border-[20px] md:border-[40px] border-on-background" />
          <div className="absolute top-[40%] -right-[10%] w-[60%] h-[120%] bg-on-background transform rotate-12" />
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full md:w-7/12 flex flex-col bg-surface p-6 sm:p-10 md:p-12 blueprint-bg justify-center">
        <div className="w-full max-w-md mx-auto flex flex-col gap-6">
          
          {step === 'register' ? (
            <>
              <div>
                <h2 className="font-headline-lg text-2xl sm:text-3xl uppercase font-black tracking-tight">Create Account</h2>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold mt-1">Join Seatzy to discover and book live shows.</p>
              </div>

              {error && (
                <div className="bg-error text-on-error border-2 border-on-background px-4 py-3 font-data-label text-xs sm:text-sm flex items-start gap-2.5 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <span className="material-symbols-outlined text-base mt-0.5 shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                {/* Role Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-data-label text-xs uppercase font-black text-on-background">Account Type</label>
                  <div className="w-full flex border-2 border-on-background bg-surface-variant p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="customer"
                        checked={role === 'customer'}
                        onChange={() => setRole('customer')}
                        className="peer sr-only"
                      />
                      <div className="w-full py-2.5 text-center font-data-label text-xs uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:border-2 peer-checked:border-on-background text-on-surface-variant flex items-center justify-center gap-1.5 min-h-[42px]">
                        <span className="material-symbols-outlined text-sm">confirmation_number</span>
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
                      <div className="w-full py-2.5 text-center font-data-label text-xs uppercase font-black transition-all peer-checked:bg-primary-fixed peer-checked:text-on-background peer-checked:border-2 peer-checked:border-on-background text-on-surface-variant flex items-center justify-center gap-1.5 min-h-[42px]">
                        <span className="material-symbols-outlined text-sm">campaign</span>
                        Organiser
                      </div>
                    </label>
                  </div>
                </div>

                {/* Inputs */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="font-data-label text-xs uppercase font-black flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">person</span>
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-data-label text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold min-h-[44px]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-data-label text-xs uppercase font-black flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">mail</span>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-data-label text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold min-h-[44px]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="font-data-label text-xs uppercase font-black flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">lock</span>
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-data-label text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold min-h-[44px]"
                    required
                  />
                </div>

                {/* Checkbox */}
                <div className="flex items-center gap-3 mt-1">
                  <input
                    id="agreed"
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="w-5 h-5 border-2 border-on-background accent-primary-fixed focus:ring-0 cursor-pointer shrink-0"
                  />
                  <label htmlFor="agreed" className="font-data-label text-xs uppercase cursor-pointer select-none font-bold text-on-background/80">
                    I AGREE TO THE <a href="#" className="underline font-black text-on-background">TERMS AND CONDITIONS</a>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background p-3.5 font-headline-lg text-sm sm:text-base uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] transition-all mt-2 min-h-[46px] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
                  <span className="material-symbols-outlined font-bold text-base">arrow_forward</span>
                </button>
              </form>

              <div className="border-t-2 border-on-background/20 pt-4 text-center">
                <p className="font-data-label text-xs sm:text-sm text-on-surface-variant uppercase font-bold">
                  Already registered?{' '}
                  <Link to="/login" className="text-on-background font-black underline hover:bg-primary-container transition-colors px-1 py-0.5">
                    Login Here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* STEP 2: OTP Verification UI */
            <div className="flex flex-col gap-5 bg-surface p-5 sm:p-6 border-4 border-on-background shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <span className="material-symbols-outlined text-2xl font-black">mark_email_read</span>
                  <span className="font-headline-lg text-lg sm:text-xl uppercase font-black text-on-background">Verify Email Code</span>
                </div>
                <p className="font-body-md text-xs sm:text-sm text-on-surface-variant font-bold">
                  Enter the 6-digit code sent to <span className="bg-primary-container text-on-background px-1.5 py-0.5 font-black">{pendingEmail}</span>.
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
                  className="w-full border-2 border-on-background p-3 bg-surface-lowest text-on-background font-display-xl text-3xl text-center tracking-[8px] focus:outline-none focus:border-primary min-h-[48px] font-bold"
                  required
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full bg-primary-fixed text-on-primary-fixed border-2 border-on-background p-3.5 font-headline-lg text-sm sm:text-base uppercase font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-on-background hover:text-primary-fixed transition-all min-h-[46px] cursor-pointer"
                >
                  {verifying ? 'Verifying Code...' : 'VERIFY & ENTER SEATZY'}
                </button>
              </form>

              <div className="flex justify-between items-center border-t-2 border-on-background/20 pt-3 font-data-label text-xs">
                <button
                  type="button"
                  onClick={() => setStep('register')}
                  className="uppercase font-bold underline hover:text-primary min-h-[44px] flex items-center"
                >
                  Change Email
                </button>
                <button
                  type="button"
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
    </main>
  );
}
