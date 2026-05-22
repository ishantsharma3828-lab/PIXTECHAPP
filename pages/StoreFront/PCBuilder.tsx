import React, { useState, useEffect } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import * as inventoryService from '../../services/inventoryService';
import { Product } from '../../constants/inventoryFields';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';

const CATEGORIES = [
  { id: 'CPU', title: 'CPU', subtitle: 'CHOOSE YOUR PROCESSOR', image: '/pictures/cpu.webp' },
  { id: 'Motherboard', title: 'MOTHERBOARD', subtitle: 'CHOOSE YOUR MOTHERBOARD', image: '/pictures/mobo.webp' },
  { id: 'RAM', title: 'MEMORY (RAM)', subtitle: 'CHOOSE YOUR RAM', image: '/pictures/ram.webp' },
  { id: 'GPU', title: 'GRAPHICS CARD', subtitle: 'CHOOSE YOUR GRAPHICS CARD', image: '/pictures/gpu.webp' },
  { id: 'Storage', title: 'STORAGE', subtitle: 'CHOOSE YOUR STORAGE', image: '/pictures/ssd.webp' },
  { id: 'PSU', title: 'POWER SUPPLY', subtitle: 'CHOOSE YOUR POWER SUPPLY', image: '/pictures/psu.webp' },
  { id: 'Case', title: 'CASE', subtitle: 'CHOOSE YOUR CASE', image: '/pictures/case.webp' },
  { id: 'Cooling', title: 'CPU COOLER', subtitle: 'CHOOSE YOUR COOLER', image: '/pictures/cooling.webp' },
];

const getCategoryFilter = (catId: string) => {
  const map: Record<string, string[]> = {
    'CPU': ['Processor (CPU)', 'CPU'],
    'Motherboard': ['Motherboard'],
    'RAM': ['Memory (RAM)', 'RAM', 'Memory'],
    'GPU': ['Graphics Card', 'GPU', 'Video Card'],
    'Storage': ['Storage', 'Hard Drive', 'SSD'],
    'PSU': ['Power Supply', 'PSU'],
    'Case': ['Case / Chassis', 'Case'],
    'Cooling': ['Cooling', 'CPU Cooler', 'Fans'],
  };
  return map[catId] || [catId];
};

