import { useState, useEffect } from 'react';
import { api } from '../../services/zrApi';
import { UpdateStatusModal } from './Modals/UpdateStatusModal';
import { ManageProductsModal } from './Modals/ManageProductsModal';
import { EditCustomerModal } from './Modals/EditCustomerModal';
import { EditAddressModal } from './Modals/EditAddressModal';

interface OrderDetailsProps {
    order: any;
    onBack: () => void;
}

const TIMELINE_STEPS = [
    { label: 'COMMANDE REÇUE', statusKey: 'received', matches: ['commande reçue', 'commande_recue', 'received'] },
    { label: 'COMMANDE EN TRAITEMENT', statusKey: 'processing', matches: ['commande en traitement', 'en_traitement', 'processing', 'recupere_par_fournisseur'] },
    { label: 'APPEL DE CONFIRMATION', statusKey: 'verification_call', matches: ['appel de confirmation', 'appel_de_confirmation', 'verification call'] },
    { label: 'COMMANDE CONFIRMÉE', statusKey: 'confirmed', matches: ['commande confirmée', 'commande_confirmee', 'confirmed'] },
    { label: 'PRÊT À EXPÉDIER', statusKey: 'ready_to_ship', matches: ['prêt à expédier', 'pret_a_expedier', 'ready to ship'] },
    { label: 'CONFIRMÉE AU BUREAU', statusKey: 'confirmed_at_hub', matches: ['confirmée au bureau', 'confirmee_au_bureau', 'confirmed at hub'] },
    { label: 'DISPATCH DANS LA MÊME WILAYA', statusKey: 'dispatch_same_wilaya', matches: ['dispatch dans la même wilaya', 'dispatch_meme_wilaya', 'dispatch same wilaya'] },
    { label: 'DISPATCH DANS UNE AUTRE WILAYA', statusKey: 'dispatch_other_wilaya', matches: ['dispatch dans une autre wilaya', 'dispatch_autre_wilaya', 'dispatch other wilaya'] },
    { label: 'EN LIVRAISON', statusKey: 'delivering', matches: ['en livraison', 'en_livraison', 'delivering', 'out for delivery'] },
    { label: 'LIVRÉ', statusKey: 'delivered', matches: ['livré', 'livre', 'delivered'] },
    { label: 'ENCAISSÉ', statusKey: 'collected', matches: ['encaissé', 'encaisse', 'collected'] },
    { label: 'RECOUVERT', statusKey: 'covered', matches: ['recouvert', 'covered'] },
];

