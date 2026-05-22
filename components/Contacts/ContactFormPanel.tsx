
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Contact, ContactRole, ContactType } from '../../constants/contactTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as contactService from '../../services/contactService';
import communesData from '../../data/communes.json';

interface ContactFormPanelProps {
    onSave: () => void;
    contactToEdit?: Contact | null;
    onCancelEdit: () => void;
    canEdit?: boolean;
}

const ContactFormPanel: React.FC<ContactFormPanelProps> = ({ onSave, contactToEdit, onCancelEdit, canEdit = true }) => {
    const { settings, t } = useContext(SettingsContext);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const initialFormState: Partial<Contact> = {
        type: 'individual',
        roles: ['customer'],
        name: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        city: '',
        taxId: '',
        rcNumber: '',
        nifNumber: '',
        nisNumber: '',
        artNumber: '',
        legalForm: '',
        pictureUrl: '',
        creditLimit: 0,
        paymentTerms: 'Cash',
        zrWilayaId: '',
        zrCommuneId: '',
        zrDeliveryPreference: 'pickup-point',
        zrTimeSlot: 'morning',
        zrInstruction: '',
        tags: [],
        notes: ''
    };

    const [formData, setFormData] = useState<Partial<Contact>>(initialFormState);
    const [tagInput, setTagInput] = useState('');

    // Populate form when editing
    useEffect(() => {
        if (contactToEdit) {
            setFormData(contactToEdit);
        } else {
            setFormData(initialFormState);
        }
    }, [contactToEdit]);

    const toggleRole = (role: ContactRole) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            if (currentRoles.includes(role)) {
                return { ...prev, roles: currentRoles.filter(r => r !== role) };
            } else {
                return { ...prev, roles: [...currentRoles, role] };
            }
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFormData(prev => ({ ...prev, pictureUrl: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            setFormData(prev => ({
                ...prev,
                tags: [...(prev.tags || []), tagInput.trim()]
            }));
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(t => t !== tagToRemove)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return alert("Name is required");
        if ((formData.roles || []).length === 0) return alert("Select at least one role");

        if (contactToEdit && formData.id) {
            // Update
            contactService.updateContact(formData as Contact);
            alert("Contact Updated!");
        } else {
            // Create
            contactService.createContact(formData);
            alert("Contact Created!");
        }
        
        onSave();
        handleCancel();
    };

    const handleCancel = () => {
        setFormData(initialFormState);
        onCancelEdit();
    };

    const ROLES: { id: ContactRole, label: string }[] = [
        { id: 'customer', label: t('contacts.role.customer') },
        { id: 'supplier', label: t('contacts.role.supplier') },
        { id: 'technician', label: t('contacts.role.technician') },
        { id: 'employee', label: t('contacts.role.employee') },
        { id: 'partner', label: t('contacts.role.partner') },
        { id: 'lead', label: t('contacts.role.lead') },
    ];

    
    const isCompany = formData.type === 'company';

    const WILAYAS = [
        { code: "1", name: "Adrar" }, { code: "2", name: "Chlef" }, { code: "3", name: "Laghouat" }, { code: "4", name: "Oum El Bouaghi" },
        { code: "5", name: "Batna" }, { code: "6", name: "Béjaïa" }, { code: "7", name: "Biskra" }, { code: "8", name: "Béchar" },
        { code: "9", name: "Blida" }, { code: "10", name: "Bouira" }, { code: "11", name: "Tamanrasset" }, { code: "12", name: "Tébessa" },
        { code: "13", name: "Tlemcen" }, { code: "14", name: "Tiaret" }, { code: "15", name: "Tizi Ouzou" }, { code: "16", name: "Alger" },
        { code: "17", name: "Djelfa" }, { code: "18", name: "Jijel" }, { code: "19", name: "Sétif" }, { code: "20", name: "Saïda" },
        { code: "21", name: "Skikda" }, { code: "22", name: "Sidi Bel Abbès" }, { code: "23", name: "Annaba" }, { code: "24", name: "Guelma" },
        { code: "25", name: "Constantine" }, { code: "26", name: "Médéa" }, { code: "27", name: "Mostaganem" }, { code: "28", name: "M'Sila" },
        { code: "29", name: "Mascara" }, { code: "30", name: "Ouargla" }, { code: "31", name: "Oran" }, { code: "32", name: "El Bayadh" },
        { code: "33", name: "Illizi" }, { code: "34", name: "Bordj Bou Arréridj" }, { code: "35", name: "Boumerdès" }, { code: "36", name: "El Tarf" },
        { code: "37", name: "Tindouf" }, { code: "38", name: "Tissemsilt" }, { code: "39", name: "El Oued" }, { code: "40", name: "Khenchela" },
        { code: "41", name: "Souk Ahras" }, { code: "42", name: "Tipaza" }, { code: "43", name: "Mila" }, { code: "44", name: "Aïn Defla" },
        { code: "45", name: "Naâma" }, { code: "46", name: "Aïn Témouchent" }, { code: "47", name: "Ghardaïa" }, { code: "48", name: "Relizane" },
        { code: "49", name: "Timimoun" }, { code: "50", name: "Bordj Badji Mokhtar" }, { code: "51", name: "Ouled Djellal" }, { code: "52", name: "Béni Abbès" },
        { code: "53", name: "In Salah" }, { code: "54", name: "In Guezzam" }, { code: "55", name: "Touggourt" }, { code: "56", name: "Djanet" },
        { code: "57", name: "El M'Ghair" }, { code: "58", name: "El Meniaa" }
    ];

    const activeWilayaCode = formData.zrWilayaId || '';
    const wilayaData = (communesData as any)[activeWilayaCode];
    const availableCommunes: { id: string, name: string }[] = wilayaData ? wilayaData.communes : [];


    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-zinc-800 shadow-xl z-20 w-full hover:overflow-y-auto">
            <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-gray-900 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={contactToEdit ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"} /></svg>
                    {contactToEdit ? 'Edit Contact' : t('contacts.add_new')}
                </h2>
                {contactToEdit && (
                    <button onClick={handleCancel} className="text-slate-500 hover:text-red-500 text-sm font-medium">
                        {t('common.cancel')}
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
                
                {/* Type Selection & Picture */}
                <div className="flex gap-4 items-start">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer hover:opacity-80 transition border-2 border-dashed border-slate-300 dark:border-gray-600 overflow-hidden"
                    >
                        {formData.pictureUrl ? (
                            <img src={formData.pictureUrl} alt="Contact" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center">
                                <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-[9px] text-slate-500 uppercase">Photo</span>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
                        <div className="flex bg-slate-100 dark:bg-gray-700 rounded p-1">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'individual'})}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${formData.type === 'individual' ? 'bg-white dark:bg-gray-600 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}
                            >
                                Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, type: 'company'})}
                                className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${formData.type === 'company' ? 'bg-white dark:bg-gray-600 shadow text-slate-800 dark:text-white' : 'text-slate-500'}`}
                            >
                                Company
                            </button>
                        </div>
                    </div>
                </div>

                {/* Roles */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('contacts.roles_label')}</label>
                    <div className="flex flex-wrap gap-2">
                        {ROLES.map(role => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => toggleRole(role.id)}
                                className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                                    (formData.roles || []).includes(role.id)
                                    ? 'bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'bg-white dark:bg-gray-700 border-slate-300 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50'
                                }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{isCompany ? 'Company Name' : t('contacts.name')} *</label>
                        <input name="name" value={formData.name} onChange={handleChange} className="form-input w-full" placeholder={isCompany ? "Tech Solutions Inc." : "John Doe"} required />
                    </div>
                    
                    {!isCompany && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.company')}</label>
                            <input name="companyName" value={formData.companyName} onChange={handleChange} className="form-input w-full" placeholder="Workplace (Optional)" />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.phone')}</label>
                            <input name="phone" value={formData.phone} onChange={handleChange} className="form-input w-full" placeholder="555-0123" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.city')}</label>
                            <input name="city" value={formData.city} onChange={handleChange} className="form-input w-full" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.address')}</label>
                        <textarea name="address" value={formData.address} onChange={handleChange} className="form-input w-full" rows={2} placeholder="123 Main St" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.email')}</label>
                        <input name="email" value={formData.email} onChange={handleChange} className="form-input w-full" placeholder="email@example.com" />
                    </div>
                </div>

                {/* Professional Details (Company Only) */}
                {isCompany && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 space-y-3">
                        <h3 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase">Professional Details</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Legal Form</label>
                                <input name="legalForm" value={formData.legalForm} onChange={handleChange} className="form-input w-full text-sm" placeholder="SARL, SPA..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">RC Number</label>
                                <input name="rcNumber" value={formData.rcNumber} onChange={handleChange} className="form-input w-full text-sm" placeholder="16/00..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIF (Tax ID)</label>
                                <input name="nifNumber" value={formData.nifNumber} onChange={handleChange} className="form-input w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIS</label>
                                <input name="nisNumber" value={formData.nisNumber} onChange={handleChange} className="form-input w-full text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ART (AI)</label>
                                <input name="artNumber" value={formData.artNumber} onChange={handleChange} className="form-input w-full text-sm" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Financials */}
                <div className="p-3 bg-slate-50 dark:bg-gray-700/30 rounded-lg border border-slate-200 dark:border-gray-600 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">{t('expenses.financials')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">{t('contacts.payment_terms')}</label>
                            <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="form-select w-full">
                                <option>Cash</option>
                                <option>Immediate</option>
                                <option>Net 15</option>
                                <option>Net 30</option>
                                <option>Net 60</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">{t('contacts.credit_limit')} ({settings.currencySymbol})</label>
                            <input type="number" name="creditLimit" value={formData.creditLimit} onChange={handleChange} className="form-input w-full" />
                        </div>
                    </div>
                </div>

                
                {/* ZR Express Delivery Preferences */}
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 space-y-3">
                    <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Préférences ZR Express
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Wilaya</label>
                            <select 
                                name="zrWilayaId" 
                                value={formData.zrWilayaId || ''} 
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData(prev => ({ ...prev, zrWilayaId: value, zrCommuneId: '' }));
                                }} 
                                className="form-select w-full text-sm"
                            >
                                <option value="">---</option>
                                {WILAYAS.map(w => (
                                    <option key={w.code} value={w.code}>{w.code}. {w.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Commune</label>
                            <select 
                                name="zrCommuneId" 
                                value={formData.zrCommuneId || ''} 
                                onChange={handleChange} 
                                className="form-select w-full text-sm"
                            >
                                <option value="">---</option>
                                {availableCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Méthode de livraison</label>
                            <select name="zrDeliveryPreference" value={formData.zrDeliveryPreference || 'pickup-point'} onChange={handleChange} className="form-select w-full text-sm">
                                <option value="pickup-point">Stopdesk</option>
                                <option value="home">À domicile</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Créneau horaire</label>
                            <select name="zrTimeSlot" value={formData.zrTimeSlot || 'morning'} onChange={handleChange} className="form-select w-full text-sm">
                                <option value="morning">Matin</option>
                                <option value="afternoon">Après-midi</option>
                                <option value="evening">Soir</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instructions de livraison</label>
                        <input name="zrInstruction" value={formData.zrInstruction || ''} onChange={handleChange} className="form-input w-full text-sm" placeholder="Ex: Livraison à l'arrière..." />
                    </div>
                </div>

                {/* Tags & Notes */}

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.tags')}</label>
                    <input 
                        value={tagInput} 
                        onChange={(e) => setTagInput(e.target.value)} 
                        onKeyDown={handleAddTag} 
                        className="form-input w-full mb-2" 
                        placeholder="Type tag & Enter..." 
                    />
                    <div className="flex flex-wrap gap-1">
                        {formData.tags?.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-slate-200 dark:bg-gray-600 rounded text-xs flex items-center gap-1">
                                {tag}
                                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                            </span>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('contacts.notes')}</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} className="form-input w-full h-20 resize-none" />
                </div>

                <div className="flex gap-2 mt-4">
                    {contactToEdit && (
                        <button 
                            type="button" 
                            onClick={handleCancel}
                            className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-all"
                        >
                            {t('common.cancel')}
                        </button>
                    )}
                    <button type="submit" className="flex-[2] py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg shadow-lg hover:brightness-110 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        {contactToEdit ? 'Update' : t('contacts.save')}
                    </button>
                </div>
            </form>

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

export default ContactFormPanel;
