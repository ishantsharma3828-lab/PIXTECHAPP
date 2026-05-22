import React, { useState, useEffect } from 'react';
import { api } from '../../services/zrApi';
import communesData from '../../data/communes.json';

interface CreateModalProps {
    moduleName: 'Customers' | 'Orders';
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateModal = ({ moduleName, onClose, onSuccess }: CreateModalProps) => {
    const [formData, setFormData] = useState<any>({ deliveryType: 'pickup-point', wilaya: '16' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [allHubs, setAllHubs] = useState<any[]>([]);
    const [allRates, setAllRates] = useState<any[]>([]);
    const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

    const type = moduleName === 'Orders' ? 'order' : 'customer';

    const activeWilayaCode = formData.wilaya || '';
    const wilayaData = (communesData as any)[activeWilayaCode];
    const availableCommunes: { id: string, name: string }[] = wilayaData ? wilayaData.communes : [];

    // Algerian Wilayas
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

    useEffect(() => {
        if (type === 'order') {
            const fetchAllHubs = async () => {
                let allFetchedHubs: any[] = [];
                let pageIndex = 0;
                let hasMore = true;

                while (hasMore) {
                    try {
                        const res: any = await api.post('/hubs/search', { pageIndex, pageSize: 200 });
                        if (res.items && res.items.length > 0) {
                            allFetchedHubs = [...allFetchedHubs, ...res.items];
                            if (res.items.length < 200) {
                                hasMore = false; // Last page reached
                            } else {
                                pageIndex++;
                            }
                        } else {
                            hasMore = false;
                        }
                    } catch (err) {
                        console.error("Error fetching hubs page:", err);
                        hasMore = false;
                    }
                }
                setAllHubs(allFetchedHubs);
            };

            const fetchRates = async () => {
                try {
                    const res: any = await api.get('/delivery-pricing/rates');
                    if (res && res.rates) {
                        setAllRates(res.rates);
                    } else if (res && res.items) {
                        setAllRates(res.items); // Fallback
                    }
                } catch (err) {
                    console.error("Error fetching rates:", err);
                }
            };

            fetchAllHubs();
            fetchRates();
        }
    }, [type]);

    const activeWilayaName = WILAYAS.find(w => w.code === formData.wilaya)?.name || '';
    const normalizeString = (str: string) => {
        if (!str) return '';
        let normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized === 'elmeghaier') return 'elmghair';
        if (normalized === 'elmenia') return 'elmeniaa';
        return normalized;
    };
    const activeNormalized = normalizeString(activeWilayaName);

    const filteredHubs = allHubs.filter(h => {
        const terrName = h.address?.cityTerritory?.name;
        const cityName = h.address?.city;
        return normalizeString(terrName) === activeNormalized || normalizeString(cityName) === activeNormalized;
    });

    // Handle dynamic pricing calculation
    useEffect(() => {
        if (type !== 'order') return;

        const currentType = formData.deliveryType || 'pickup-point';
        let targetTerritoryId = null;

        if (currentType === 'home' && activeWilayaName) {
            // For home delivery, find the Wilaya territory ID
            const matchingRate = allRates.find(r => normalizeString(r.toTerritoryName) === activeNormalized);
            if (matchingRate) targetTerritoryId = matchingRate.toTerritoryId;
        } else if (currentType === 'pickup-point' && formData.hubId) {
            // For Stopdesk, we extract the territoryId originating from the selected Hub
            const selectedHub = allHubs.find(h => h.id === formData.hubId);
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
        setCalculatedPrice(0); // reset if valid state not met
    }, [formData.deliveryType, formData.wilaya, formData.hubId, allRates, allHubs, type, activeWilayaName, activeNormalized]);

    const formatPhone = (phone: string) => {
        if (!phone) return phone;
        let clean = phone.replace(/[^0-9+]/g, '');
        if (clean.startsWith('+213')) return clean;
        if (clean.startsWith('00213')) return '+' + clean.substring(2);
        if (clean.startsWith('213')) return '+' + clean;
        if (clean.startsWith('0')) clean = clean.substring(1);
        return `+213${clean}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (type === 'customer') {
                const selectedCommuneId = formData.commune;
                const matchedCommune = availableCommunes.find(c => c.id === selectedCommuneId);
                const communeName = matchedCommune ? matchedCommune.name : '';

                const currWilaya = WILAYAS.find(w => w.code === formData.wilaya);
                const wilayaName = currWilaya ? currWilaya.name : 'Alger';
                const cityTerritoryId = wilayaData ? wilayaData.id : undefined;

                const payload = {
                    name: formData.name,
                    phone: { number1: formatPhone(formData.phone), number2: formData.phone2 ? formatPhone(formData.phone2) : undefined },
                    timeSlot: formData.timeSlot || 'morning',
                    instruction: formData.instruction || '',
                    deliveryPreference: formData.deliveryPreference || 'pickup-point',
                    addresses: [
                        {
                            street: formData.street || '',
                            city: wilayaName,
                            district: communeName || wilayaName,
                            country: 'algeria',
                            cityTerritoryId: cityTerritoryId,
                            districtTerritoryId: selectedCommuneId || undefined,
                            postalCode: formData.zipCode || undefined
                        }
                    ]
                };
                await api.post('/customers/individual', payload);
            } else if (type === 'order') {
                const phoneStr = formatPhone(formData.customerPhone);
                const phoneStr2 = formData.customerPhone2 ? formatPhone(formData.customerPhone2) : undefined;

                // 1. Resolve Customer UUID automatically
                let customerId = null;
                const searchCust: any = await api.post('/customers/search', { pageIndex: 0, pageSize: 1, criteria: [{ property: "phone", value: phoneStr }] });
                if (searchCust.items && searchCust.items.length > 0) {
                    customerId = searchCust.items[0].id;
                } else {
                    const custRes: any = await api.post('/customers/individual', {
                        name: formData.customerName,
                        phone: { number1: phoneStr, number2: phoneStr2 },
                        timeSlot: "morning",
                        deliveryPreference: formData.deliveryType || 'pickup-point',
                        addresses: []
                    });
                    customerId = custRes.id;
                }

                // 2. Map Territory UUID correctly
                let cityTerritoryId = wilayaData ? wilayaData.id : undefined;
                let districtTerritoryId = formData.city; // The select holds the ID now

                // 3. Complete strictly-validated Parcel payload
                const payload = {
                    customer: {
                        customerId: customerId,
                        name: formData.customerName,
                        phone: { number1: phoneStr, number2: phoneStr2 }
                    },
                    deliveryAddress: formData.deliveryType === 'home' ? {
                        cityTerritoryId: cityTerritoryId,
                        districtTerritoryId: districtTerritoryId,
                        street: formData.street || ''
                    } : undefined,
                    hubId: formData.hubId || filteredHubs[0]?.id || undefined,
                    orderedProducts: [
                        { productName: formData.productName, stockType: 'none', quantity: Number(formData.quantity || 1), unitPrice: Number(formData.amount) }
                    ],
                    amount: Number(formData.amount),
                    deliveryType: formData.deliveryType || 'pickup-point',
                    description: formData.description || 'Commande Standard'
                };
                await api.post('/parcels', payload);
            }
            onSuccess();
        } catch (err: any) {
            // Handle ZR Express validation format
            let msg = err.message || 'Creation failed';
            if (err.response?.data?.errors) {
                msg = err.response.data.errors.map((e: any) => e.description).join(' | ');
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="glass modal-content fade-in">
                <h2>Create New {type === 'customer' ? 'Customer' : 'Order'}</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="create-form">
                    {type === 'customer' && (
                        <>
                            <div className="form-group">
                                <label>Nom et prénom*</label>
                                <input type="text" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nom complet du client" />
                            </div>

                            <div className="form-section">
                                <h3>Informations de contact</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Téléphone 1*</label>
                                        <input type="text" required onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+213 XXX XX XX XX" />
                                    </div>
                                    <div className="form-group">
                                        <label>Téléphone 2</label>
                                        <input type="text" onChange={(e) => setFormData({ ...formData, phone2: e.target.value })} placeholder="+213 XXX XX XX XX" />
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Préférences de livraison</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Wilaya*</label>
                                        <select
                                            name="wilaya"
                                            value={formData.wilaya || ''}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setFormData((prev: any) => ({ ...prev, wilaya: value, commune: '', city: '' }));
                                            }}
                                            required
                                        >
                                            <option value="">Sélectionner une wilaya...</option>
                                            {WILAYAS.map(w => (
                                                <option key={w.code} value={w.code}>{w.code}. {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Commune*</label>
                                        <select
                                            name="commune"
                                            value={formData.commune || ''}
                                            onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                                            required
                                        >
                                            <option value="">Sélectionner une commune...</option>
                                            {availableCommunes.length > 0 ? (
                                                availableCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                            ) : (
                                                <option value="none">Aucune commune trouvée</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Rue</label>
                                        <input type="text" onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="Adresse de la rue" />
                                    </div>
                                    <div className="form-group">
                                        <label>Code postal</label>
                                        <input type="text" onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Méthode de livraison préférée</label>
                                        <select onChange={(e) => setFormData({ ...formData, deliveryPreference: e.target.value })}>
                                            <option value="pickup-point">Stopdesk</option>
                                            <option value="home">À domicile</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Créneaux horaires de livraison préférés</label>
                                        <select onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}>
                                            <option value="morning">Matin</option>
                                            <option value="afternoon">Après-midi</option>
                                            <option value="evening">Soir</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label>Instructions de livraison</label>
                                    <textarea rows={2} onChange={(e) => setFormData({ ...formData, instruction: e.target.value })} placeholder="Livraison à la maison..."></textarea>
                                </div>
                            </div>
                        </>
                    )}

                    {type === 'order' && (
                        <>
                            <div className="form-section">
                                <h3>Détails de la commande</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Type de commande*</label>
                                        <select onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}>
                                            <option value="simple">Commande simple</option>
                                            <option value="exchange">Échange</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Informations du client</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Nom du client*</label>
                                        <input type="text" required onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} placeholder="Nom et prénom" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Numéro de téléphone*</label>
                                        <input type="text" required onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="+213 XXX XX XX XX" />
                                    </div>
                                    <div className="form-group">
                                        <label>Numéro de téléphone secondaire</label>
                                        <input type="text" onChange={(e) => setFormData({ ...formData, customerPhone2: e.target.value })} placeholder="+213 XXX XX XX XX" />
                                    </div>
                                </div>

                                <h4 style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '16px', marginBottom: '8px', textTransform: 'uppercase' }}>Destination du colis</h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Wilaya*</label>
                                        <select
                                            name="wilaya"
                                            value={formData.wilaya || ''}
                                            onChange={(e) => {
                                                const { value } = e.target;
                                                setFormData((prev: any) => ({ ...prev, wilaya: value, city: '', commune: '', hubId: '' }));
                                            }}
                                            required
                                        >
                                            <option value="">Sélectionner une wilaya...</option>
                                            {WILAYAS.map(w => (
                                                <option key={w.code} value={w.code}>{w.code}. {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Type de livraison*</label>
                                        <select
                                            name="deliveryType"
                                            value={formData.deliveryType || 'pickup-point'}
                                            onChange={(e) => {
                                                setFormData((prev: any) => ({ ...prev, deliveryType: e.target.value, hubId: e.target.value === 'home' ? '' : prev.hubId }));
                                            }}
                                            required
                                        >
                                            <option value="pickup-point">Stopdesk</option>
                                            <option value="home">À domicile</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.deliveryType !== 'home' && (
                                    <div className="form-row">
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                            <label>Bureau Stopdesk*</label>
                                            <select
                                                name="hubId"
                                                value={formData.hubId || ''}
                                                onChange={handleChange}
                                                required
                                                disabled={!formData.wilaya}
                                            >
                                                <option value="">Sélectionner un bureau...</option>
                                                {filteredHubs.map(h => (
                                                    <option key={h.id} value={h.id}>{h.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {formData.deliveryType === 'home' && (
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Commune*</label>
                                            {availableCommunes.length > 0 ? (
                                                <select name="city" required onChange={handleChange} value={formData.city || ''}>
                                                    <option value="">Sélectionner une commune...</option>
                                                    {availableCommunes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            ) : (
                                                <input type="text" name="city" required onChange={handleChange} value={formData.city || ''} placeholder="Saisir la commune..." />
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label>Rue</label>
                                            <input type="text" name="street" onChange={handleChange} placeholder="Adresse de la rue" />
                                        </div>
                                    </div>
                                )}

                                <div className="form-row" style={{ marginTop: '12px' }}>
                                    <div className="form-group">
                                        <label>Frais de livraison estimés</label>
                                        <div style={{
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '6px',
                                            fontSize: '15px',
                                            fontWeight: 'bold',
                                            color: calculatedPrice > 0 ? '#4CAF50' : 'rgba(255, 255, 255, 0.5)'
                                        }}>
                                            {calculatedPrice > 0 ? `${calculatedPrice} DA` : '---'}
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label>Plus (Description)*</label>
                                    <textarea
                                        name="description"
                                        required
                                        minLength={2}
                                        maxLength={250}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Description obligatoire (min 2 caractères)"
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h3>Liste des produits de la commande</h3>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Produit*</label>
                                        <input type="text" required onChange={(e) => setFormData({ ...formData, productName: e.target.value })} placeholder="Saisir le nom du produit" />
                                    </div>
                                    <div className="form-group" style={{ maxWidth: '100px' }}>
                                        <label>Quantité*</label>
                                        <input type="number" defaultValue={1} min={1} required onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ marginTop: '16px' }}>
                                    <div className="form-group">
                                        <label>Prix total de la commande* (DA)</label>
                                        <input type="number" step="0.01" max="150000" required onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="Ex: 5000" />
                                    </div>
                                    <div className="form-group">
                                        <label>Poids du colis (kg)</label>
                                        <input type="number" step="0.1" onChange={(e) => setFormData({ ...formData, weight: e.target.value })} placeholder="Ex: 1.5" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Submitting...' : `Create ${type === 'customer' ? 'Customer' : 'Order'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
