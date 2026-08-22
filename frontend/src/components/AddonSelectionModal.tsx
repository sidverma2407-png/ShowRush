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
  onConfirm: (selectedAddons: { addon_item_id: string; quantity: number }[]) => void;
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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
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

  const grandTotal = seatTotal + addonTotal;

  const handleProceed = () => {
    const selectedList = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([addon_item_id, quantity]) => ({ addon_item_id, quantity }));
    
    onConfirm(selectedList);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-background border-4 border-on-background shadow-neo w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-yellow-300 border-b-4 border-on-background flex justify-between items-center">
          <div>
            <span className="text-xs font-mono font-black uppercase tracking-widest text-black/70 bg-black/10 px-2 py-0.5 border border-black mb-1 inline-block">
              Enhance Your Movie Experience
            </span>
            <h2 className="text-2xl font-black uppercase tracking-tight text-on-background flex items-center gap-2">
              Food & Drinks Menu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white border-2 border-on-background shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-black text-xl flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-4 border-b-4 border-on-background bg-slate-100 flex gap-2 overflow-x-auto">
          {['all', 'food', 'drink', 'combo'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-black uppercase border-2 border-on-background transition-all ${
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
        <div className="p-6 overflow-y-auto flex-grow max-h-[50vh] bg-stone-50">
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
                        <div className="h-32 w-full mb-3 border-2 border-on-background overflow-hidden bg-slate-200">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-full mb-3 border-2 border-on-background flex items-center justify-center bg-yellow-100">
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

        {/* Footer with Totals */}
        <div className="p-5 bg-white border-t-4 border-on-background flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-xs font-mono uppercase text-slate-500 block">Seats ({seatCount}):</span>
              <span className="font-mono font-bold text-base">₹{seatTotal}</span>
            </div>
            <div className="text-xl font-bold text-slate-300">+</div>
            <div>
              <span className="text-xs font-mono uppercase text-slate-500 block">Add-ons Total:</span>
              <span className="font-mono font-bold text-base text-yellow-600">₹{addonTotal}</span>
            </div>
            <div className="text-xl font-bold text-slate-300">=</div>
            <div>
              <span className="text-xs font-mono font-black uppercase text-black block">Grand Total:</span>
              <span className="font-mono font-black text-2xl text-emerald-600">₹{grandTotal}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => onConfirm([])}
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-200 border-2 border-on-background font-black text-xs uppercase hover:bg-slate-300 transition-all shadow-neo-sm"
            >
              Skip Add-ons
            </button>
            <button
              onClick={handleProceed}
              className="flex-1 sm:flex-none px-6 py-3 bg-yellow-400 hover:bg-yellow-300 border-3 border-on-background font-black text-xs uppercase shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              Confirm & Pay ₹{grandTotal} →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
