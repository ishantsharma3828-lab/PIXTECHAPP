import { useState } from 'react';
import { api } from '../../services/zrApi';
import { EditCustomerModal } from './Modals/EditCustomerModal';

interface CustomerDetailsProps {
    customer: any;
    onBack: () => void;
}

export const CustomerDetails = ({ customer: initialCustomer, onBack }: CustomerDetailsProps) => {
    const [customer, setCustomer] = useState(initialCustomer);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const refreshCustomer = async () => {
        try {
            const res = await api.get(`/customers/${customer.id}`);
            setCustomer(res);
        } catch (err) {
            console.error("Failed to refresh customer", err);
        }
    };

    const mainAddress = customer.addresses && customer.addresses.length > 0 ? customer.addresses[0] : null;

    // Default translations or values based on visual screenshots
    const getDeliveryPreference = (val: string) => {
        if (!val) return '--';
        if (val.toLowerCase() === 'pickup-point') return 'Stopdesk';
        if (val.toLowerCase() === 'home') return 'À domicile';
        return val;
    };

    const getTimeSlot = (val: string) => {
        if (!val) return '--';
        if (val.toLowerCase() === 'morning') return 'Matin (08:00 - 12:00)';
        if (val.toLowerCase() === 'afternoon') return 'Après-midi (13:00 - 17:00)';
        if (val.toLowerCase() === 'evening') return 'Soir (18:00 - 22:00)';
        return val;
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button
                    onClick={onBack}
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', cursor: 'pointer', color: 'var(--text-color)' }}
                >
                    ←
                </button>
                <h2 style={{ margin: 0 }}>{customer.name}</h2>
            </div>

            <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid var(--border-color)', marginBottom: '-8px' }}>
                <div style={{ paddingBottom: '12px', borderBottom: '2px solid #FACC15', color: 'var(--text-color)', fontWeight: 'bold' }}>Informations personnelles</div>
                <div style={{ paddingBottom: '12px', color: 'var(--text-muted)' }}>Historique des commandes</div>
                <div style={{ paddingBottom: '12px', color: 'var(--text-muted)' }}>Adresses de livraison</div>
            </div>

            <div className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>Détails du client</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Consultez les informations principales du client ainsi que ses adresses enregistrées.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            style={{ background: '#FACC15', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', color: '#854D0E' }}
                        >
                            ✏️
                        </button>
                        <button style={{ background: '#FACC15', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', color: '#854D0E' }}>
                            🗑️
                        </button>
                    </div>
                </div>

                <div>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px' }}>Général</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 16px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Nom du client</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{customer.name || '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Région de résidence</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{mainAddress?.city || '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Téléphone 1</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{customer.phone?.number1 || '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Téléphone 2</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{customer.phone?.number2 || '--'}</div>
                        </div>
                    </div>
                </div>

                <div style={{ paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px' }}>Adresse</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 16px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Adresse principale</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{mainAddress ? `${mainAddress.street}, ${mainAddress.city}` : '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Adresse secondaire</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>--</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Ville</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{mainAddress?.city || '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Code postal</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{mainAddress?.zipCode || '--'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Pays</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{mainAddress?.country || 'algeria'}</div>
                        </div>
                    </div>
                </div>

                <div style={{ paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px' }}>Préférences de livraison</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 16px' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Type de livraison</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>--</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Méthode de livraison</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{getDeliveryPreference(customer.deliveryPreference)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Créneaux horaires de livraison préférés</div>
                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{getTimeSlot(customer.timeSlot)}</div>
                        </div>
                    </div>
                </div>

            </div>

            <EditCustomerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                customer={customer}
                onSuccess={refreshCustomer}
            />
        </div>
    );
};
