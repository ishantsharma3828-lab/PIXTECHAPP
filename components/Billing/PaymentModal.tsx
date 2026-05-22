
import React, { useState, useEffect, useContext, useRef } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { PaymentRecord, DebtDetails } from '../../constants/billingTypes';
import { getCurrentUser } from '../../services/authService';
import { api } from '../../services/zrApi';
import communesData from '../../data/communes.json';

interface PaymentModalProps {
    total: number;
    customerName?: string;
    customer?: any;
    cart?: any[];
    onConfirm: (payments: PaymentRecord[], debtDetails?: DebtDetails, deliveryDetails?: any) => void;
    onCancel: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'transfer' | 'debt' | 'facilite' | 'cod';

const PaymentModal: React.FC<PaymentModalProps> = ({ total, customerName, customer, cart, onConfirm, onCancel }) => {
    const { settings, t } = useContext(SettingsContext);
    const user = getCurrentUser();
    const isAdmin = user?.role === 'admin';

    // State
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [activeMethod, setActiveMethod] = useState<PaymentMethod>('cash');

    // Input State
    const [amountInput, setAmountInput] = useState<string>('');
    const [txnId, setTxnId] = useState('');
    const [bankName, setBankName] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

    // Debt State
    const [debtDueDate, setDebtDueDate] = useState('');
    const [debtPlan, setDebtPlan] = useState('');
    const [debtNote, setDebtNote] = useState('');

    // Facilité State
    const [installments, setInstallments] = useState<{ date: string, amount: number }[]>([]);
    const [installmentCount, setInstallmentCount] = useState(3);
    const [initialPayment, setInitialPayment] = useState(0);

    // Delivery State (for COD)
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');

    // --- ZR Express COD Data ---
    const [zrFormData, setZrFormData] = useState<any>({
        deliveryType: 'pickup-point',
        wilaya: '16',
        commune: '',
        hubId: '',
        street: '',
        instruction: '',
        timeSlot: 'morning'
    });
    const [zrLoading, setZrLoading] = useState(false);
    const [zrError, setZrError] = useState<string | null>(null);
    const [allHubs, setAllHubs] = useState<any[]>([]);
    const [allRates, setAllRates] = useState<any[]>([]);
    const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

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

    const activeWilayaCode = zrFormData.wilaya || '16';
    const activeWilayaName = WILAYAS.find(w => w.code === activeWilayaCode)?.name || '';
    const wilayaData = (communesData as any)[activeWilayaCode];
    const availableCommunes: { id: string, name: string }[] = wilayaData ? wilayaData.communes : [];

    // Fetch ZR Data
    useEffect(() => {
        const fetchAllHubs = async () => {
            try {
                let allFetchedHubs: any[] = [];
                let pageIndex = 0;
                let hasMore = true;
                while (hasMore) {
                    const res: any = await api.post('/hubs/search', { pageIndex, pageSize: 200 });
                    if (res.items && res.items.length > 0) {
                        allFetchedHubs = [...allFetchedHubs, ...res.items];
                        if (res.items.length < 200) hasMore = false;
                        else pageIndex++;
                    } else hasMore = false;
                }
                setAllHubs(allFetchedHubs);
            } catch (err) { console.error("Error fetching hubs:", err); }
        };
        const fetchRates = async () => {
            try {
                const res: any = await api.get('/delivery-pricing/rates');
                setAllRates(res.rates || res.items || []);
            } catch (err) { console.error("Error fetching rates:", err); }
        };
        fetchAllHubs();
        fetchRates();
    }, []);

    // Auto-fill from selected customer
    useEffect(() => {
        if (customer) {
            setZrFormData((prev: any) => ({
                ...prev,
                wilaya: customer.zrWilayaId || '16',
                commune: customer.zrCommuneId || '',
                deliveryType: customer.zrDeliveryPreference || 'pickup-point',
                timeSlot: customer.zrTimeSlot || 'morning',
                instruction: customer.zrInstruction || '',
                street: customer.address || ''
            }));
        }
    }, [customer]);

    // Handle dynamic pricing calculation
    useEffect(() => {
        const normalizeString = (str: string) => {
            if (!str) return '';
            let normalized = str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalized === 'elmeghaier') return 'elmghair';
            if (normalized === 'elmenia') return 'elmeniaa';
            return normalized;
        };
        const activeNormalized = normalizeString(activeWilayaName);
        const currentType = zrFormData.deliveryType || 'pickup-point';
        let targetTerritoryId = null;

        if (currentType === 'home' && activeWilayaName) {
            const matchingRate = allRates.find(r => normalizeString(r.toTerritoryName) === activeNormalized);
            if (matchingRate) targetTerritoryId = matchingRate.toTerritoryId;
        } else if (currentType === 'pickup-point' && zrFormData.hubId) {
            const selectedHub = allHubs.find(h => h.id === zrFormData.hubId);
            targetTerritoryId = selectedHub?.address?.cityTerritoryId || selectedHub?.address?.communeTerritoryId || selectedHub?.address?.stateTerritoryId;
        }

        if (targetTerritoryId) {
            const rateObj = allRates.find(r => r.toTerritoryId === targetTerritoryId);
            if (rateObj && rateObj.deliveryPrices) {
                const currentPriceRule = rateObj.deliveryPrices.find((p: any) => p.deliveryType === (currentType === 'pickup-point' ? 'pickup-point' : 'home'));
                if (currentPriceRule) {
                    setCalculatedPrice(currentPriceRule.price);
                    return;
                }
            }
        }
        setCalculatedPrice(0);
    }, [zrFormData.deliveryType, zrFormData.wilaya, zrFormData.hubId, allRates, allHubs, activeWilayaName]);

