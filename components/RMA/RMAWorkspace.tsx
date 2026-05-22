
import React, { useState, useEffect, useContext } from 'react';
import { RMA } from '../../constants/rmaTypes';
import * as rmaService from '../../services/rmaService';
import { SettingsContext } from '../../contexts/SettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getCurrentUser } from '../../services/authService';

interface RMAWorkspaceProps {
    rma: RMA | null;
    onUpdate: () => void;
}

const RMAWorkspace: React.FC<RMAWorkspaceProps> = ({ rma, onUpdate }) => {
    const { t } = useContext(SettingsContext);
    const { canViewSupplierWarranty, isManager } = usePermissions();
    const user = getCurrentUser();
    
    const [inspectionNotes, setInspectionNotes] = useState('');
    const [techResult, setTechResult] = useState<RMA['technicianResult']>('ntf');

    useEffect(() => {
        if (rma) {
            setInspectionNotes(rma.inspectionNotes || '');
            setTechResult(rma.technicianResult || 'ntf');
        }
    }, [rma]);

    if (!rma) {
        return (
            <div className="flex-[2] bg-white dark:bg-gray-800 border-l border-slate-200 dark:border-zinc-800 flex items-center justify-center text-gray-400">
                <p>Select an RMA to view details</p>
            </div>
        );
    }

    const handleUpdateStatus = (newStatus: any) => {
        rmaService.updateRMAStatus(rma.id, newStatus, {
            inspectionNotes: inspectionNotes,
            technicianResult: techResult
        });
        onUpdate();
    };

    const handleReject = () => {
        const reason = prompt("Enter rejection reason:");
        if (reason) {
            handleUpdateStatus('rejected');
        }
    };

    return (
        <div className="flex-1 w-full bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex flex-col h-full shadow-xl relative z-30 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{rma.rmaNumber}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${rma.type === 'customer_return' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                            {rma.type === 'customer_return' ? t('rma.type.customer') : t('rma.type.supplier')}
                        </span>
                        <span className="text-sm text-slate-500">{t('rma.workspace.ref')}: {rma.linkedDocumentId}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold uppercase ${rma.policyStatus === 'in_policy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {rma.policyStatus === 'in_policy' ? t('rma.policy.in') : t('rma.policy.out')}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Info Card */}
                <div className="bg-slate-50 dark:bg-gray-700/30 p-4 rounded-lg border border-slate-200 dark:border-zinc-800 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <label className="block text-xs text-slate-500 uppercase">{t('rma.workspace.contact')}</label>
                        <p className="font-bold text-slate-800 dark:text-white">{rma.contactName}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase">{t('rma.product')}</label>
                        <p className="font-bold text-slate-800 dark:text-white">{rma.productName}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase">{t('rma.serial')}</label>
                        <p className="font-mono text-slate-800 dark:text-white">{rma.serialNumber || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 uppercase">Reason / Condition</label>
                        <p className="text-slate-800 dark:text-white capitalize">{t(`rma.reason.${rma.reason}`)} / {t(`rma.condition.${rma.condition}`)}</p>
                    </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                    <label className="block text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase">Customer Notes</label>
                    <p className="text-sm text-slate-700 dark:text-gray-300 italic">"{rma.customerNotes}"</p>
                </div>

                {/* Inspection Workspace - Active if Received or Inspecting */}
                <div className="border-t border-slate-200 dark:border-zinc-800 pt-6">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-3">{t('rma.workspace.inspection')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('rma.workspace.findings')}</label>
                            <textarea 
                                value={inspectionNotes}
                                onChange={(e) => setInspectionNotes(e.target.value)}
                                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                                rows={3}
                                placeholder="..."
                                disabled={['closed', 'refunded', 'replaced', 'rejected'].includes(rma.status)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('rma.workspace.result')}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={techResult === 'pass'} onChange={() => setTechResult('pass')} name="techResult" className="text-green-600" disabled={['closed', 'refunded', 'replaced', 'rejected'].includes(rma.status)} />
                                    <span className="text-sm font-medium">{t('rma.workspace.pass')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={techResult === 'fail'} onChange={() => setTechResult('fail')} name="techResult" className="text-red-600" disabled={['closed', 'refunded', 'replaced', 'rejected'].includes(rma.status)} />
                                    <span className="text-sm font-medium">{t('rma.workspace.fail')}</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={techResult === 'ntf'} onChange={() => setTechResult('ntf')} name="techResult" className="text-slate-600" disabled={['closed', 'refunded', 'replaced', 'rejected'].includes(rma.status)} />
                                    <span className="text-sm font-medium">{t('rma.workspace.ntf')}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 dark:bg-gray-900 border-t border-slate-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
                
                {rma.status === 'requested' && (
                    <>
                        <button onClick={handleReject} className="py-2 bg-red-100 text-red-700 rounded font-bold hover:bg-red-200">{t('rma.action.reject')}</button>
                        <button onClick={() => handleUpdateStatus('approved')} className="py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">{t('rma.action.approve')}</button>
                    </>
                )}

                {rma.status === 'approved' && (
                    <button onClick={() => handleUpdateStatus('received')} className="col-span-2 py-2 bg-yellow-500 text-white rounded font-bold hover:bg-yellow-600">{t('rma.action.receive')}</button>
                )}

                {rma.status === 'received' && (
                    <button onClick={() => handleUpdateStatus('inspecting')} className="col-span-2 py-2 bg-orange-500 text-white rounded font-bold hover:bg-orange-600">{t('rma.action.inspect')}</button>
                )}

                {rma.status === 'inspecting' && (
                    <button onClick={() => handleUpdateStatus('pending_admin')} className="col-span-2 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">Submit for Admin Approval</button>
                )}

                {rma.status === 'pending_admin' && (
                    isManager ? (
                        <>
                            {canViewSupplierWarranty && (
                                <button onClick={() => handleUpdateStatus('awaiting_supplier')} className="py-2 bg-purple-100 text-purple-700 rounded font-bold hover:bg-purple-200">{t('rma.action.send_supplier')}</button>
                            )}
                            <button onClick={() => handleUpdateStatus('refunded')} className="py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">{t('rma.action.refund')}</button>
                            <button onClick={() => handleUpdateStatus('replaced')} className="col-span-2 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">{t('rma.action.replace')}</button>
                        </>
                    ) : (
                        <div className="col-span-2 text-center text-slate-500 font-bold py-2 bg-slate-100 dark:bg-gray-800 rounded">
                            WAITING FOR ADMIN APPROVAL
                        </div>
                    )
                )}

                {['awaiting_supplier'].includes(rma.status) && (
                    <button onClick={() => handleUpdateStatus('closed')} className="col-span-2 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-900">{t('rma.action.close')}</button>
                )}

                {['closed', 'refunded', 'replaced', 'rejected'].includes(rma.status) && (
                    <div className="col-span-2 text-center text-slate-500 font-bold py-2 bg-slate-200 dark:bg-gray-800 rounded">
                        RMA CLOSED
                    </div>
                )}
            </div>
        </div>
    );
};

export default RMAWorkspace;
