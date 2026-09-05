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
              ShowRush
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
            © {new Date().getFullYear()} SHOWRUSH TICKET SYSTEMS. ALL RIGHTS RESERVED.
          </div>

          {/* Developer Credit */}
          <div className="group relative flex items-center gap-3 bg-black text-white border-2 border-black px-4 py-2 font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,0.25)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-200">
            <span className="text-neutral-400 text-[10px] sm:text-xs tracking-[0.2em]">
              DESIGNED BY
            </span>

            <span className="text-red-500 font-extrabold tracking-wide group-hover:text-red-400 transition-colors">
              SIDDHARTH VERMA
            </span>

            <span className="text-red-500 text-xs">◆</span>
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
