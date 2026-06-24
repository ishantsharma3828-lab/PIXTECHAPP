
import React, { useState, useContext, useEffect } from 'react';
import { ServiceTicket, DiagnosisPart } from '../../constants/serviceTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as serviceDeskService from '../../services/serviceDeskService';
import { usePermissions } from '../../hooks/usePermissions';
import { printTicket, PrintTicketData } from '../../services/printService';
import { getCurrentUser } from '../../services/authService';

const STAGES = [
    { id: 'intake', label: 'Intake' },
    { id: 'diagnosis', label: 'Diagnosis' },
    { id: 'pending_admin', label: 'Admin Review' },
    { id: 'pending_customer', label: 'Customer Approval' },
    { id: 'repair', label: 'In Repair' },
    { id: 'qc', label: 'QC Check' },
    { id: 'ready', label: 'Ready' },
];

const STAGE_INDEX: Record<string, number> = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));

const STATUS_THEMES: Record<string, string> = {
    intake: 'bg-amber-100 text-amber-700 border-amber-500',
    diagnosis: 'bg-blue-100 text-blue-700 border-blue-500',
    pending_admin: 'bg-purple-100 text-purple-700 border-purple-500',
    pending_customer: 'bg-pink-100 text-pink-700 border-pink-500',
    repair: 'bg-indigo-100 text-indigo-700 border-indigo-500',
    qc: 'bg-teal-100 text-teal-700 border-teal-500',
    ready: 'bg-green-100 text-green-700 border-green-500',
    closed: 'bg-stone-100 text-stone-700 border-stone-500',
};

const STATUS_LABELS: Record<string, string> = {
    intake: 'Intake', diagnosis: 'Diagnosis', pending_admin: 'Admin Review', 
    pending_customer: 'Customer Approval', repair: 'In Repair', qc: 'QC Check', ready: 'Ready', closed: 'Closed'
};

const SectionCard: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-5 mb-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wider mb-4">{title}</h3>
        {children}
    </div>
);

const Field: React.FC<{ label: string, children: React.ReactNode, half?: boolean }> = ({ label, children, half }) => (
    <div className={`mb-3 ${half ? 'flex-1 min-w-[calc(50%-0.5rem)]' : 'w-full'}`}>
        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">{label}</label>
        {children}
    </div>
);

