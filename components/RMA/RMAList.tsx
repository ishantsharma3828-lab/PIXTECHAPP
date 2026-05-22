
import React, { useContext } from 'react';
import { RMA, RMAStatus } from '../../constants/rmaTypes';
import { SettingsContext } from '../../contexts/SettingsContext';

interface RMAListProps {
    rmas: RMA[];
    selectedId: string | null;
    onSelect: (rma: RMA) => void;
}

const RMAList: React.FC<RMAListProps> = ({ rmas, selectedId, onSelect }) => {
    const { t } = useContext(SettingsContext);

    const getStatusColor = (status: RMAStatus) => {
        switch(status) {
            case 'requested': return 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-300';
            case 'approved': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
            case 'received': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'inspecting': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300';
            case 'awaiting_supplier': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300';
            case 'repaired':
            case 'replaced':
            case 'refunded':
            case 'closed': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300';
            case 'rejected': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="flex-1 bg-slate-100 dark:bg-zinc-950 flex flex-col w-full md:min-w-[300px]">
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-zinc-800 shadow-sm sticky top-0 z-10">
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t('rma.registry')} ({rmas.length})</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {rmas.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">{t('inventory.no_products')}</div>
                ) : (
                    rmas.map(rma => (
                        <div 
                            key={rma.id}
                            onClick={() => onSelect(rma)}
                            className={`bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${selectedId === rma.id ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-opacity-50' : 'border-transparent hover:border-slate-300 dark:hover:border-gray-600'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-xs font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded">{rma.rmaNumber}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusColor(rma.status)}`}>
                                    {t(`rma.status.${rma.status}`)}
                                </span>
                            </div>
                            
                            <h4 className="font-bold text-slate-800 dark:text-white truncate">{rma.productName}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{rma.serialNumber || 'No Serial'}</p>
                            
                            <div className="mt-2 text-sm text-slate-600 dark:text-gray-300 truncate">
                                {rma.type === 'customer_return' ? '👤' : '🏢'} {rma.contactName}
                            </div>

                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-400">
                                <span>{new Date(rma.createdDate).toLocaleDateString()}</span>
                                <span className="uppercase">{t(`rma.reason.${rma.reason}`)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default RMAList;