export const OrderDetails = ({ order, onBack }: OrderDetailsProps) => {
    const [isActionsOpen, setIsActionsOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Modals state
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (order?.id) {
            api.get(`/parcels/${order.id}/state-history`).then((res: any) => {
                if (isMounted) setHistory(res || []);
            }).catch(err => console.error("History Error:", err));
        }
        return () => { isMounted = false; };
    }, [order?.id]);


    // Provide safe defaults for the order
    const customerName = order?.customer?.name || order?.customerName || 'N/A';
    const trackingNumber = order?.trackingNumber || order?.tracking || 'N/A';
    const product = order?.orderedProducts?.[0]?.productName || order?.description || 'N/A';
    const situation = order?.situation || 'NA';

    // ZR Express API stores the status in order.state.name (e.g., 'commande_recue', 'recouvert')
    const rawStatus = order?.state?.name || order?.status?.name || order?.status || 'commande_recue';
    const status = String(rawStatus).toLowerCase();

    // Find a pretty label for the header (yellow pill) by mapping backwards
    const matchedStep = TIMELINE_STEPS.find(s => s.matches.includes(status));
    const statusDisplayLabel = matchedStep ? matchedStep.label : (order?.state?.description || rawStatus);


    // Address extraction
    let destination = 'N/A';
    if (order?.deliveryAddress?.city) {
        destination = `${order.deliveryAddress.city}, ${order.deliveryAddress.state || ''}`;
    } else if (order?.city) {
        destination = order.city;
    }

    const deliveryType = order?.deliveryType === 'home' ? 'À domicile' : 'Stopdesk';

    const handlePrint = async (format: 'A4' | 'A6') => {
        if (!trackingNumber || trackingNumber === 'N/A') return alert("Numéro de suivi invalide.");
        setIsPrinting(true);
        try {
            const result: any = await api.post('/parcels/labels/individual/pdf', {
                trackingNumbers: [trackingNumber],
                format: format
            });
            // If the API returns a base64 string or binary in some wrapper
            if (result && result.parcelLabelFiles && result.parcelLabelFiles.length > 0 && result.parcelLabelFiles[0].fileUrl) {
                window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
            } else if (result && result.base64) {
                const link = document.createElement('a');
                link.href = `data:application/pdf;base64,${result.base64}`;
                link.download = `label_${trackingNumber}_${format}.pdf`;
                link.click();
            } else if (result && result.url) {
                window.open(result.url, '_blank');
            } else {
                alert("Erreur: Le format de réponse API pour l'impression n'est pas pris en charge.");
                console.log("Print API Result:", result);
            }
        } catch (e: any) {
            console.error("Print Error:", e);
            alert("Erreur lors de l'impression: " + (e.message || "Unknown error"));
        } finally {
            setIsPrinting(false);
            setIsActionsOpen(false);
        }
    };

    return (
        <div className="order-details-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Order Header / Summary */}
            <div className="glass card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                        width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-color)', fontSize: '20px'
                    }}
                >
                    ←
                </button>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nom du client</span>
                    <strong style={{ fontSize: '18px' }}>{customerName}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Numéro de suivi</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }}></div>
                        <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trackingNumber}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Produit</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>{product}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Situation</span>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>{situation}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Statut de la commande</span>
                    <span style={{ background: '#FACC15', color: '#854D0E', fontWeight: 'bold', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                        {statusDisplayLabel}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,200,0,0.1)', color: '#FCD34D', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FCD34D' }}></div>
                        {destination}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type de livraison</span>
                    <span style={{ background: '#FACC15', color: '#854D0E', fontWeight: 'bold', padding: '4px 12px', borderRadius: '16px', fontSize: '13px' }}>
                        {deliveryType}
                    </span>
                </div>

                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    <button
                        onClick={() => setIsActionsOpen(!isActionsOpen)}
                        style={{
                            background: 'transparent', border: '1px solid #FACC15', color: '#FACC15',
                            padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        Actions <span>▼</span>
                    </button>

                    {isActionsOpen && (
                        <div style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                            background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '240px', zIndex: 100,
                            padding: '8px 0', display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Imprimer les bordereaux</div>
                            <div style={{ display: 'flex', gap: '8px', padding: '0 16px 8px 16px' }}>
                                <button onClick={() => handlePrint('A4')} disabled={isPrinting} style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: isPrinting ? 'not-allowed' : 'pointer', opacity: isPrinting ? 0.5 : 1 }}>A4 / Standard</button>
                                <button onClick={() => handlePrint('A6')} disabled={isPrinting} style={{ flex: 1, padding: '6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: isPrinting ? 'not-allowed' : 'pointer', opacity: isPrinting ? 0.5 : 1 }}>A6 / Thermique</button>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                            <button className="action-item" onClick={() => { setIsActionsOpen(false); setIsStatusModalOpen(true); }}>📝 Mettre à jour le statut</button>
                            <button className="action-item" onClick={() => { setIsActionsOpen(false); setIsProductsModalOpen(true); }}>📦 Gérer les produits</button>
                            <button className="action-item" onClick={() => { setIsActionsOpen(false); setIsCustomerModalOpen(true); }}>👤 Modifier les informations du client</button>
                            <button className="action-item" onClick={() => { setIsActionsOpen(false); setIsAddressModalOpen(true); }}>📍 Modifier l'adresse de livraison</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Card */}
            <div className="glass card" style={{ padding: '30px', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minWidth: '1000px', position: 'relative' }}>
                    {/* Background Line */}
                    <div style={{ position: 'absolute', top: '24px', left: '20px', right: '20px', height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }}></div>

                    {/* Active Line */}
                    <div style={{
                        position: 'absolute', top: '24px', left: '20px',
                        width: `${Math.max(0, (TIMELINE_STEPS.findIndex(s => s.matches.includes(status)) / (TIMELINE_STEPS.length - 1)) * 100)}%`,
                        height: '4px', background: '#FACC15', zIndex: 1,
                        transition: 'width 0.5s ease-in-out'
                    }}></div>

                    {TIMELINE_STEPS.map((step, idx) => {
                        const currentStepIdx = TIMELINE_STEPS.findIndex(s => s.matches.includes(status));
                        const isActive = idx === currentStepIdx;

                        const isPast = idx < currentStepIdx || (currentStepIdx === -1 && idx === 0); // Default first if unrecognized
                        const isHighlight = isActive || isPast;

                        // Find the real timestamp from ZR Express API
                        const stepHistory = history.find(h => step.matches.includes(h.newState?.name?.toLowerCase()));
                        const stepDate = stepHistory?.createdAt ? new Date(stepHistory.createdAt).toLocaleDateString('fr-FR') : null;

                        return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: '80px' }}>
                                <div style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    background: isHighlight ? '#FACC15' : 'rgba(255,255,255,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: isActive ? '4px solid rgba(250, 204, 21, 0.3)' : '4px solid var(--card-bg)',
                                    marginBottom: '12px',
                                    marginTop: '8px'
                                }}>
                                    {isHighlight && <span style={{ color: '#854D0E', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                </div>
                                <span style={{ fontSize: '9px', textAlign: 'center', fontWeight: 'bold', color: isHighlight ? 'var(--text-color)' : 'var(--text-muted)' }}>
                                    {step.label}
                                </span>
                                {stepDate && <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{stepDate}</span>}
                                {!stepDate && isHighlight && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>--/--/----</span>}
                            </div>
                        )
                    })}
                </div>
            </div>

            <style>{`
                .action-item {
                    background: transparent;
                    border: none;
                    color: var(--text-color);
                    text-align: left;
                    padding: 10px 16px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                }
                .action-item:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>

            {/* Modals */}
            <UpdateStatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} order={order} onSuccess={onBack} />
            <ManageProductsModal isOpen={isProductsModalOpen} onClose={() => setIsProductsModalOpen(false)} order={order} onSuccess={onBack} />
            <EditCustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} order={order} onSuccess={onBack} />
            <EditAddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} order={order} onSuccess={onBack} />
        </div>
    );
};