const InfoRow: React.FC<{ label: string, value: string | undefined, mono?: boolean }> = ({ label, value, mono }) => (
    <div className="mb-3">
        <p className="m-0 text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`m-0 mt-0.5 text-sm text-slate-800 dark:text-gray-200 ${mono ? 'font-mono' : ''}`}>{value || "—"}</p>
    </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const theme = STATUS_THEMES[status] || STATUS_THEMES.intake;
    return (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${theme}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

interface TicketDetailsWorkspaceProps {
    ticket: ServiceTicket | null;
    onUpdate: () => void;
}

const TicketDetailsWorkspace: React.FC<TicketDetailsWorkspaceProps> = ({ ticket, onUpdate }) => {
    const { settings } = useContext(SettingsContext);
    const { canEditTicket, isManager, isCashier, isRepairman } = usePermissions();
    const user = getCurrentUser();

    // Determine if user sees the admin pricing or tech pricing
    const seesAdminPrice = isManager || isCashier;
    
    // Formatting
    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toLocaleString()} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toLocaleString()}`;

    // Local states for Diagnosis (Tech View)
    const [diagLocal, setDiagLocal] = useState({ techNotes: '', parts: [] as DiagnosisPart[], laborCost: 0, estimatedHours: 0, approved: false });
    const [newPart, setNewPart] = useState({ name: "", qty: 1, price: "" });

    // Local states for Admin Review
    const [adminDiag, setAdminDiag] = useState({ parts: [] as DiagnosisPart[], laborCost: 0, adminNotes: '' });
    const [adminNewPart, setAdminNewPart] = useState({ name: "", qty: 1, price: "" });

    // Local states for Customer Decision
    const [declineReason, setDeclineReason] = useState('');

    const [lastId, setLastId] = useState('');

    const addPart = () => {
        if (!newPart.name) return;
        const part: DiagnosisPart = {
            id: Math.random().toString(36).substring(7),
            name: newPart.name,
            qty: newPart.qty || 1,
            price: Number(newPart.price) || 0
        };
        setDiagLocal({ ...diagLocal, parts: [...diagLocal.parts, part] });
        setNewPart({ name: '', qty: 1, price: '' });
    };

    const removePart = (id: string) => {
        setDiagLocal({ ...diagLocal, parts: diagLocal.parts.filter(p => p.id !== id) });
    };

    useEffect(() => {
        if (ticket && ticket.id !== lastId) {
            setDiagLocal(ticket.diagnosisData || { techNotes: '', parts: [], laborCost: 0, estimatedHours: 0, approved: false });
            if (ticket.adminReview) {
                setAdminDiag({ parts: ticket.adminReview.adjustedParts, laborCost: ticket.adminReview.adjustedLaborCost, adminNotes: ticket.adminReview.adminNotes });
            } else {
                // Pre-fill with tech's quote
                setAdminDiag({ parts: ticket.diagnosisData?.parts || [], laborCost: ticket.diagnosisData?.laborCost || 0, adminNotes: '' });
            }
            setLastId(ticket.id);
        }
    }, [ticket, lastId]);

    if (!ticket) return null;

    // --- ACTIONS ---

    const submitTechDiagnosis = () => {
        if (!canEditTicket) return;
        serviceDeskService.submitDiagnosis(ticket, diagLocal);
        onUpdate();
    };

    const approveAdminReview = () => {
        if (!seesAdminPrice) return;
        serviceDeskService.adminApprove(ticket, adminDiag.parts, adminDiag.laborCost, adminDiag.adminNotes, user?.username || 'admin', user?.id || 'sys');
        onUpdate();
    };

    const rejectAdminReview = () => {
        if (!seesAdminPrice) return;
        serviceDeskService.adminReject(ticket, adminDiag.adminNotes, user?.username || 'admin', user?.id || 'sys');
        onUpdate();
    };

    const handleCustomerApprove = () => {
        serviceDeskService.customerApprove(ticket, user?.username || 'staff', user?.id || 'sys');
        onUpdate();
    };

    const handleCustomerDecline = () => {
        if (!declineReason) return alert("Please enter a reason for declining.");
        serviceDeskService.customerDecline(ticket, declineReason, user?.username || 'staff', user?.id || 'sys');
        onUpdate();
    };

    const advanceTo = (status: any) => {
        serviceDeskService.advanceTicket(ticket, status);
        onUpdate();
    };

    // --- PRINTING ---

    const handlePrint = (type: 'intake' | 'quote' | 'final', format: 'thermal' | 'a4') => {
        // Use admin price if available AND user is allowed to see it. Otherwise use tech price.
        const useAdminPricing = ticket.adminReview && seesAdminPrice;
        
        const parts = useAdminPricing ? ticket.adminReview!.adjustedParts : ticket.diagnosisData.parts;
        const laborCost = useAdminPricing ? ticket.adminReview!.adjustedLaborCost : ticket.diagnosisData.laborCost;
        const total = serviceDeskService[useAdminPricing ? 'calculateAdminTotal' : 'calculateTechTotal'](ticket);

        const mainDevice = ticket.devices && ticket.devices.length > 0 ? ticket.devices[0] : null;

        const data: PrintTicketData = {
            ticketNumber: ticket.ticketNumber,
            customerName: ticket.customerName,
            customerPhone: ticket.customerPhone,
            deviceType: mainDevice ? mainDevice.type : 'N/A',
            brand: mainDevice ? mainDevice.brand : '',
            model: mainDevice ? mainDevice.model : '',
            serialNumber: mainDevice ? mainDevice.serialNumber : '',
            problemDescription: ticket.problemDescription,
            dateIn: ticket.dateIn,
            printType: type,
            parts,
            laborCost,
            estimatedHours: ticket.diagnosisData.estimatedHours,
            techNotes: ticket.diagnosisData.techNotes,
            total,
            deposit: ticket.deposit,
            currencySymbol: settings.currencySymbol,
            companyName: settings.companyName,
            companyPhone: settings.companyPhones?.[0] || '',
        };
        printTicket(data, format);
    };

    // --- UI CALCS ---

    const currentIdx = ticket.status === "closed" ? 7 : (STAGE_INDEX[ticket.status] ?? 0);
    const isTech = isRepairman && !isManager;

    const PrintMenu = ({ type }: { type: 'intake' | 'quote' | 'final' }) => (
        <div className="flex gap-2">
            <button onClick={() => handlePrint(type, 'thermal')} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded flex items-center gap-1 border border-slate-300 dark:border-gray-600 shadow-sm transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Thermal Print
            </button>
            <button onClick={() => handlePrint(type, 'a4')} className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 rounded flex items-center gap-1 border border-slate-300 dark:border-gray-600 shadow-sm transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                A4 Print
            </button>
        </div>
    );

    return (
        <div className="w-full pb-20 animate-in fade-in slide-in-from-bottom-4 relative">
            
            {/* Header Actions */}
            <div className="absolute top-0 right-0 flex gap-2">
                <PrintMenu type={ticket.status === 'closed' ? 'final' : ticket.status === 'intake' ? 'intake' : 'quote'} />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-8 mt-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-slate-500 dark:text-gray-400">{ticket.ticketNumber}</span>
                        <StatusBadge status={ticket.status} />
                    </div>
                    <h1 className="m-0 text-2xl font-bold text-slate-800 dark:text-white">{ticket.customerName}</h1>
                </div>
            </div>

            {/* Pipeline Visual */}
            <div className="flex items-start mb-8 w-full">
                {STAGES.map((stage, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    
                    // Hide admin review and customer approval from pure repairmen
                    if (isTech && (stage.id === 'pending_admin' || stage.id === 'pending_customer')) return null;

                    return (
                        <div key={stage.id} className="flex items-start flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1.5 flex-1 z-10 relative">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                                    ${done ? 'bg-green-100 border-green-600 text-green-700' 
                                    : active ? 'bg-amber-100 border-amber-600 text-amber-700' 
                                    : 'bg-slate-100 border-slate-300 text-slate-400'}`}
                                >
                                    {done ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> : (i + 1)}
                                </div>
                                <span className={`text-[11px] text-center leading-tight
                                    ${active ? 'text-amber-700 font-bold' : done ? 'text-green-700' : 'text-slate-400'}`}>
                                    {stage.label}
                                </span>
                            </div>
                            {i < STAGES.length - 1 && (
                                <div className={`h-[2px] flex-1 mt-3.5 -ml-4 -mr-4 z-0 ${done ? 'bg-green-500' : 'bg-slate-200 dark:bg-gray-700'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Devices & Intake */}
            <SectionCard title="Devices & Problem">
                <div className="flex flex-wrap gap-4 mb-4">
                    <InfoRow label="Phone" value={ticket.customerPhone} />
                    <InfoRow label="Created" value={new Date(ticket.dateIn).toLocaleDateString()} />
                    <InfoRow label="Urgency" value={ticket.urgency.toUpperCase()} />
                </div>
                
                <div className="space-y-4">
                    {ticket.devices?.map((dev, i) => (
                        <div key={dev.id || i} className="p-3 bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Device {i + 1}</h4>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                <InfoRow label="Type" value={dev.type} />
                                <InfoRow label="Brand/Model" value={`${dev.brand} ${dev.model}`} />
                                <InfoRow label="Serial" value={dev.serialNumber} mono />
                                {dev.password && <InfoRow label="Password" value={dev.password} mono />}
                            </div>
                            {dev.conditionNotes && (
                                <p className="text-sm mt-2"><strong className="text-xs uppercase text-slate-500">Condition:</strong> {dev.conditionNotes}</p>
                            )}
                            {dev.accessories && (
                                <p className="text-sm mt-1"><strong className="text-xs uppercase text-slate-500">Accessories:</strong> {dev.accessories}</p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-500 uppercase mb-1">Reported Problem</p>
                    <p className="text-sm text-slate-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.problemDescription}</p>
                </div>

                {ticket.status === 'intake' && canEditTicket && (
                    <div className="mt-5 flex justify-end">
                        <button onClick={() => advanceTo('diagnosis')} className="px-5 py-2 bg-[var(--color-primary)] text-white rounded shadow hover:opacity-90 font-bold">
                            Start Diagnosis
                        </button>
                    </div>
                )}
            </SectionCard>

            {/* DIAGNOSIS STAGE (Tech View) */}
            {currentIdx >= 1 && (
                <SectionCard title="Technician Diagnosis">
                    {ticket.status === 'diagnosis' ? (
                        <div className="space-y-4">
                            <Field label="Diagnosis Notes">
                                <textarea value={diagLocal.techNotes} onChange={e => setDiagLocal({...diagLocal, techNotes: e.target.value})} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900 dark:border-gray-700 text-sm h-20" placeholder="What was found..." />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Estimated Labor Cost">
                                    <input type="number" value={diagLocal.laborCost} onChange={e => setDiagLocal({...diagLocal, laborCost: Number(e.target.value)})} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900 dark:border-gray-700" />
                                </Field>
                                <Field label="Estimated Hours">
                                    <input type="number" value={diagLocal.estimatedHours} onChange={e => setDiagLocal({...diagLocal, estimatedHours: Number(e.target.value)})} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900 dark:border-gray-700" />
                                </Field>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Required Parts</label>
                                {diagLocal.parts.map(p => (
                                    <div key={p.id} className="flex gap-2 items-center mb-2 p-2 bg-slate-50 dark:bg-gray-900 border rounded">
                                        <div className="flex-1 text-sm font-medium">{p.name}</div>
                                        <div className="text-sm w-16 text-center">x{p.qty}</div>
                                        <div className="text-sm font-mono w-24 text-right">{formatPrice(p.price)}</div>
                                        <button onClick={() => removePart(p.id)} className="text-red-500 p-1 hover:bg-red-100 rounded">×</button>
                                    </div>
                                ))}
                                <div className="flex gap-2 items-center mt-2">
                                    <input value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} placeholder="Part Name" className="flex-1 p-2 border rounded text-sm bg-slate-50 dark:bg-gray-900 dark:border-gray-700" />
                                    <input type="number" value={newPart.qty} onChange={e => setNewPart({...newPart, qty: Number(e.target.value)})} placeholder="Qty" className="w-16 p-2 border rounded text-sm bg-slate-50 dark:bg-gray-900 dark:border-gray-700 text-center" />
                                    <input type="number" value={newPart.price} onChange={e => setNewPart({...newPart, price: e.target.value})} placeholder="Price" className="w-24 p-2 border rounded text-sm bg-slate-50 dark:bg-gray-900 dark:border-gray-700" />
                                    <button onClick={addPart} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm font-bold">+</button>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 dark:border-gray-700 flex justify-between items-center">
                                <div className="text-lg font-bold">Tech Quote Total: <span className="text-[var(--color-primary)]">{formatPrice(diagLocal.parts.reduce((s, p) => s + p.price * p.qty, 0) + diagLocal.laborCost)}</span></div>
                                <button onClick={submitTechDiagnosis} className="px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-bold">
                                    Submit for Approval
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 text-sm text-slate-700 dark:text-gray-300">
                            <p><strong>Notes:</strong> {ticket.diagnosisData.techNotes}</p>
                            <p><strong>Labor:</strong> {formatPrice(ticket.diagnosisData.laborCost)} ({ticket.diagnosisData.estimatedHours}h)</p>
                            {ticket.diagnosisData.parts.length > 0 && (
                                <ul className="list-disc pl-5">
                                    {ticket.diagnosisData.parts.map(p => (
                                        <li key={p.id}>{p.name} (x{p.qty}) — {formatPrice(p.price)}</li>
                                    ))}
                                </ul>
                            )}
                            <div className="font-bold text-slate-800 dark:text-white mt-2 pt-2 border-t border-slate-200 dark:border-gray-700">
                                Tech Quoted Total: {formatPrice(serviceDeskService.calculateTechTotal(ticket))}
                            </div>
                        </div>
                    )}
                </SectionCard>
            )}

            {/* ADMIN REVIEW STAGE (Hidden from Tech) */}
            {currentIdx >= 2 && !isTech && (
                <SectionCard title="Admin Pricing & Review">
                    {ticket.status === 'pending_admin' ? (
                        <div className="space-y-4">
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg mb-4">
                                <p className="text-xs font-bold text-purple-700 dark:text-purple-400 mb-1">Admin Adjustments</p>
                                <p className="text-sm text-slate-600 dark:text-gray-400">Modify prices below for the customer quote. The technician will only see their original quote.</p>
                            </div>

                            <Field label="Admin Internal Notes (Hidden from tech & customer)">
                                <textarea value={adminDiag.adminNotes} onChange={e => setAdminDiag({...adminDiag, adminNotes: e.target.value})} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900 dark:border-gray-700 text-sm h-16" placeholder="Internal remarks..." />
                            </Field>
                            
                            <Field label="Adjusted Labor Cost">
                                <input type="number" value={adminDiag.laborCost} onChange={e => setAdminDiag({...adminDiag, laborCost: Number(e.target.value)})} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900 dark:border-gray-700" />
                            </Field>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-2">Adjusted Parts</label>
                                {adminDiag.parts.map((p, i) => (
                                    <div key={p.id} className="flex gap-2 items-center mb-2 p-2 bg-slate-50 dark:bg-gray-900 border rounded">
                                        <input className="flex-1 text-sm font-medium bg-transparent border-none outline-none" value={p.name} onChange={e => {
                                            const np = [...adminDiag.parts]; np[i].name = e.target.value; setAdminDiag({...adminDiag, parts: np});
                                        }} />
                                        <div className="text-sm w-16 text-center">x{p.qty}</div>
                                        <input type="number" className="text-sm font-mono w-24 text-right bg-transparent border-b border-gray-300 outline-none" value={p.price} onChange={e => {
                                            const np = [...adminDiag.parts]; np[i].price = Number(e.target.value); setAdminDiag({...adminDiag, parts: np});
                                        }} />
                                        <button onClick={() => setAdminDiag(d => ({...d, parts: d.parts.filter(x => x.id !== p.id)}))} className="text-red-500 p-1 hover:bg-red-100 rounded">×</button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200 dark:border-gray-700 flex justify-between items-center">
                                <div className="text-lg font-bold">Final Customer Quote: <span className="text-[var(--color-primary)]">{formatPrice(adminDiag.parts.reduce((s, p) => s + p.price * p.qty, 0) + adminDiag.laborCost)}</span></div>
                                <div className="flex gap-2">
                                    <button onClick={rejectAdminReview} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded shadow-sm hover:bg-red-50 font-bold">Reject to Tech</button>
                                    <button onClick={approveAdminReview} className="px-5 py-2 bg-[var(--color-primary)] text-white rounded shadow hover:brightness-110 font-bold">Approve & Send to Customer</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        ticket.adminReview ? (
                            <div className="space-y-2 text-sm text-slate-700 dark:text-gray-300">
                                {ticket.adminReview.adminNotes && <p><strong>Internal Notes:</strong> {ticket.adminReview.adminNotes}</p>}
                                <p><strong>Adjusted Labor:</strong> {formatPrice(ticket.adminReview.adjustedLaborCost)}</p>
                                {ticket.adminReview.adjustedParts.length > 0 && (
                                    <ul className="list-disc pl-5">
                                        {ticket.adminReview.adjustedParts.map(p => (
                                            <li key={p.id}>{p.name} (x{p.qty}) — {formatPrice(p.price)}</li>
                                        ))}
                                    </ul>
                                )}
                                <div className="font-bold text-slate-800 dark:text-white mt-2 pt-2 border-t border-slate-200 dark:border-gray-700">
                                    Final Customer Quote: {formatPrice(serviceDeskService.calculateAdminTotal(ticket))}
                                </div>
                            </div>
                        ) : <p className="text-sm text-gray-500">Skipped or pending.</p>
                    )}
                </SectionCard>
            )}

            {/* CUSTOMER APPROVAL STAGE */}
            {currentIdx >= 3 && !isTech && (
                <SectionCard title="Customer Approval">
                    {ticket.status === 'pending_customer' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-700 dark:text-gray-300">The customer must approve the final quote of <strong>{formatPrice(serviceDeskService.calculateCustomerTotal(ticket))}</strong> before repair begins.</p>
                            
                            <div className="flex gap-4 items-end mt-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Decline Reason (Optional)</label>
                                    <input value={declineReason} onChange={e => setDeclineReason(e.target.value)} className="w-full p-2 border rounded bg-slate-50 dark:bg-gray-900" placeholder="If declining, why?" />
                                </div>
                                <button onClick={handleCustomerDecline} className="px-4 py-2 bg-red-100 text-red-700 rounded shadow hover:bg-red-200 font-bold">Customer Declined</button>
                                <button onClick={handleCustomerApprove} className="px-5 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 font-bold">Customer Approved</button>
                            </div>
                        </div>
                    ) : (
                        ticket.customerConfirmation ? (
                            <div className="text-sm">
                                <p><strong>Decision:</strong> <span className={ticket.customerConfirmation.decision === 'approved' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{ticket.customerConfirmation.decision.toUpperCase()}</span></p>
                                {ticket.customerConfirmation.declineReason && <p><strong>Reason:</strong> {ticket.customerConfirmation.declineReason}</p>}
                                <p className="text-xs text-gray-400 mt-1">Recorded by {ticket.customerConfirmation.decidedBy} at {new Date(ticket.customerConfirmation.decidedAt).toLocaleString()}</p>
                            </div>
                        ) : <p className="text-sm text-gray-500">No decision recorded.</p>
                    )}
                </SectionCard>
            )}

            {/* REPAIR STAGE */}
            {currentIdx >= 4 && (
                <SectionCard title="Repair Phase">
                    {ticket.status === 'repair' ? (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600 dark:text-gray-400">Repair in progress by technician...</p>
                            {canEditTicket && (
                                <button onClick={() => advanceTo('qc')} className="px-5 py-2 bg-[var(--color-primary)] text-white rounded shadow hover:opacity-90 font-bold">
                                    Repair Complete → Send to QC
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700 dark:text-gray-300">Repair finished.</p>
                    )}
                </SectionCard>
            )}

            {/* QC STAGE */}
            {currentIdx >= 5 && (
                <SectionCard title="Quality Control">
                    {ticket.status === 'qc' ? (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600 dark:text-gray-400">Performing final checks...</p>
                            {canEditTicket && (
                                <button onClick={() => advanceTo('ready')} className="px-5 py-2 bg-[var(--color-primary)] text-white rounded shadow hover:opacity-90 font-bold">
                                    QC Passed → Mark Ready
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-700 dark:text-gray-300">QC Passed.</p>
                    )}
                </SectionCard>
            )}

            {/* READY / CLOSED STAGE */}
            {currentIdx >= 6 && (
                <SectionCard title="Delivery & Closure">
                    {ticket.status === 'ready' ? (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600 dark:text-gray-400">Device is ready for customer pickup. Collect payment and close.</p>
                            {canEditTicket && (
                                <button onClick={() => advanceTo('closed')} className="px-5 py-2 bg-slate-800 text-white rounded shadow hover:bg-slate-700 font-bold flex gap-2 items-center">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Close Ticket & Print Invoice
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm">
                            <p className="font-bold text-green-600 mb-2">Ticket is CLOSED and finalized.</p>
                            {ticket.dateOut && <p><strong>Date Out:</strong> {new Date(ticket.dateOut).toLocaleString()}</p>}
                        </div>
                    )}
                </SectionCard>
            )}

        </div>
    );
};

export default TicketDetailsWorkspace;
