import { useState, useEffect } from 'react';

export type FooterModalType = 'terms' | 'privacy' | 'support' | 'api';

interface FooterInfoModalProps {
  isOpen: boolean;
  type: FooterModalType | null;
  onClose: () => void;
}

export default function FooterInfoModal({ isOpen, type, onClose }: FooterInfoModalProps) {
  const [activeTab, setActiveTab] = useState<FooterModalType>('terms');
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    if (type) {
      setActiveTab(type);
    }
  }, [type]);

  if (!isOpen || !type) return null;

  const copyCurl = () => {
    const curlCmd = `curl -X GET "http://localhost:3000/api/events" -H "Accept: application/json"`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl bg-surface border-4 border-on-background shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-on-background text-on-primary px-6 py-4 flex items-center justify-between border-b-4 border-on-background">
          <div className="flex items-center gap-3">
            <span className="font-headline-lg text-2xl font-black text-primary-fixed italic tracking-tight">
              SEATZY
            </span>
            <span className="bg-primary-fixed text-black text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-black">
              OFFICIAL DOCUMENTATION
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-primary-fixed text-on-background border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-white active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl font-black">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b-4 border-on-background bg-slate-100 overflow-x-auto text-xs sm:text-sm font-headline-lg font-black uppercase">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap border-r-2 border-on-background transition-all ${
              activeTab === 'terms' ? 'bg-primary-fixed text-black border-b-4 border-b-black -mb-1 z-10' : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">gavel</span>
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap border-r-2 border-on-background transition-all ${
              activeTab === 'privacy' ? 'bg-primary-fixed text-black border-b-4 border-b-black -mb-1 z-10' : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">security</span>
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap border-r-2 border-on-background transition-all ${
              activeTab === 'support' ? 'bg-primary-fixed text-black border-b-4 border-b-black -mb-1 z-10' : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">headset_mic</span>
            Venue Support
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'api' ? 'bg-primary-fixed text-black border-b-4 border-b-black -mb-1 z-10' : 'text-neutral-600 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">code</span>
            API Access
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-on-surface bg-surface">
          {/* TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-3">
                <h3 className="font-headline-lg text-2xl uppercase font-black text-on-surface">
                  Terms of Service & Ticket Conditions
                </h3>
                <p className="font-mono text-xs text-neutral-500 uppercase">Effective Date: August 2026 • Version 2.4</p>
              </div>

              <div className="space-y-4 text-sm text-neutral-800 leading-relaxed font-body">
                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">1. Fair Reservation & Hold Window</h4>
                  <p className="text-xs text-neutral-700">
                    When you select seats on Seatzy, they are held exclusively under your account for <strong>10 minutes</strong>. If checkout is not completed within this hold countdown, seats are instantly and automatically released back into the live pool for other patrons.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">2. Anti-Scalping & Ticket Legitimacy</h4>
                  <p className="text-xs text-neutral-700">
                    All digital admission passes generated by Seatzy feature a tamper-proof Plain-Text cryptographic payload (STZ-XXXXXX) verifiable by turnstile scanners. Resale or unauthorized scalping above face value results in immediate pass voiding.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">3. Automated Waitlist Allocation</h4>
                  <p className="text-xs text-neutral-700">
                    If an event is sold out, users may join the category waitlist. In the event of a cancellation, the freed ticket is held exclusively for the first waitlisted user with a 15-minute priority claim window.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">4. Refund & Cancellation Policy</h4>
                  <p className="text-xs text-neutral-700">
                    Confirmed ticket bookings can be managed or cancelled from your <strong>My Bookings</strong> dashboard up to 2 hours prior to scheduled showtime, subject to organizer venue policies.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-3">
                <h3 className="font-headline-lg text-2xl uppercase font-black text-on-surface">
                  Privacy Policy & Data Security
                </h3>
                <p className="font-mono text-xs text-neutral-500 uppercase">Compliance Standard: ISO/IEC 27001 & DPDP Act</p>
              </div>

              <div className="space-y-4 text-sm text-neutral-800 leading-relaxed font-body">
                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">1. Zero Third-Party Selling Policy</h4>
                  <p className="text-xs text-neutral-700">
                    Seatzy never sells, rents, or monetizes your personal information, booking history, or phone numbers to third-party data brokers or marketing agencies.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">2. Data Encryption & Credentials</h4>
                  <p className="text-xs text-neutral-700">
                    All user passwords are encrypted using industry-standard <strong>bcrypt</strong> hashing with 10 salt rounds. Session tokens are signed using JWT with strict expiration protocols.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">3. Offline-Ready Gate Passes</h4>
                  <p className="text-xs text-neutral-700">
                    Your generated QR admission passes contain structured plain-text metadata verified locally at venue turnstiles, minimizing unnecessary external telemetry requests during gate entry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VENUE SUPPORT */}
          {activeTab === 'support' && (
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-3">
                <h3 className="font-headline-lg text-2xl uppercase font-black text-on-surface">
                  Venue & Organizer Partner Support
                </h3>
                <p className="font-mono text-xs text-neutral-500 uppercase">24/7 Operations Desk & Box Office Assistance</p>
              </div>

              <div className="space-y-4 text-sm text-neutral-800 leading-relaxed font-body">
                <div className="bg-yellow-50 border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">support_agent</span>
                    Priority Venue Desk Contacts
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="bg-white p-3 border border-black">
                      <span className="text-neutral-500 block font-bold">ORGANIZER HELPLINE</span>
                      <strong className="text-black text-sm">+91 (011) 4928-8200</strong>
                    </div>
                    <div className="bg-white p-3 border border-black">
                      <span className="text-neutral-500 block font-bold">ESCALATION EMAIL</span>
                      <strong className="text-black text-sm">support@seatzy.com</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">Turnstile & Hardware Integration</h4>
                  <p className="text-xs text-neutral-700">
                    Need assistance connecting your cinema barcode laser guns or handheld Android/iOS gate check-in terminals? Our engineering team provides custom webhook triggers and turnstile relay hardware configurations.
                  </p>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">Live Event Command Support</h4>
                  <p className="text-xs text-neutral-700">
                    Organizers running high-demand stadium concerts or movie premieres receive dedicated real-time socket monitoring to ensure zero double-booking concurrency.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* API ACCESS */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="border-b-2 border-slate-200 pb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-headline-lg text-2xl uppercase font-black text-on-surface">
                    Seatzy Developer API Access
                  </h3>
                  <p className="font-mono text-xs text-neutral-500 uppercase">RESTful Endpoints & WebSocket Real-time Engine</p>
                </div>
                <span className="bg-green-100 text-green-800 border-2 border-green-800 font-mono text-[10px] font-black px-2.5 py-1 uppercase">
                  v1.0 LIVE
                </span>
              </div>

              <div className="space-y-4 text-sm text-neutral-800 leading-relaxed font-body">
                {/* Endpoint preview */}
                <div className="bg-neutral-900 text-white border-3 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-xs">
                  <div className="flex items-center justify-between mb-2 text-neutral-400">
                    <span>GET /api/events</span>
                    <button
                      onClick={copyCurl}
                      className="bg-primary-fixed text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black hover:bg-white transition-colors cursor-pointer"
                    >
                      {copiedCurl ? 'COPIED!' : 'COPY CURL'}
                    </button>
                  </div>
                  <pre className="text-green-400 overflow-x-auto whitespace-pre">
{`curl -X GET "http://localhost:3000/api/events" \\
  -H "Accept: application/json"`}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-black block mb-1">PUBLIC VERIFICATION</span>
                    <code className="text-blue-700 font-bold block">GET /api/tickets/verify/:ref</code>
                    <p className="text-[11px] text-neutral-600 mt-1">Validates ticket clearance without auth.</p>
                  </div>
                  <div className="bg-white border-2 border-black p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-black block mb-1">REAL-TIME SOCKET</span>
                    <code className="text-purple-700 font-bold block">ws://localhost:3000/socket.io</code>
                    <p className="text-[11px] text-neutral-600 mt-1">Subscribes to live `seat_status_updated`.</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <h4 className="font-headline-lg text-base font-black uppercase text-black mb-1">Developer API Keys</h4>
                  <p className="text-xs text-neutral-700">
                    To request production API keys for custom cinema ticketing kiosks, white-label ticket widgets, or box office ERP synchronization, reach out to <strong>dev@seatzy.com</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t-4 border-on-background px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-xs text-neutral-500 font-bold">
            SEATZY TICKET SYSTEMS • LEGAL & DEVELOPER PORTAL
          </span>
          <button
            onClick={onClose}
            className="bg-primary-fixed text-black border-2 border-black px-5 py-1.5 font-headline-lg text-xs uppercase font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
