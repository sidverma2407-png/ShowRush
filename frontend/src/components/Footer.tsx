import { useState } from 'react';
import FooterInfoModal, { type FooterModalType } from './FooterInfoModal';

export default function Footer() {
  const [modalType, setModalType] = useState<FooterModalType | null>(null);

  return (
    <>
      <footer className="w-full py-10 md:py-12 px-margin-mobile md:px-margin-desktop border-t-4 border-on-background bg-surface-container bg-[url('https://www.transparenttextures.com/patterns/blueprint-grid.png')] mt-auto z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div className="flex flex-col gap-1">
            <div className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-black text-on-surface italic uppercase tracking-tight">
              SEATZY
            </div>
            <p className="font-mono text-xs text-neutral-500 uppercase tracking-wider font-bold">
              High-Speed Real-Time Ticketing & Admission Infrastructure
            </p>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 font-data-label text-data-label uppercase">
            <button
              onClick={() => setModalType('terms')}
              className="text-on-surface-variant hover:text-black hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer font-bold"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setModalType('privacy')}
              className="text-on-surface-variant hover:text-black hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer font-bold"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setModalType('support')}
              className="text-on-surface-variant hover:text-black hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer font-bold"
            >
              Venue Support
            </button>
            <button
              onClick={() => setModalType('api')}
              className="text-on-surface-variant hover:text-black hover:underline decoration-2 underline-offset-4 transition-all cursor-pointer font-bold"
            >
              API Access
            </button>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Personal Touch Tag */}
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t-2 sm:border-t-4 border-on-background/20 flex flex-col sm:flex-row justify-between items-center gap-4 font-data-label text-data-label uppercase text-on-surface-variant">
          <div>
            © {new Date().getFullYear()} SEATZY TICKET SYSTEMS. ALL RIGHTS RESERVED.
          </div>

          {/* Personal Touch Badge */}
          <div className="flex items-center gap-2 bg-white text-black border-2 border-black px-3.5 py-1.5 font-mono text-xs sm:text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 transition-colors">
            <span>designed with</span>
            <span className="text-red-600 font-extrabold text-sm sm:text-base tracking-wide animate-pulse">लव</span>
            <span>by Rishit</span>
          </div>
        </div>
      </footer>

      {/* Interactive Footer Modal for Terms, Privacy, Support, API */}
      <FooterInfoModal
        isOpen={modalType !== null}
        type={modalType}
        onClose={() => setModalType(null)}
      />
    </>
  );
}