    // Helper for normalizing hubs view
    const filteredHubs = allHubs.filter(h => {
        const normalizeString = (str: string) => {
            if (!str) return '';
            let normalized = str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalized === 'elmeghaier') return 'elmghair';
            if (normalized === 'elmenia') return 'elmeniaa';
            return normalized;
        };
        const terrName = h.address?.cityTerritory?.name;
        const cityName = h.address?.city;
        const activeNormalized = normalizeString(activeWilayaName);
        return normalizeString(terrName) === activeNormalized || normalizeString(cityName) === activeNormalized;
    });



    const amountInputRef = useRef<HTMLInputElement>(null);

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    // Calculate Totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = Math.max(0, total - totalPaid);
    const change = Math.max(0, totalPaid - total);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only trigger if not typing in a text input or textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                // But allow Enter in amount input to finalize or add
                if (e.key === 'Enter') {
                    // Let the native handler deal with it if needed, but we can also trigger finalize
                    if (remaining <= 0.01) {
                        handleFinalize();
                    }
                }
                return;
            }

            if (e.key === '1') setActiveMethod('cash');
            if (e.key === '2') setActiveMethod('card');
            if (e.key === '3') setActiveMethod('transfer');
            if (e.key === '4' && isAdmin) setActiveMethod('debt');

            if (e.key === 'Enter') {
                handleFinalize();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [remaining, activeMethod, isAdmin]);

    // Auto-fill amount input with remaining balance when switching methods
    useEffect(() => {
        if (remaining > 0 && activeMethod !== 'debt') {
            setAmountInput(remaining.toString());
        } else {
            setAmountInput('');
        }
        // Focus input
        setTimeout(() => amountInputRef.current?.focus(), 100);
    }, [activeMethod]); // Total and payments.length are reflected via remaining

    const handleAddPayment = () => {
        const val = parseFloat(amountInput);
        if (!val || val <= 0) return;

        const newPayment: PaymentRecord = {
            id: `pay_${Date.now()}`,
            method: activeMethod,
            amount: val,
            timestamp: new Date().toISOString(),
            transactionId: txnId,
            bankName: bankName,
            receiptName: receiptFile?.name,
            // In a real app, upload file here and get URL. 
            // For demo, we store a fake local reference or base64 if needed.
            receiptFile: receiptFile ? URL.createObjectURL(receiptFile) : null
        };

        setPayments([...payments, newPayment]);

        // Reset Inputs
        setAmountInput('');
        setTxnId('');
        setBankName('');
        setReceiptFile(null);

        // If fully paid, standard behavior is done, but user clicks confirm manually
    };

    const handleRemovePayment = (id: string) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleQuickCash = (amt: number) => {
        setAmountInput(amt.toString());
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleFinalize = async () => {
        // 1. Debt Logic (Admin Only)
        if (activeMethod === 'debt') {
            if (remaining <= 0) return alert("No remaining balance to record as debt.");
            if (!debtDueDate) return alert("Please select a due date for the debt.");
            const debtDetails: DebtDetails = { isDebt: true, totalDebtAmount: remaining, dueDate: debtDueDate, installmentPlan: debtPlan, notes: debtNote, advancePayment: totalPaid };
            onConfirm(payments, debtDetails);
            return;
        }

        // 2. Facilité Logic
        if (activeMethod === 'facilite') {
            if (remaining <= 0) return alert("No remaining balance for installments.");
            const debtDetails: DebtDetails & { installments: any[] } = {
                isDebt: true, totalDebtAmount: remaining, dueDate: installments.length > 0 ? installments[installments.length - 1].date : '', installmentPlan: `${installmentCount} Installments`,
                notes: 'Facilité Payment Plan', advancePayment: totalPaid, installments: installments.map((inst, idx) => ({ id: `inst_${Date.now()}_${idx}`, dueDate: inst.date, amount: inst.amount, isPaid: false }))
            };
            onConfirm(payments, debtDetails);
            return;
        }

        // 3. COD Logic (ZR Express Parcel Creation)
        if (activeMethod === 'cod') {
            if (!customer) {
                alert("Un client doit être sélectionné pour la livraison COD ZR Express.");
                return;
            }
            if (zrFormData.deliveryType === 'home' && !zrFormData.commune) {
                alert("Veuillez sélectionner une commune pour la livraison à domicile.");
                return;
            }
            if (zrFormData.deliveryType === 'pickup-point' && (!zrFormData.hubId && filteredHubs.length === 0)) {
                alert("Veuillez sélectionner un bureau Stopdesk.");
                return;
            }

            setZrLoading(true);
            setZrError(null);

            try {
                // Formatting phone: ZR Express requires a valid international phone number (e.g. +213...)
                let phoneStr = customer.phone || '0550000000'; // fallback to valid length dummy
                let clean = phoneStr.replace(/[^0-9]/g, '');
                if (clean.startsWith('00213')) clean = clean.substring(5);
                else if (clean.startsWith('213')) clean = clean.substring(3);
                else if (clean.startsWith('0')) clean = clean.substring(1);

                // Final format: +213 X XX XX XX XX
                let finalPhone = `+213${clean}`;
                // Fallback for drastically invalid numbers to prevent hard API block
                if (finalPhone.length < 10) finalPhone = '+213550000000';

                // API enforces Amount must be less or equal to 150000
                const zrAmount = Math.min(Number(total), 150000);

                // Fetch or Create Customer in ZR Express System
                let zrCustomerId = null;
                try {
                    const searchCust: any = await api.post('/customers/search', { pageIndex: 0, pageSize: 1, criteria: [{ property: "phone", value: finalPhone }] });
                    if (searchCust.items && searchCust.items.length > 0) {
                        zrCustomerId = searchCust.items[0].id;
                    } else {
                        const custRes: any = await api.post('/customers/individual', {
                            name: customer?.name || 'Client Passager',
                            phone: { number1: finalPhone },
                            timeSlot: "morning",
                            deliveryPreference: zrFormData.deliveryType || 'pickup-point',
                            addresses: []
                        });
                        zrCustomerId = custRes.id;
                    }
                } catch (e) {
                    console.error("Failed to fetch/create ZR customer", e);
                    // Fallback to a dummy if absolutely necessary, but API likely rejects it
                    zrCustomerId = customer?.id || `TEMP-${Date.now()}`;
                }

                // The API needs a customer format and explicitly requires CustomerId to not be empty
                const payload = {
                    customer: {
                        customerId: zrCustomerId,
                        name: customer?.name || 'Client Passager',
                        phone: { number1: finalPhone }
                    },
                    deliveryAddress: zrFormData.deliveryType === 'home' ? {
                        cityTerritoryId: wilayaData ? wilayaData.id : undefined,
                        districtTerritoryId: zrFormData.commune || undefined,
                        street: zrFormData.street || ''
                    } : undefined,
                    hubId: zrFormData.hubId || filteredHubs[0]?.id || undefined,
                    orderedProducts: (cart || []).map(item => ({
                        productName: item.name,
                        stockType: 'none',
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice)
                    })),
                    amount: zrAmount, // The total expected value, capped
                    deliveryType: zrFormData.deliveryType || 'pickup-point',
                    description: zrFormData.instruction || 'Commande passée via POS'
                };

                const res: any = await api.post('/parcels', payload);

                const codPayment: PaymentRecord = {
                    id: `pay_${Date.now()}`,
                    method: 'cod',
                    amount: remaining,
                    timestamp: new Date().toISOString(),
                    note: `Pay on Delivery, Tracking: ${res.trackingNumber}`
                };

                const deliveryDetails = {
                    status: 'pending',
                    address: zrFormData.deliveryType === 'home' ? zrFormData.street : `Stopdesk (${filteredHubs.find(h => h.id === zrFormData.hubId)?.name || 'Bureau'})`,
                    zrExpressParcelId: res.id,
                    zrExpressTrackingNumber: res.trackingNumber,
                    cityTerritoryId: wilayaData ? wilayaData.id : undefined,
                    districtTerritoryId: zrFormData.commune || undefined,
                    phone: clean
                };

                onConfirm([...payments, codPayment], undefined, deliveryDetails);
            } catch (err: any) {
                let msg = err.message || 'Creation failed';
                if (err.response?.data?.errors) {
                    msg = err.response.data.errors.map((e: any) => e.description).join(' | ');
                }
                setZrError(msg);
                setZrLoading(false);
            }

            return;
        }

        // 4. Standard Logic
        if (remaining > 0.01) {
            alert("Insufficient payment. Please add more payments or use Debt (Admin).");
            return;
        }

        onConfirm(payments, undefined, undefined);
    };

    const isDeferred = ['debt', 'facilite', 'cod'].includes(activeMethod);

    return (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in sm:p-4">
            <div className="bg-slate-50 dark:bg-zinc-900 rounded-t-xl md:rounded-2xl shadow-2xl w-full h-[95dvh] max-h-[900px] md:w-[80vw] md:h-auto md:max-h-[85vh] max-w-5xl flex flex-col md:flex-row overflow-hidden border-t md:border border-slate-200 dark:border-zinc-800">

                {/* LEFT: Method Selector */}
                <div className="w-full md:w-1/4 bg-white dark:bg-zinc-950 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-200 dark:border-zinc-800 flex flex-col shrink-0">
                    <div className="p-3 md:p-6 border-b border-slate-200 dark:border-slate-200 dark:border-zinc-800 flex justify-between items-center md:block">
                        <div>
                            <h2 className="text-base md:text-xl font-extrabold text-slate-800 dark:text-white uppercase tracking-tighter">{t('billing.checkout')}</h2>
                            <p className="text-xs md:text-sm text-slate-500 mt-1">{t('billing.total_due')}: <span className="text-[var(--color-primary)] font-bold">{formatPrice(total)}</span></p>
                        </div>
                        <button onClick={onCancel} className="md:hidden p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-full">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <nav className="flex-1 overflow-x-auto md:overflow-y-auto p-2 md:p-4 flex flex-row md:flex-col gap-1.5 md:gap-2 scrollbar-hide border-b md:border-b-0 border-slate-200 dark:border-zinc-800 shrink-0 min-h-[60px] md:min-h-0">
                        <button
                            onClick={() => setActiveMethod('cash')}
                            className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full ${activeMethod === 'cash' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 md:ring-2 md:ring-green-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                        >
                            <div className="md:bg-green-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                            <div className="text-left font-bold text-xs md:text-base">
                                {t('billing.pay_cash')}
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveMethod('card')}
                            className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full ${activeMethod === 'card' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 md:ring-2 md:ring-blue-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                        >
                            <div className="md:bg-blue-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                            <div className="text-left font-bold text-xs md:text-base">
                                {t('billing.pay_card')}
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveMethod('transfer')}
                            className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full ${activeMethod === 'transfer' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 md:ring-2 md:ring-purple-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                        >
                            <div className="md:bg-purple-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div>
                            <div className="text-left font-bold text-xs md:text-base">
                                {t('billing.pay_transfer')}
                            </div>
                        </button>

                        {isAdmin && (
                            <>
                                <div className="hidden md:block border-t border-slate-200 dark:border-slate-200 dark:border-zinc-800 my-2"></div>
                                <button
                                    onClick={() => setActiveMethod('debt')}
                                    disabled={remaining <= 0}
                                    className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full disabled:opacity-50 disabled:cursor-not-allowed ${activeMethod === 'debt' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 md:ring-2 md:ring-orange-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                                >
                                    <div className="md:bg-orange-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                    <div className="text-left font-bold text-xs md:text-base">
                                        {t('billing.pay_debt')}
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveMethod('facilite')}
                                    disabled={remaining <= 0}
                                    className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full disabled:opacity-50 disabled:cursor-not-allowed ${activeMethod === 'facilite' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 md:ring-2 md:ring-teal-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                                >
                                    <div className="md:bg-teal-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg></div>
                                    <div className="text-left font-bold text-xs md:text-base">
                                        Facilité
                                    </div>
                                </button>
                            </>
                        )}

                        <div className="hidden md:block border-t border-slate-200 dark:border-slate-200 dark:border-zinc-800 my-2"></div>
                        <button
                            onClick={() => setActiveMethod('cod')}
                            disabled={remaining <= 0}
                            className={`px-3 py-1.5 md:p-4 rounded-full md:rounded-xl flex items-center gap-1.5 md:gap-3 transition-all whitespace-nowrap shrink-0 md:w-full disabled:opacity-50 disabled:cursor-not-allowed ${activeMethod === 'cod' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 md:ring-2 md:ring-indigo-500' : 'bg-slate-100 dark:bg-zinc-800 md:bg-transparent md:dark:bg-transparent hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400'}`}
                        >
                            <div className="md:bg-indigo-500 md:text-white rounded-lg p-0 md:p-2 text-current"><svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                            <div className="text-left font-bold text-xs md:text-base">
                                Pay on Delivery
                            </div>
                        </button>
                    </nav>

                    <div className="hidden md:block p-4 border-t border-slate-200 dark:border-slate-200 dark:border-zinc-800">
                        <button onClick={onCancel} className="w-full py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-gray-700">
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>

                {/* MIDDLE: Input Area */}
                <div className="w-full md:w-2/4 p-4 md:p-6 lg:p-8 flex flex-col bg-white dark:bg-gray-800 relative overflow-y-auto flex-1 min-h-[30dvh] md:min-h-0 border-b md:border-b-0 border-slate-200 dark:border-zinc-800 custom-scrollbar">

                    {activeMethod === 'debt' ? (
                        // DEBT CONFIGURATION VIEW
                        <div className="flex-1 flex flex-col animate-fade-in pb-4 md:pb-0">
                            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <h3 className="text-base md:text-lg font-bold text-orange-800 dark:text-orange-400 mb-1">{t('contacts.debt')} Agreement</h3>
                                <p className="text-xs md:text-sm text-orange-600 dark:text-orange-300">
                                    {t('billing.remaining')} <span className="font-bold">{formatPrice(remaining)}</span> for {customerName || 'Customer'}.
                                </p>
                            </div>

                            <div className="space-y-4 md:space-y-5">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 dark:text-gray-300 mb-1.5">{t('stock.expected_date')} *</label>
                                    <input
                                        type="date"
                                        value={debtDueDate}
                                        onChange={(e) => setDebtDueDate(e.target.value)}
                                        className="w-full p-2.5 md:p-3 text-sm md:text-base border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 dark:text-gray-300 mb-1.5">{t('contacts.payment_terms')}</label>
                                    <textarea
                                        value={debtPlan}
                                        onChange={(e) => setDebtPlan(e.target.value)}
                                        placeholder="Plan..."
                                        rows={2}
                                        className="w-full p-2.5 md:p-3 text-sm md:text-base border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 dark:text-gray-300 mb-1.5">{t('contacts.notes')}</label>
                                    <input
                                        type="text"
                                        value={debtNote}
                                        onChange={(e) => setDebtNote(e.target.value)}
                                        className="w-full p-2.5 md:p-3 text-sm md:text-base border border-slate-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                    ) : activeMethod === 'facilite' ? (
                        // FACILITE VIEW
                        <div className="flex-1 flex flex-col animate-fade-in pb-4 md:pb-0">
                            <div className="mb-4 md:mb-6 p-3 md:p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
                                <h3 className="text-base md:text-lg font-bold text-teal-800 dark:text-teal-400 mb-1">Payment Plan (Facilité)</h3>
                                <p className="text-xs md:text-sm text-teal-600 dark:text-teal-300">
                                    Total to Finance: <span className="font-bold">{formatPrice(remaining)}</span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs md:text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">Number of Installments</label>
                                    <div className="flex gap-1.5 md:gap-2 flex-wrap">
                                        {[2, 3, 4, 6, 12, 18, 24].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => {
                                                    setInstallmentCount(num);
                                                    // Generate default dates
                                                    const newInst = [];
                                                    const amountPerInst = remaining / num;
                                                    for (let i = 1; i <= num; i++) {
                                                        const d = new Date();
                                                        d.setMonth(d.getMonth() + i);
                                                        newInst.push({
                                                            date: d.toISOString().split('T')[0],
                                                            amount: Number(amountPerInst.toFixed(2))
                                                        });
                                                    }
                                                    setInstallments(newInst);
                                                }}
                                                className={`px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg font-bold transition-all text-[10px] md:text-xs ${installmentCount === num ? 'bg-teal-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200'}`}
                                            >
                                                {num}x
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {installments.length > 0 && (
                                    <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden max-h-48 md:max-h-60 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs md:text-sm text-left">
                                            <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-500 font-bold sticky top-0 shadow-sm">
                                                <tr>
                                                    <th className="p-2">#</th>
                                                    <th className="p-2">Due Date</th>
                                                    <th className="p-2">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {installments.map((inst, idx) => (
                                                    <tr key={idx} className="border-t border-slate-200 dark:border-zinc-800">
                                                        <td className="p-2 font-bold">{idx + 1}</td>
                                                        <td className="p-2">
                                                            <input
                                                                type="date"
                                                                value={inst.date}
                                                                onChange={(e) => {
                                                                    const newI = [...installments];
                                                                    newI[idx].date = e.target.value;
                                                                    setInstallments(newI);
                                                                }}
                                                                className="bg-transparent border-none focus:ring-0 w-full"
                                                            />
                                                        </td>
                                                        <td className="p-2 font-mono">
                                                            <input
                                                                type="number"
                                                                value={inst.amount}
                                                                onChange={(e) => {
                                                                    const newI = [...installments];
                                                                    newI[idx].amount = Number(e.target.value);
                                                                    setInstallments(newI);
                                                                }}
                                                                className="bg-slate-50 dark:bg-gray-800 border-b border-slate-300 w-24 focus:outline-none focus:border-teal-500"
                                                                step="0.01"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeMethod === 'cod' ? (
                        // COD VIEW
                        <div className="flex-1 flex flex-col animate-fade-in relative">
                            {zrLoading && (
                                <div className="absolute inset-0 bg-slate-50 dark:bg-zinc-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                                </div>
                            )}
                            <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-indigo-800 dark:text-indigo-400 mb-1 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        ZR Express COD
                                    </h3>
                                    <p className="text-sm text-indigo-600 dark:text-indigo-300">
                                        Creation automatique d'un colis ZR Express. Total à encaisser: <span className="font-bold">{formatPrice(total)}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Frais de livraison est.</span>
                                    <div className={`px-3 py-1 rounded inline-block font-bold text-sm ${calculatedPrice > 0 ? 'bg-green-500/10 text-green-400' : 'bg-slate-200 text-slate-500 dark:bg-gray-700'}`}>
                                        {calculatedPrice > 0 ? `${calculatedPrice} DA` : '---'}
                                    </div>
                                </div>
                            </div>

                            {zrError && (
                                <div className="mb-4 p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-sm font-bold">
                                    {zrError}
                                </div>
                            )}

                            {!customer ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    <h4 className="text-lg font-bold text-slate-700 dark:text-gray-300 mb-2">Client manquant</h4>
                                    <p className="text-sm text-slate-500 dark:text-gray-400">
                                        Vous devez sélectionner un client avant de pouvoir créer une commande ZR Express. Annulez ce paiement, sélectionnez un client, puis réessayez.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4 overflow-y-auto pr-2 pb-4 flex-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wilaya *</label>
                                            <select
                                                value={zrFormData.wilaya}
                                                onChange={(e) => setZrFormData((prev: any) => ({ ...prev, wilaya: e.target.value, commune: '', hubId: '' }))}
                                                className="w-full form-input bg-slate-50 text-sm"
                                            >
                                                {WILAYAS.map(w => <option key={w.code} value={w.code}>{w.code}. {w.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type de livraison *</label>
                                            <select
                                                value={zrFormData.deliveryType}
                                                onChange={(e) => setZrFormData((prev: any) => ({ ...prev, deliveryType: e.target.value, hubId: e.target.value === 'home' ? '' : prev.hubId }))}
                                                className="w-full form-input bg-slate-50 text-sm"
                                            >
                                                <option value="pickup-point">Stopdesk</option>
                                                <option value="home">À domicile</option>
                                            </select>
                                        </div>
                                    </div>

                                    {zrFormData.deliveryType !== 'home' ? (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bureau Stopdesk *</label>
                                            <select
                                                value={zrFormData.hubId}
                                                onChange={(e) => setZrFormData((prev: any) => ({ ...prev, hubId: e.target.value }))}
                                                className="w-full form-input bg-slate-50 text-sm"
                                            >
                                                <option value="">Sélectionner un bureau...</option>
                                                {filteredHubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Commune *</label>
                                                <select
                                                    value={zrFormData.commune}
                                                    onChange={(e) => setZrFormData((prev: any) => ({ ...prev, commune: e.target.value }))}
                                                    className="w-full form-input bg-slate-50 text-sm"
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    {availableCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rue (Optionnel)</label>
                                                <input
                                                    type="text"
                                                    value={zrFormData.street}
                                                    onChange={(e) => setZrFormData((prev: any) => ({ ...prev, street: e.target.value }))}
                                                    className="w-full form-input bg-slate-50 text-sm"
                                                    placeholder="Lieu de livraison..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Désignation / Instructions *</label>
                                        <textarea
                                            value={zrFormData.instruction}
                                            onChange={(e) => setZrFormData((prev: any) => ({ ...prev, instruction: e.target.value }))}
                                            className="w-full form-input bg-slate-50 text-sm"
                                            rows={2}
                                            placeholder="Ex: Appeler avant d'arriver..."
                                            required
                                        ></textarea>
                                    </div>

                                </div>
                            )}
                        </div>
                    ) : (
                        // PAYMENT ADDITION VIEW
                        <div className="flex-1 flex flex-col animate-fade-in flex-shrink min-h-0">
                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white mb-4 md:mb-6 capitalize">{t(`billing.pay_${activeMethod}` as any)}</h3>

                            <div className="mb-4 md:mb-6">
                                <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1.5">{t('billing.amount')}</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center text-slate-400 font-bold text-sm md:text-lg">{settings.currencySymbol}</span>
                                    <input
                                        ref={amountInputRef}
                                        type="number"
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                                        placeholder="0.00"
                                        className="w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2.5 md:py-4 text-base md:text-2xl font-bold border-2 border-slate-200 focus:border-slate-300 dark:border-zinc-700 rounded-xl bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none transition-colors"
                                        autoFocus
                                    />
                                </div>

                                {activeMethod === 'cash' && (
                                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 md:gap-2 mt-2">
                                        {[1, 5, 10, 20, 50, 100].map(amt => (
                                            <button
                                                key={amt}
                                                onClick={() => handleQuickCash(amt)}
                                                className="py-1.5 md:py-2 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs md:text-sm hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-100 font-bold transition-colors"
                                            >
                                                +{amt}
                                            </button>
                                        ))}
                                        <button onClick={() => setAmountInput(remaining.toString())} className="col-span-2 sm:col-span-1 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs md:text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                                            Exact
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Extended Fields for Non-Cash */}
                            {(activeMethod === 'card' || activeMethod === 'transfer') && (
                                <div className="space-y-4 p-4 bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('billing.txn_ref')}</label>
                                        <input
                                            type="text"
                                            value={txnId}
                                            onChange={e => setTxnId(e.target.value)}
                                            className="w-full p-2 border rounded bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                                            placeholder="Optional"
                                        />
                                    </div>
                                    {activeMethod === 'transfer' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank / App Name</label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={e => setBankName(e.target.value)}
                                                className="w-full p-2 border rounded bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white"
                                                placeholder="e.g. Chase, PayPal"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('expenses.receipt')}</label>
                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-sm flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                {t('expenses.click_upload')}
                                                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                            </label>
                                            <span className="text-xs text-slate-500 truncate max-w-[150px]">{receiptFile ? receiptFile.name : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 md:mt-auto shrink-0 z-10 pt-2 pb-4 md:pb-0">
                                <button
                                    onClick={handleAddPayment}
                                    disabled={!amountInput || parseFloat(amountInput) <= 0}
                                    className="w-full py-2.5 md:py-4 bg-blue-600 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all text-sm md:text-base border border-blue-700 shadow-sm"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    {t('common.add')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Payment Stack & Summary */}
                <div className="w-full md:w-1/4 bg-slate-50 dark:bg-gray-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-200 dark:border-zinc-800 flex flex-col shrink-0">
                    <div className="hidden md:block p-4 border-b border-slate-200 dark:border-slate-200 dark:border-zinc-800 bg-white dark:bg-gray-800">
                        <h3 className="font-bold text-slate-800 dark:text-white">{t('billing.amount_paid')}</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 max-h-[25vh] md:max-h-none custom-scrollbar">
                        {payments.length === 0 ? (
                            <div className="text-center text-slate-400 dark:text-zinc-500 py-6 text-xs md:text-sm italic">
                                ...
                            </div>
                        ) : (
                            payments.map(p => (
                                <div key={p.id} className="p-2.5 md:p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 flex justify-between items-center group">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-xs md:text-sm">
                                            <span className="capitalize">{t(`billing.pay_${p.method}` as any)}</span>
                                            {p.receiptName && <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatPrice(p.amount)}
                                            {p.transactionId && <span className="block text-[10px] truncate max-w-[100px]">{p.transactionId}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemovePayment(p.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 md:p-6 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-slate-200 dark:border-zinc-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-6">
                        <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4 text-xs md:text-sm">
                            <div className="flex justify-between text-slate-600 dark:text-gray-400">
                                <span>{t('billing.total_due')}</span>
                                <span>{formatPrice(total)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-gray-400">
                                <span>{t('billing.amount_paid')}</span>
                                <span className="font-semibold text-green-600">{formatPrice(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm md:text-lg font-bold border-t pt-2 dark:border-slate-200 dark:border-zinc-800">
                                {remaining > 0 ? (
                                    <>
                                        <span className="text-slate-800 dark:text-white">{t('billing.remaining')}</span>
                                        <span className="text-red-500">{formatPrice(remaining)}</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-slate-800 dark:text-white">{t('billing.change')}</span>
                                        <span className="text-green-500">{formatPrice(change)}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleFinalize}
                            className={`w-full py-3 md:py-4 rounded-xl font-bold text-sm md:text-base shadow-lg flex items-center justify-center gap-2 transition-all
                        ${isDeferred
                                    ? (activeMethod === 'cod' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : activeMethod === 'facilite' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white')
                                    : (remaining <= 0.01
                                        ? 'bg-[var(--color-primary)] hover:brightness-110 text-white animate-pulse-slow'
                                        : 'bg-zinc-800 text-slate-600 dark:text-zinc-500 cursor-not-allowed')
                                }`}
                            disabled={!isDeferred && remaining > 0.01}
                        >
                            {activeMethod === 'debt' ? (
                                <>{t('billing.confirm_debt')} <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></>
                            ) : activeMethod === 'cod' ? (
                                <>{t('billing.confirm_cod')} <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></>
                            ) : activeMethod === 'facilite' ? (
                                <>Confirm Plan <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" /></svg></>
                            ) : (
                                <>{t('billing.complete_sale')} <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
            @keyframes pulse-slow {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            .animate-pulse-slow {
                animation: pulse-slow 2s infinite;
            }
        `}</style>
        </div>
    );
};

export default PaymentModal;
