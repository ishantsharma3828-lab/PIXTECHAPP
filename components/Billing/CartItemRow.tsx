
import React, { useContext } from 'react';
import { CartItem } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import { calculateLineTotal } from '../../services/billingService';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onEdit: () => void;
  canEdit?: boolean;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onUpdateQty, onEdit, canEdit = false }) => {
  const { settings, t } = useContext(SettingsContext);
  const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
  
  const displayPrice = (val: number) => 
    isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

  const lineTotal = calculateLineTotal(item);
  const placeholderImg = `https://via.placeholder.com/50?text=${item.name.charAt(0)}`;
  const imgUrl = item.images && item.images.length > 0 ? item.images[0].url : placeholderImg;

  // Determine label for price tier
  let tierLabel = '';
  if (item.priceSelection !== 'price1' && item.priceSelection !== 'custom') {
      const tierMap: Record<string, string> = { price2: 'Tier 2', price3: 'Tier 3', price4: 'Tier 4' };
      tierLabel = tierMap[item.priceSelection];
  } else if (item.priceSelection === 'custom') {
      tierLabel = 'Custom';
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border-b border-slate-200 dark:border-zinc-800 bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors group">
      {/* Image */}
      <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-slate-50 dark:bg-zinc-900 rounded-md overflow-hidden relative group-hover:shadow-sm transition-shadow">
        <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="font-semibold text-slate-900 dark:text-white truncate text-xs">{item.name}</h4>
        <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 gap-y-0.5 text-[9px] sm:text-[10px] text-slate-500 dark:text-zinc-400">
           <span>{displayPrice(item.unitPrice)}</span>
           {tierLabel && <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded text-[8px] sm:text-[10px] uppercase font-bold">{tierLabel}</span>}
           {item.discountValue > 0 && (
               <span className="text-emerald-400 font-medium">
                   (-{item.discountType === 'percentage' ? `${item.discountValue}%` : displayPrice(item.discountValue)})
               </span>
           )}
        </div>
        {item.notes && (
            <p className="text-[10px] sm:text-xs text-slate-600 dark:text-zinc-500 italic truncate max-w-[150px] sm:max-w-[200px] mt-0.5">{item.notes}</p>
        )}
      </div>

      {/* Qty Control */}
      <div className="flex items-center border border-slate-200 dark:border-zinc-800 rounded-md overflow-hidden h-7 sm:h-8">
        <button 
            onClick={() => onUpdateQty(item.quantity - 1)}
            className="w-7 sm:w-8 h-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-900 dark:text-zinc-100 transition-colors"
        >
            -
        </button>
        <input 
            type="number" 
            value={item.quantity}
            onChange={(e) => onUpdateQty(parseFloat(e.target.value) || 0)}
            className="w-8 sm:w-10 h-full text-center text-[11px] sm:text-xs font-bold bg-white dark:bg-zinc-950/80 text-slate-900 dark:text-white border-x border-slate-200 dark:border-zinc-800 focus:outline-none focus:bg-blue-500/10 dark:focus:bg-blue-500/20"
        />
        <button 
            onClick={() => onUpdateQty(item.quantity + 1)}
            className="w-7 sm:w-8 h-full bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-900 dark:text-zinc-100 transition-colors"
        >
            +
        </button>
      </div>

      {/* Total & Actions */}
      <div className="text-right min-w-[60px] sm:min-w-[70px] flex flex-col items-end">
        <div className="font-bold text-slate-900 dark:text-white text-xs">{displayPrice(lineTotal)}</div>
        {canEdit && (
          <button 
              onClick={onEdit}
              className="text-[10px] sm:text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 mt-1 font-medium opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              title="Edit Options"
          >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
              <span className="hidden sm:inline">{t('common.edit')}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CartItemRow;
