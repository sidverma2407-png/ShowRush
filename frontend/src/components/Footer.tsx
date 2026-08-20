import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full py-12 px-margin-mobile md:px-margin-desktop border-t-4 border-on-background bg-surface-container bg-[url('https://www.transparenttextures.com/patterns/blueprint-grid.png')] mt-auto z-10 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg font-black text-on-surface italic uppercase">
          SEATZY
        </div>
        <div className="flex flex-col md:flex-row gap-4 md:gap-8 font-data-label text-data-label uppercase">
          <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors">Terms of Service</Link>
          <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors">Venue Support</Link>
          <Link to="#" className="text-on-surface-variant hover:text-primary transition-colors">API Access</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t-4 border-on-background/20 font-data-label text-data-label uppercase text-on-surface-variant">
        © {new Date().getFullYear()} SEATZY TICKET SYSTEMS. ALL RIGHTS RESERVED.
      </div>
    </footer>
  );
}
