
import React, { useState, useEffect, useContext, useRef } from 'react';
import * as billingService from '../../services/billingService';
import { Coupon } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface CouponModalProps {
  currentSubtotal: number;
  onApply: (coupon: Coupon) => void;
  onClose: () => void;
}

const CouponModal: React.FC<CouponModalProps> = ({ currentSubtotal, onApply, onClose }) => {
  const { settings, t } = useContext(SettingsContext);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const availableCoupons = billingService.getAvailableCoupons();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleApply = (couponCode: string) => {
    const result = billingService.validateCoupon(couponCode, currentSubtotal);
    if (result.valid && result.coupon) {
        onApply(result.coupon);
        onClose();
    } else {
        setError(result.error || 'Invalid coupon');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleApply(code);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[200] flex items-center justify-center p-0 md:p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-none md:rounded-xl shadow-2xl w-full h-[100dvh] md:w-[50vw] md:h-auto md:max-h-[85vh] max-w-md border-0 md:border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        <div className="bg-[var(--color-primary)] p-6 text-white text-center">
            <h3 className="text-2xl font-bold">{t('billing.apply_coupon')}</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="relative mb-6">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={code}
                    onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
                    className={`w-full pl-4 pr-24 py-3 border-2 rounded-lg font-mono text-lg uppercase tracking-wider focus:outline-none ${error ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 dark:text-white focus:border-[var(--color-primary)]'}`}
                    placeholder={t('billing.coupon_code')}
                />
                <button 
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 bg-[var(--color-primary)] text-white px-4 rounded font-bold hover:brightness-110 transition-all"
                >
                    {t('batch.apply')}
                </button>
                {error && <p className="text-red-500 text-xs mt-2 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </p>}
            </form>

            <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Coupons</h4>
                {availableCoupons.map(coupon => {
                    const isValid = !coupon.minOrder || currentSubtotal >= coupon.minOrder;
                    return (
                        <div 
                            key={coupon.code}
                            onClick={() => isValid && handleApply(coupon.code)}
                            className={`relative group border-2 border-dashed rounded-lg p-3 cursor-pointer transition-all flex justify-between items-center overflow-hidden
                            ${isValid 
                                ? `${coupon.color} hover:shadow-md hover:scale-[1.02] border-current` 
                                : 'bg-slate-100 border-slate-300 text-gray-400 cursor-not-allowed opacity-70'
                            }`}
                        >
                             {/* Decorative Circles for Ticket Effect */}
                            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-800 rounded-full border border-inherit border-l-0"></div>
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-gray-800 rounded-full border border-inherit border-r-0"></div>

                            <div className="pl-4">
                                <div className="font-black text-lg tracking-wider">{coupon.code}</div>
                                <div className="text-xs font-medium opacity-90">{coupon.description}</div>
                            </div>
                            <div className="pr-4 font-bold text-xl">
                                {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                            </div>
                            
                            {!isValid && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center font-bold text-xs text-red-600 uppercase tracking-widest backdrop-blur-[1px]">
                                    Min Order ${coupon.minOrder}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-zinc-800 flex justify-center">
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white font-medium">{t('common.cancel')}</button>
        </div>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CouponModal;
