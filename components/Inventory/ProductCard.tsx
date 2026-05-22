
import React, { useContext } from 'react';
import { Product } from '../../constants/inventoryFields';
import { SettingsContext } from '../../contexts/SettingsContext';
import { getCurrentUser } from '../../services/authService';

type CardSize = 'large' | 'medium' | 'small';

interface ProductCardProps {
  product: Product;
  size: CardSize;
  isSelected: boolean;
  onSelect: (productId: string) => void;
  onEdit: () => void;
  onMoveToTrash: () => void;
  onPrintLabel: () => void;
  canEdit: boolean;
  canDelete: boolean;
  onApprove?: () => void;
  onRowClick?: () => void;
  enableSelection?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, size, isSelected, onSelect, onEdit, onMoveToTrash, onPrintLabel, canEdit, canDelete, onApprove, onRowClick, enableSelection = true }) => {
  const { settings, t, currentColors } = useContext(SettingsContext);
  const user = getCurrentUser();

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRowClick) {
      onRowClick();
    } else if (enableSelection) {
      onSelect(product.id);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (enableSelection) {
      onSelect(product.id);
    }
  };

  const handleActionClick = (e: React.MouseEvent, action: 'edit' | 'trash' | 'print' | 'approve') => {
    e.stopPropagation();
    if (action === 'edit') {
      onEdit();
    } else if (action === 'trash') {
      onMoveToTrash();
    } else if (action === 'print') {
      onPrintLabel();
    } else if (action === 'approve') {
      if (onApprove) onApprove();
    }
  }

  const isCompact = size === 'small' || size === 'medium';
  const isMinimal = size === 'small';

  const imageSizeClasses = {
    large: 'h-full sm:h-48',
    medium: 'h-full sm:h-32',
    small: 'h-full sm:h-24',
  };

  const placeholderImageUrl = `https://via.placeholder.com/400x400.png/E2E8F0/4A5568?text=${encodeURIComponent(product.name)}`;
  const displayImageUrl = product.images && product.images.length > 0 && product.images[0].url ? product.images[0].url : placeholderImageUrl;

  const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
  const priceDisplay = isRightSideCurrency
    ? `${product.price1.toFixed(2)} ${settings.currencySymbol}`
    : `${settings.currencySymbol}${product.price1.toFixed(2)}`;

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white/80 dark:bg-zinc-950/80 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden flex ${size === 'large' ? 'flex-row sm:flex-col items-center sm:items-stretch' : 'flex-col'} group transition-all duration-300 cursor-pointer relative backdrop-blur-sm
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-800'}`}
      role="checkbox"
      aria-checked={isSelected}
      tabIndex={0}
    >
      {enableSelection && (
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-zinc-950 cursor-pointer shadow-lg transition-transform active:scale-90"
            aria-label={`Select ${product.name}`}
          />
        </div>
      )}

      <div className={`relative shrink-0 overflow-hidden bg-slate-100 dark:bg-zinc-900 ${size === 'large' ? 'w-20 md:w-full aspect-square md:aspect-video' : 'w-full aspect-[4/3] md:aspect-video'}`}>
        <img src={displayImageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 p-1 md:p-0 rounded-xl md:rounded-none" />
        
        {/* Desktop Badges (Top Right) */}
        {!isMinimal && user?.role !== 'customer' && (
          <div className="hidden sm:flex absolute top-2 right-2 flex-col items-end gap-1">
            {product.warranty?.enabled &&
              <span className="px-1.5 py-0.5 bg-blue-600/90 backdrop-blur-md text-white rounded text-[8px] font-black uppercase tracking-tighter shadow-lg">
                {product.warranty.days}D WARRANTY
              </span>
            }
            <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter text-white rounded shadow-lg backdrop-blur-md ${
              product.quantity > product.minStock ? 'bg-emerald-600/90' : 
              product.quantity > 0 ? 'bg-amber-600/90' : 
              'bg-rose-600/90'
            }`}>
              {product.quantity > product.minStock ? 'IN STOCK' : product.quantity > 0 ? 'LOW STOCK' : 'OUT OF STOCK'}
            </span>
          </div>
        )}
        
        {isSelected && <div className="absolute inset-0 bg-blue-500/10 pointer-events-none"></div>}
        {product.approvalStatus === 'pending' && (
          <div className="absolute bottom-0 left-0 w-full bg-amber-500/90 backdrop-blur-sm text-amber-950 text-[8px] font-black py-0.5 text-center uppercase tracking-widest z-10">
            Pending
          </div>
        )}
      </div>

      <div className={`p-1.5 md:p-3 flex flex-col flex-grow min-w-0 justify-between ${size === 'large' ? 'py-1 md:py-2' : ''}`}>
        <div>
          <h3 className={`font-semibold text-slate-900 dark:text-gray-100 leading-tight ${isCompact ? 'text-[10px] sm:text-[11px]' : 'text-xs md:text-sm'} mb-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2`} title={product.name}>
            {product.name}
          </h3>
          
          {!isMinimal && (
            <div className="flex flex-col gap-0 mb-1">
              <div className="flex items-center gap-1">
                <span className="text-[8px] sm:text-[11px] text-slate-500 dark:text-gray-400 truncate">
                  {product.category} {product.brand && `| ${product.brand}`}
                </span>
              </div>
              <span className="text-[7px] sm:text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                SKU: {product.sku}
              </span>
            </div>
          )}
        </div>
        
        {/* Mobile Badges (Bottom Left) */}
        {!isMinimal ? (
          <div className="sm:hidden flex flex-wrap items-center gap-1 mt-0.5">
            {product.warranty?.enabled &&
              <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[7px] font-bold uppercase tracking-wider">
                {product.warranty.days}d Wty
              </span>
            }
            <span className={`px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider rounded border ${
              product.quantity > product.minStock ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
              product.quantity > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
              'bg-rose-500/20 text-rose-400 border-rose-500/30'
            }`}>
              {product.quantity > product.minStock ? `${product.quantity} In Stock` : product.quantity > 0 ? `${product.quantity} Low` : 'Out'}
            </span>
          </div>
        ) : (
          <div className="sm:hidden flex items-center gap-1 mt-0.5">
             <span className={`w-1.5 h-1.5 rounded-full ${product.quantity > product.minStock ? 'bg-emerald-500' : product.quantity > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
             <span className="text-[8px] text-slate-500 dark:text-gray-400 font-bold">{product.quantity}</span>
          </div>
        )}

        {/* Mobile Price */}
        <div className="sm:hidden mt-1 flex items-baseline gap-0.5">
           <p className={`${isMinimal ? 'text-[10px]' : 'text-[11px]'} font-bold text-blue-600 dark:text-blue-400 tracking-tight`}>
             {priceDisplay.split(' ')[0]}
           </p>
           {isRightSideCurrency && <span className="text-[8px] font-semibold text-blue-600/60 dark:text-blue-500/60 uppercase">{settings.currencySymbol}</span>}
        </div>

        {/* Desktop Price & Stock */}
        <div className="hidden sm:flex mt-2 items-end justify-between">
          <div className="flex flex-col">
            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-0.5">Price</p>
            <div className="flex items-baseline gap-0.5">
              <p className={`font-bold ${isCompact ? 'text-[10px]' : 'text-base'} text-blue-600 dark:text-blue-400 tracking-tight`}>
                {priceDisplay.split(' ')[0]}
              </p>
              {isRightSideCurrency && <span className="text-[9px] font-semibold text-blue-600/60 dark:text-blue-500/60 uppercase">{settings.currencySymbol}</span>}
            </div>
          </div>
          {!isMinimal && user?.role !== 'customer' && (
            <div className="text-right">
              <p className="text-[8px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-0.5">Stock</p>
              <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-zinc-900/80 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 shadow-inner">
                <span className={`w-1.5 h-1.5 rounded-full ${product.quantity > product.minStock ? 'bg-emerald-500' : product.quantity > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                <p className="text-[10px] font-bold text-slate-700 dark:text-gray-200 tracking-tight">
                  {product.quantity} <span className="text-[8px] text-slate-500 dark:text-slate-500 font-medium ml-0.5">PCS</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons */}
        {!isMinimal && user?.role !== 'customer' && (
          <div className="sm:hidden mt-1.5 pt-1.5 border-t border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1 w-full justify-between">
              <button 
                onClick={(e) => handleActionClick(e, 'print')} 
                className="flex-1 flex items-center justify-center py-1 bg-slate-100/80 dark:bg-zinc-900/80 rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-95 shadow-sm" 
                title="Print Label"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              </button>

              {canEdit && (
                <button 
                  onClick={(e) => handleActionClick(e, 'edit')} 
                  className="flex-1 flex items-center justify-center py-1 bg-slate-100/80 dark:bg-zinc-900/80 rounded border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all active:scale-95 shadow-sm" 
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                </button>
              )}

              {canDelete && (
                <button 
                  onClick={(e) => handleActionClick(e, 'trash')} 
                  className="flex-1 flex items-center justify-center py-1 bg-rose-50 dark:bg-rose-500/10 rounded border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-all active:scale-95 shadow-sm" 
                  title="Delete"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Desktop Action Buttons */}
      {!isMinimal && user?.role !== 'customer' && (
        <div className="hidden sm:flex px-2 py-2 bg-slate-50/60 dark:bg-zinc-950/60 justify-center gap-2 border-t border-slate-200/50 dark:border-zinc-800">
          <div className="flex items-center bg-white/80 dark:bg-zinc-950/80 rounded-lg p-1 border border-slate-200/50 dark:border-zinc-800 w-full justify-around shadow-inner">
            <button 
              onClick={(e) => handleActionClick(e, 'print')} 
              className="flex-1 flex items-center justify-center py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all group/btn" 
              title="Print Label"
            >
              <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
            
            <div className="w-px h-5 bg-slate-200 dark:bg-gray-700"></div>

            {canEdit && (
              <button 
                onClick={(e) => handleActionClick(e, 'edit')} 
                className="flex-1 flex items-center justify-center py-2 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all group/btn" 
                title="Edit"
              >
                <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
              </button>
            )}
            
            <div className="w-px h-5 bg-slate-200 dark:bg-gray-700"></div>

            {canDelete && (
              <button 
                onClick={(e) => handleActionClick(e, 'trash')} 
                className="flex-1 flex items-center justify-center py-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-500 transition-all group/btn" 
                title="Delete"
              >
                <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            
            {onApprove && product.approvalStatus === 'pending' && (
              <>
                <div className="w-px h-5 bg-slate-200 dark:bg-gray-700"></div>
                <button 
                  onClick={(e) => handleActionClick(e, 'approve')} 
                  className="flex-1 flex items-center justify-center py-2 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 transition-all group/btn" 
                  title="Approve"
                >
                  <svg className="w-5 h-5 transition-transform group-hover/btn:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
