import React, { useState, useEffect } from 'react';
import { api } from '../../../services/zrApi';
import communesData from '../../../data/communes.json';

interface EditAddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

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

export const EditAddressModal = ({ isOpen, onClose, order, onSuccess }: EditAddressModalProps) => {
    const [deliveryType, setDeliveryType] = useState('pickup-point');
    const [wilaya, setWilaya] = useState('');
    const [commune, setCommune] = useState('');
    const [street, setStreet] = useState('');
    const [hubId, setHubId] = useState('');

    const [allHubs, setAllHubs] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (order && isOpen) {
            setDeliveryType(order.deliveryType || 'pickup-point');

            // Try to deduce Wilaya from current address or hub
            let startWilaya = '';
            if (order.deliveryType === 'home' && order.deliveryAddress?.city) {
                setCommune(order.deliveryAddress.districtTerritoryId || '');
                setStreet(order.deliveryAddress.street || '');
                // Reverse lookup wilaya from commune
                for (const [wCode, data] of Object.entries(communesData as any)) {
                    const wilayaData = data as { communes: { id: string, name: string }[] };
                    if (wilayaData.communes.find((c: any) => c.name === order.deliveryAddress.city || c.id === order.deliveryAddress.districtTerritoryId)) {
                        startWilaya = wCode;
                        break;
                    }
                }
            } else if (order.hubId) {
                setHubId(order.hubId);
                // The hub object comes with address.stateName sometimes, but we'll fetch hubs first
            }
            if (startWilaya) setWilaya(startWilaya);
            setError(null);
        }
    }, [order, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchAllHubs = async () => {
            let allFetchedHubs: any[] = [];
            let pageIndex = 0;
            let hasMore = true;
            while (hasMore) {
                try {
                    const res: any = await api.post('/hubs/search', { pageIndex, pageSize: 200 });
                    if (res.items && res.items.length > 0) {
                        allFetchedHubs = [...allFetchedHubs, ...res.items];
                        if (res.items.length < 200) hasMore = false;
                        else pageIndex++;
                    } else hasMore = false;
                } catch (err) {
                    hasMore = false;
                }
            }
            setAllHubs(allFetchedHubs);

            // If we have an existing hub but no wilaya set, deduce Wilaya from the hub's associated territory
            if (order?.hubId && !wilaya) {
                const existingHub = allFetchedHubs.find(h => h.id === order.hubId);
                if (existingHub?.address?.state) {
                    const matchedWilaya = WILAYAS.find(w => w.name.toLowerCase() === existingHub.address.state.toLowerCase());
                    if (matchedWilaya) setWilaya(matchedWilaya.code);
                }
            }
        };
        fetchAllHubs();
    }, [isOpen, order?.hubId]);

    if (!isOpen) return null;

    const wilayaData = (communesData as any)[wilaya];
    const availableCommunes: { id: string, name: string }[] = wilayaData ? wilayaData.communes : [];

    const normalizeString = (str: string) => {
        if (!str) return '';
        let normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized === 'elmeghaier') return 'elmghair';
        if (normalized === 'elmenia') return 'elmeniaa';
        return normalized;
    };

    const activeWilayaName = WILAYAS.find(w => w.code === wilaya)?.name || '';
    const activeNormalized = normalizeString(activeWilayaName);

    const filteredHubs = allHubs.filter(h => {
        const terrName = h.address?.cityTerritory?.name;
        const cityName = h.address?.city;
        return normalizeString(terrName) === activeNormalized || normalizeString(cityName) === activeNormalized;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            let cityTerritoryId = order.deliveryAddress?.cityTerritoryId;
            let districtTerritoryId = order.deliveryAddress?.districtTerritoryId;
            let cityName = order.deliveryAddress?.city;

            if (deliveryType === 'home') {
                cityTerritoryId = wilayaData ? wilayaData.id : undefined;
                districtTerritoryId = commune; // commune state holds the ID
                const matchedCommune = availableCommunes.find(c => c.id === commune);
                cityName = matchedCommune ? matchedCommune.name : '';
            }

            // Construct payload
            const updatedParcel = {
                ...order,
                deliveryType: deliveryType,
                deliveryAddress: deliveryType === 'home' ? {
                    cityTerritoryId: cityTerritoryId,
                    districtTerritoryId: districtTerritoryId,
                    street: street,
                    city: cityName
                } : null,
                hubId: deliveryType === 'pickup-point' ? (hubId || filteredHubs[0]?.id) : null
            };

            await api.put(`/parcels/${order.id}`, updatedParcel);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Edit Address Error:", err);
            setError(err.message || "Impossible de mettre à jour l'adresse.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="w-[95vw] sm:w-[500px]" style={{
                backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px',
                maxWidth: '90%', border: '1px solid var(--border-color)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📍</span> Modifier la destination
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>

                {error && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Type de livraison *</label>
                            <select
                                value={deliveryType}
                                onChange={(e) => {
                                    setDeliveryType(e.target.value);
                                    if (e.target.value === 'home') setHubId('');
                                }}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid var(--border-color)', background: '#0F172A',
                                    color: 'var(--text-color)', fontSize: '14px'
                                }}
                                required
                            >
                                <option value="pickup-point">Stopdesk (Point Relais)</option>
                                <option value="home">À domicile</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Wilaya *</label>
                            <select
                                value={wilaya}
                                onChange={(e) => {
                                    setWilaya(e.target.value);
                                    setCommune('');
                                    setHubId('');
                                }}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid var(--border-color)', background: '#0F172A',
                                    color: 'var(--text-color)', fontSize: '14px'
                                }}
                                required
                            >
                                <option value="">Sélectionner une wilaya...</option>
                                {WILAYAS.map(w => (
                                    <option key={w.code} value={w.code}>{w.code}. {w.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {deliveryType === 'home' && (
                        <>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Commune *</label>
                                <select
                                    value={commune}
                                    onChange={(e) => setCommune(e.target.value)}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '6px',
                                        border: '1px solid var(--border-color)', background: '#0F172A',
                                        color: 'var(--text-color)', fontSize: '14px'
                                    }}
                                    required
                                    disabled={!wilaya}
                                >
                                    <option value="">Sélectionner une commune...</option>
                                    {availableCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Rue</label>
                                <input
                                    type="text"
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    placeholder="Adresse complète"
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '6px',
                                        border: '1px solid var(--border-color)', background: '#0F172A',
                                        color: 'var(--text-color)', fontSize: '14px', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                        </>
                    )}

                    {deliveryType === 'pickup-point' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Bureau Stopdesk *</label>
                            <select
                                value={hubId}
                                onChange={(e) => setHubId(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid var(--border-color)', background: '#0F172A',
                                    color: 'var(--text-color)', fontSize: '14px'
                                }}
                                required
                                disabled={!wilaya}
                            >
                                <option value="">Sélectionner un bureau...</option>
                                {filteredHubs.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--border-color)',
                                background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer'
                            }}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 16px', borderRadius: '6px', border: 'none',
                                background: '#FACC15', color: '#854D0E', fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
