import React from 'react';
import { CloudUpload, Lightbulb, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onClose: () => void;
  onSelectBulkImport: () => void;
  onSelectAiInvoice: () => void;
  onSelectManualEntry: () => void;
}

const AddProductOptionsModal: React.FC<Props> = ({ onClose, onSelectBulkImport, onSelectAiInvoice, onSelectManualEntry }) => {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto" 
          onClick={onClose} 
        />
        
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[28px] w-full sm:max-w-[400px] shadow-2xl absolute bottom-0 sm:relative z-10 border-t sm:border border-slate-100 dark:border-zinc-800 flex flex-col pb-6 sm:pb-4 pointer-events-auto"
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2 sm:hidden"></div>

          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <CloudUpload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-base font-bold text-slate-800 dark:text-white leading-tight">Add Products</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Choose how you want to add items</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors">
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Options */}
          <div className="p-6 space-y-4">
            <button 
              onClick={onSelectBulkImport}
              className="w-full flex items-center p-4 sm:p-5 rounded-2xl border border-dashed border-[#b3d4ff] bg-[#f0f7ff] hover:bg-[#e6f2ff] transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-[14px] border border-slate-100 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:-translate-y-0.5 transition-transform">
                <CloudUpload className="w-5 h-5 text-blue-500" />
              </div>
              <div className="ml-5 text-left">
                <span className="block text-sm font-bold text-slate-700 tracking-wide uppercase">BULK IMPORT</span>
              </div>
            </button>

            <button 
              onClick={onSelectAiInvoice}
              className="w-full flex items-center p-4 sm:p-5 rounded-2xl border border-dashed border-slate-200 hover:border-[#e9d5ff] bg-white hover:bg-[#faf5ff] transition-all group relative"
            >
              <div className="absolute top-4 right-4 bg-[#b535f6] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-[6px] shadow-sm">
                NEW
              </div>
              <div className="w-12 h-12 bg-white rounded-[14px] border border-slate-100 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:-translate-y-0.5 transition-transform">
                <Lightbulb className="w-5 h-5 text-slate-400" />
              </div>
              <div className="ml-5 text-left pr-6">
                <span className="block text-sm font-bold text-slate-700 tracking-wide uppercase">AI INVOICE ANALYZER</span>
              </div>
            </button>

            <button 
              onClick={onSelectManualEntry}
              className="w-full flex items-center p-4 sm:p-5 rounded-2xl border border-dashed border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-[14px] border border-slate-100 flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:-translate-y-0.5 transition-transform">
                <Edit className="w-5 h-5 text-slate-400" />
              </div>
              <div className="ml-5 text-left">
                <span className="block text-sm font-bold text-slate-700 tracking-wide uppercase">MANUAL ENTRY</span>
              </div>
            </button>
          </div>
          
          <div className="h-4 sm:hidden"></div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddProductOptionsModal;