const PCBuilder: React.FC = () => {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [selectedParts, setSelectedParts] = useState<Record<string, Product>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    inventoryService.getProducts().then(setInventory);
  }, []);

  const handleSelectPart = (category: string, part: Product) => {
    setSelectedParts(prev => ({ ...prev, [category]: part }));
    setActiveCategory(null);
  };

  const handleRemovePart = (category: string) => {
    setSelectedParts(prev => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const handleAddToCart = () => {
    const parts = Object.values(selectedParts);
    if (parts.length === 0) {
      addToast('Please select at least one component', 'error');
      return;
    }
    
    const totalPrice = parts.reduce((sum, p) => sum + (p as any).price1, 0);
    const buildProduct: any = {
        id: `build_${Date.now()}`,
        sku: `BUILD-${Date.now()}`,
        name: 'Custom PC Build',
        category: 'Custom Build',
        brand: 'Custom',
        price1: totalPrice,
        price2: totalPrice,
        price3: totalPrice,
        price4: totalPrice,
        costPrice: parts.reduce((sum, p) => sum + ((p as any).costPrice || 0), 0),
        quantity: 1,
        minStock: 0,
        description: `Custom PC Build with ${parts.length} parts.`,
        warranty: { enabled: true, days: 365 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customFields: {
            isCustomBuild: true,
            buildParts: parts.map(p => (p as any).id)
        }
    };
    addToCart(buildProduct);
    addToast('Custom PC added to cart!', 'success');
    setSelectedParts({});
  };

  const totalPrice = Object.values(selectedParts).reduce((sum, p) => sum + (p as any).price1, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans text-white">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2 uppercase">Build Your PC</h1>
        <p className="text-gray-400">Select components to build your custom rig.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Component Slots */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
            const selected = selectedParts[cat.id];
            
            if (selected) {
              return (
                <div key={cat.id} className="bg-[#1c1d21] border border-white/10 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <div className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">{cat.title}</div>
                      <div className="font-bold text-sm line-clamp-2">{(selected as any).name}</div>
                      <div className="text-[var(--color-primary)] font-bold mt-1">${(selected as any).price1.toFixed(2)}</div>
                    </div>
                    {(selected as any).images?.[0] ? (
                      <img src={(selected as any).images[0].url} alt={(selected as any).name} className="w-16 h-16 object-contain bg-white/5 rounded p-1 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-white/5 rounded flex items-center justify-center shrink-0">
                        <img src={cat.image} alt={cat.title} className="w-10 h-10 object-contain opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => setActiveCategory(cat.id)} className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleRemovePart(cat.id)} className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold py-2 rounded transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={cat.id} 
                onClick={() => setActiveCategory(cat.id)}
                className="bg-[#1c1d21] border border-white/5 hover:border-[var(--color-primary)] rounded-xl p-6 flex items-center justify-between cursor-pointer transition-all group shadow-lg"
              >
                <div>
                  <div className="font-black text-lg italic tracking-wide group-hover:text-[var(--color-primary)] transition-colors">{cat.title}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{cat.subtitle}</div>
                </div>
                <img src={cat.image} alt={cat.title} className="w-12 h-12 object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>

        {/* Right: Summary Panel */}
        <div className="bg-[#1c1d21] border border-[var(--color-primary)]/30 rounded-xl p-6 shadow-[0_0_30px_rgba(255,77,77,0.1)] sticky top-24">
          <h2 className="text-2xl font-black italic tracking-wide mb-2 uppercase">Your Products</h2>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-6">And Price Range</p>
          
          <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
            {Object.entries(selectedParts).length === 0 ? (
              <div className="text-slate-500 text-sm italic py-4">No components selected yet.</div>
            ) : (
              Object.entries(selectedParts).map(([catId, part]) => (
                <div key={catId} className="flex gap-3 items-center border-b border-white/5 pb-4 last:border-0">
                  {(part as any).images?.[0] ? (
                    <img src={(part as any).images[0].url} alt={(part as any).name} className="w-12 h-12 object-contain bg-white/5 rounded p-1 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-white/5 rounded flex items-center justify-center shrink-0">
                      <img src={CATEGORIES.find(c => c.id === catId)?.image} alt={catId} className="w-8 h-8 object-contain opacity-50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-500 uppercase">{CATEGORIES.find(c => c.id === catId)?.title}</div>
                    <div className="text-sm font-bold truncate">{(part as any).name}</div>
                    <div className="text-[var(--color-primary)] text-xs font-bold">${(part as any).price1.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-black/40 rounded-lg p-4 mb-6">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Price</div>
            <div className="text-3xl font-black text-[var(--color-primary)]">${(totalPrice as any).toFixed(2)}</div>
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={Object.keys(selectedParts).length === 0}
            className="w-full bg-[var(--color-primary)] hover:bg-red-600 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-5 h-5" />
            Add to Cart
          </button>
        </div>
      </div>

      {/* Modal */}
      {activeCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1c1d21] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-wide">Select {CATEGORIES.find(c => c.id === activeCategory)?.title}</h3>
                <p className="text-sm text-gray-400 mt-1">Choose a component from our inventory</p>
              </div>
              <button onClick={() => setActiveCategory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inventory.filter(p => getCategoryFilter(activeCategory).includes(p.category)).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-500">
                    No products found in this category.
                  </div>
                ) : (
                  inventory
                    .filter(p => getCategoryFilter(activeCategory).includes(p.category))
                    .map(part => (
                    <div key={(part as any).id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 hover:border-[var(--color-primary)]/50 transition-colors">
                      {(part as any).images?.[0] ? (
                        <img src={(part as any).images[0].url} alt={(part as any).name} className="w-20 h-20 object-contain bg-white/5 rounded p-2 shrink-0" />
                      ) : (
                        <div className="w-20 h-20 bg-white/5 rounded flex items-center justify-center shrink-0">
                          <img src={CATEGORIES.find(c => c.id === activeCategory)?.image} alt={activeCategory} className="w-12 h-12 object-contain opacity-50" />
                        </div>
                      )}
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <div className="font-bold text-sm line-clamp-2 mb-1">{(part as any).name}</div>
                          <div className="text-xs text-slate-500">{(part as any).brand}</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-[var(--color-primary)] font-bold">${(part as any).price1.toFixed(2)}</div>
                          <button 
                            onClick={() => handleSelectPart(activeCategory, part)}
                            className="bg-white/10 hover:bg-[var(--color-primary)] hover:text-white text-xs font-bold px-3 py-1.5 rounded transition-colors"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PCBuilder;
