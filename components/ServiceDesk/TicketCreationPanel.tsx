
import React, { useState, useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { Customer } from '../../constants/billingTypes';
import { UrgencyLevel, TicketDevice } from '../../constants/serviceTypes';
import * as serviceDeskService from '../../services/serviceDeskService';
import CustomerSelectionModal from '../Billing/CustomerSelectionModal';
import { getCurrentUser } from '../../services/authService';
import { usePermissions } from '../../hooks/usePermissions';

interface TicketCreationPanelProps {
    onCreate: (newTicketId?: string) => void;
}

const TicketCreationPanel: React.FC<TicketCreationPanelProps> = ({ onCreate }) => {
    const { settings, t } = useContext(SettingsContext);
    const user = getCurrentUser();
    const { isCustomer, canEditTicket } = usePermissions();
    const requiresApproval = !canEditTicket;
    const role = user?.role || 'customer';
    
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);

    React.useEffect(() => {
        if (role === 'customer' && user) {
            setCustomer({
                id: user.id || 'unknown',
                name: user.fullName || user.username,
                email: user.email || '',
                phone: user.phone || '',
                address: '',
                loyaltyPoints: 0,
                totalSpent: 0,
                tier: 'Bronze',
                currentBalance: 0
            });
        }
    }, [role, user]);

    const defaultDevice = {
        type: '',
        brand: '',
        model: '',
        serialNumber: '',
        password: '',
        conditionNotes: '',
        accessories: '',
        condition: { screenOk: true, portsOk: true, bodyOk: true, batteryOk: true }
    };

    const [devices, setDevices] = useState<Omit<TicketDevice, 'id'>[]>([{ ...defaultDevice }]);
    const [problemDescription, setProblemDescription] = useState('');
    const [urgency, setUrgency] = useState<UrgencyLevel>('normal');
    
    // For handling "Other" device type
    const [otherTypes, setOtherTypes] = useState<Record<number, string>>({});

    const handleDeviceChange = (index: number, field: string, value: any) => {
        const newDevices = [...devices];
        newDevices[index] = { ...newDevices[index], [field]: value };
        setDevices(newDevices);
    };

    const addDevice = () => {
        setDevices([...devices, { ...defaultDevice }]);
    };

    const removeDevice = (index: number) => {
        if (devices.length > 1) {
            setDevices(devices.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) {
            alert("Please select a customer.");
            return;
        }
        if (devices.some(d => !d.type)) {
            alert("Please select a device type for all devices.");
            return;
        }
        if (!problemDescription) {
            alert("Please describe the problem.");
            return;
        }

        const formattedDevices = devices.map((d, index) => ({
            ...d,
            id: `dev_${Date.now()}_${index}`,
            type: d.type === 'Other' && otherTypes[index] ? `Other: ${otherTypes[index]}` : d.type
        }));

        const newTicket = serviceDeskService.createTicket({
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            devices: formattedDevices,
            problemDescription,
            urgency,
        });

        alert(requiresApproval ? "Ticket submitted for approval." : "Ticket Created Successfully!");

        setCustomer(null);
        setDevices([{ ...defaultDevice }]);
        setProblemDescription('');
        setUrgency('normal');
        setOtherTypes({});

        onCreate(newTicket.id);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 md:border-r border-slate-200 dark:border-zinc-800 shadow-xl z-20 w-full md:max-w-sm shrink-0">
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    {t('service.new_intake')}
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Customer Selector */}
                {role !== 'customer' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('pc.customer')}</label>
                        {customer ? (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex justify-between items-center group">
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-white">{customer.name}</p>
                                    <p className="text-xs text-slate-500">{customer.phone}</p>
                                </div>
                                <button onClick={() => setCustomer(null)} className="text-red-400 hover:text-red-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setCustomerModalOpen(true)}
                                className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg text-slate-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                {t('service.select_customer')}
                            </button>
                        )}
                    </div>
                )}

                {/* Devices */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Devices to Repair</label>
                    </div>

                    {devices.map((device, index) => (
                        <div key={index} className="p-4 border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-gray-900 relative">
                            {devices.length > 1 && (
                                <button 
                                    onClick={() => removeDevice(index)}
                                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded-full p-1 border border-slate-200 dark:border-zinc-700"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                            
                            <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3">Device #{index + 1}</h4>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <select 
                                        value={device.type} 
                                        onChange={e => handleDeviceChange(index, 'type', e.target.value)} 
                                        className="form-select w-full"
                                    >
                                        <option value="">Select a device type...</option>
                                        <option value="Desktop PC">Desktop PC</option>
                                        <option value="Laptop">Laptop</option>
                                        <option value="Gaming Console">Gaming Console</option>
                                        <option value="Individual Component">Individual Component (GPU, Motherboard, etc.)</option>
                                        <option value="Peripherals">Peripherals (Mouse, Keyboard, etc.)</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {device.type === 'Other' && (
                                        <input 
                                            value={otherTypes[index] || ''} 
                                            onChange={e => setOtherTypes({...otherTypes, [index]: e.target.value})} 
                                            className="form-input w-full mt-2" 
                                            placeholder="Describe device..." 
                                        />
                                    )}
                                </div>
                                <div>
                                    <input value={device.brand} onChange={e => handleDeviceChange(index, 'brand', e.target.value)} className="form-input w-full" placeholder="Brand (Dell, etc.)" />
                                </div>
                                <div>
                                    <input value={device.model} onChange={e => handleDeviceChange(index, 'model', e.target.value)} className="form-input w-full" placeholder="Model" />
                                </div>
                                <div className="col-span-2">
                                    <input value={device.serialNumber} onChange={e => handleDeviceChange(index, 'serialNumber', e.target.value)} className="form-input w-full font-mono text-sm" placeholder="Serial Number" />
                                </div>
                                <div>
                                    <input value={device.password} onChange={e => handleDeviceChange(index, 'password', e.target.value)} className="form-input w-full" placeholder="Password/PIN" />
                                </div>
                                <div>
                                    <input value={device.accessories} onChange={e => handleDeviceChange(index, 'accessories', e.target.value)} className="form-input w-full" placeholder="Accessories (e.g. charger)" />
                                </div>
                                <div className="col-span-2">
                                    <input value={device.conditionNotes} onChange={e => handleDeviceChange(index, 'conditionNotes', e.target.value)} className="form-input w-full" placeholder="Physical condition notes..." />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button 
                        onClick={addDevice}
                        className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-gray-600 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        Add Another Device
                    </button>
                </div>

                {/* Problem Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('service.problem_desc')} *</label>
                    <textarea
                        value={problemDescription}
                        onChange={e => setProblemDescription(e.target.value)}
                        className="form-input w-full h-24 resize-none mb-3"
                        placeholder="Client states..."
                    />
                </div>

                {/* Extra Details */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('service.urgency')}</label>
                    <select value={urgency} onChange={e => setUrgency(e.target.value as UrgencyLevel)} className="form-select w-full">
                        <option value="normal">{t('service.urgency.normal')}</option>
                        <option value="high">{t('service.urgency.high')}</option>
                        <option value="emergency">{t('service.urgency.emergency')}</option>
                    </select>
                </div>
            </div>

            <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px)+4rem)] md:pb-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900">
                <button
                    onClick={handleSubmit}
                    className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2 mb-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t('service.create_ticket')}
                </button>
            </div>

            {isCustomerModalOpen && (
                <CustomerSelectionModal
                    onSelect={setCustomer}
                    onClose={() => setCustomerModalOpen(false)}
                />
            )}

            <style>{`
                .form-input, .form-select {
                    background-color: #f9fafb;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    padding: 0.5rem;
                    font-size: 0.875rem;
                }
                .dark .form-input, .dark .form-select {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default TicketCreationPanel;
