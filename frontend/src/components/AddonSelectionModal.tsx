import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

export interface AddonItem {
  id: string;
  name: string;
  category: 'food' | 'drink' | 'combo' | string;
  price: number;
  image_url?: string;
  available: boolean;
}

export interface SelectedAddon {
  addon_item_id: string;
  quantity: number;
  item: AddonItem;
}

interface AddonSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  seatTotal: number;
  seatCount: number;
  onConfirm: (selectedAddons: { addon_item_id: string; quantity: number }[], couponCode?: string) => void;
}

export const AddonSelectionModal: React.FC<AddonSelectionModalProps> = ({
  isOpen,
  onClose,
  seatTotal,
  seatCount,
  onConfirm
}) => {
  const [addons, setAddons] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<{ [id: string]: number }>({});
  
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setAppliedCoupon(null);
      setCouponInput('');
      setCouponError(null);
      fetchApi('/addons')
        .then((res: any) => {
          setAddons(res.data || []);
        })
        .catch((err: any) => console.error('Failed to load addons:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuantityChange = (id: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const filteredAddons = selectedCategory === 'all'
    ? addons
    : addons.filter(a => a.category.toLowerCase() === selectedCategory.toLowerCase());

  const addonTotal = addons.reduce((sum, item) => {
    const qty = quantities[item.id] || 0;
    return sum + Number(item.price) * qty;
  }, 0);

  // STACKING RULE 1: Group discount (10% off for 5+ seats) applied FIRST to seat subtotal
  const groupDiscount = seatCount >= 5 ? Math.round(seatTotal * 0.10 * 100) / 100 : 0;
  const reducedSeatSubtotal = Math.max(0, seatTotal - groupDiscount);

  // STACKING RULE 2: Coupon discount applied to reduced subtotal (or total cart)
  let couponDiscount = 0;
  if (appliedCoupon) {
    const val = Number(appliedCoupon.discount_value);
    if (appliedCoupon.discount_type === 'percentage') {
      couponDiscount = Math.round((reducedSeatSubtotal * (val / 100)) * 100) / 100;
    } else {
      couponDiscount = Math.min(reducedSeatSubtotal, val);
    }
  }

  const grandTotal = Math.max(0, seatTotal - groupDiscount + addonTotal - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetchApi('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponInput.trim(),
          seat_count: seatCount,
          seat_subtotal: seatTotal,
          addons_subtotal: addonTotal
        })
      });
      setAppliedCoupon(res);
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleProceed = () => {
    const selectedList = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([addon_item_id, quantity]) => ({ addon_item_id, quantity }));
    
    onConfirm(selectedList, appliedCoupon ? appliedCoupon.code : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-background border-4 border-on-background shadow-neo w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-yellow-300 border-b-4 border-on-background flex justify-between items-center">
          <div>
            <span className="text-xs font-mono font-black uppercase tracking-widest text-black/70 bg-black/10 px-2 py-0.5 border border-black mb-1 inline-block">
              Enhance Your Seatzy Booking
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-on-background flex items-center gap-2">
              Food & Drinks + Offers
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white border-2 border-on-background shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Group Booking Discount Banner */}
        {seatCount >= 5 && (
          <div className="bg-emerald-400 border-b-4 border-on-background p-3 text-on-background font-black flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl font-black animate-bounce">celebration</span>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider font-extrabold text-emerald-950">🎉 GROUP BOOKING DISCOUNT APPLIED!</div>
                <div className="text-sm font-black">10% OFF FOR 5+ SEATS (SAVED ₹{groupDiscount.toFixed(0)})</div>
              </div>
            </div>
            <div className="bg-emerald-950 text-emerald-300 font-mono text-xs px-2.5 py-1 border border-emerald-800 uppercase font-bold hidden sm:block">
              AUTOMATIC OFFER
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="p-3 sm:p-4 border-b-4 border-on-background bg-slate-100 flex gap-2 overflow-x-auto">
          {['all', 'food', 'drink', 'combo'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-black uppercase border-2 border-on-background transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-black text-white shadow-neo'
                  : 'bg-white text-black hover:bg-yellow-200'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat === 'food' ? 'Snacks & Food' : cat === 'drink' ? 'Beverages' : 'Combos'}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow max-h-[42vh] bg-stone-50">
          {loading ? (
            <div className="p-12 text-center font-mono font-bold uppercase text-slate-500">
              Loading menu items...
            </div>
          ) : filteredAddons.length === 0 ? (
            <div className="p-12 text-center font-mono font-bold uppercase text-slate-500">
              No add-ons available in this category.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAddons.map((item) => {
                const qty = quantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={`bg-white border-3 border-on-background p-3 flex flex-col justify-between transition-all ${
                      qty > 0 ? 'ring-4 ring-yellow-400 bg-yellow-50/50 shadow-neo' : 'hover:shadow-neo-sm'
                    }`}
                  >
                    <div>
                      {item.image_url ? (
                        <div className="h-28 sm:h-32 w-full mb-3 border-2 border-on-background overflow-hidden bg-slate-200">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-28 sm:h-32 w-full mb-3 border-2 border-on-background flex items-center justify-center bg-yellow-100">
                          <span className="material-symbols-outlined text-4xl text-black font-black">fastfood</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-sm uppercase leading-tight line-clamp-2">
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono font-bold uppercase bg-slate-200 border border-black px-1.5 py-0.5 ml-1">
                          {item.category}
                        </span>
                      </div>
                      
                      <p className="font-mono font-black text-base text-yellow-600 mb-3">
                        ₹{Number(item.price).toFixed(0)}
                      </p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-between border-2 border-on-background bg-slate-100 p-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={qty === 0}
                        className={`w-8 h-8 font-black text-lg border border-black flex items-center justify-center ${
                          qty === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white hover:bg-red-200'
                        }`}
                      >
                        -
                      </button>
                      <span className="font-mono font-black text-sm px-2">
                        {qty}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="w-8 h-8 bg-white hover:bg-emerald-200 font-black text-lg border border-black flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Promo Code Section */}
        <div className="p-4 bg-amber-50 border-t-4 border-on-background">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-600 font-black">confirmation_number</span>
              <span className="font-mono font-black text-xs uppercase text-on-background">PROMO / COUPON CODE:</span>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center gap-2 bg-emerald-100 border-2 border-emerald-700 px-3 py-1.5 font-mono text-xs font-bold text-emerald-950 w-full sm:w-auto justify-between">
                <span>✅ <strong>{appliedCoupon.code}</strong> ({appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}% OFF` : `₹${appliedCoupon.discount_value} OFF`}) Saved ₹{couponDiscount.toFixed(0)}</span>
                <button
                  onClick={handleRemoveCoupon}
                  className="bg-red-200 hover:bg-red-300 text-red-900 border border-red-800 px-2 py-0.5 text-[10px] font-black uppercase ml-2"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="e.g. SEATZY10, FLAT100"
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  className="bg-white border-2 border-on-background px-3 py-1.5 font-mono text-xs font-bold uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400 w-full sm:w-48"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="bg-black text-white hover:bg-yellow-400 hover:text-black border-2 border-on-background px-4 py-1.5 font-black text-xs uppercase transition-all shadow-neo-sm disabled:opacity-50 min-w-[70px]"
                >
                  {couponLoading ? '...' : 'APPLY'}
                </button>
              </div>
            )}
          </div>
          {couponError && (
            <div className="mt-2 text-xs font-mono font-bold text-red-700 bg-red-100 p-2 border border-red-400">
              ⚠️ {couponError}
            </div>
          )}
        </div>

        {/* Footer with Itemized Stacked Totals */}
        <div className="p-4 sm:p-5 bg-white border-t-4 border-on-background flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-2 border-on-background bg-slate-100 p-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Seats ({seatCount}):</span>
              <span className="font-black text-sm">₹{seatTotal.toFixed(0)}</span>
            </div>
            {seatCount >= 5 && (
              <div>
                <span className="text-[10px] text-emerald-700 block font-bold uppercase">Group Disc (-10%):</span>
                <span className="font-black text-sm text-emerald-700">-₹{groupDiscount.toFixed(0)}</span>
              </div>
            )}
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase">Add-ons:</span>
              <span className="font-black text-sm text-yellow-600">+₹{addonTotal.toFixed(0)}</span>
            </div>
            {appliedCoupon && (
              <div>
                <span className="text-[10px] text-emerald-700 block font-bold uppercase">Coupon ({appliedCoupon.code}):</span>
                <span className="font-black text-sm text-emerald-700">-₹{couponDiscount.toFixed(0)}</span>
              </div>
            )}
            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-300 pt-1 sm:pt-0 sm:pl-2">
              <span className="text-[10px] text-black block font-black uppercase">Final Total:</span>
              <span className="font-mono font-black text-xl text-emerald-600">₹{grandTotal.toFixed(0)}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full justify-end">
            <button
              onClick={() => onConfirm([], appliedCoupon ? appliedCoupon.code : undefined)}
              className="px-4 py-3 bg-slate-200 border-2 border-on-background font-black text-xs uppercase hover:bg-slate-300 transition-all shadow-neo-sm"
            >
              Skip Add-ons
            </button>
            <button
              onClick={handleProceed}
              className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 border-3 border-on-background font-black text-xs uppercase shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer"
            >
              Confirm & Pay ₹{grandTotal.toFixed(0)} →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
