import React, { useState, useEffect } from 'react';
import { api } from '../../../services/zrApi';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    order?: any;       // Used when opened from Order Details
    customer?: any;    // Used when opened from Customer Details
    onSuccess: () => void;
}

export const EditCustomerModal = ({ isOpen, onClose, order, customer, onSuccess }: EditCustomerModalProps) => {
    const [name, setName] = useState('');
    const [phone1, setPhone1] = useState('');
    const [phone2, setPhone2] = useState('');
    const [deliveryPreference, setDeliveryPreference] = useState('pickup-point');
    const [timeSlot, setTimeSlot] = useState('morning');
    const [instruction, setInstruction] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (customer) {
                setName(customer.name || '');
                setPhone1(customer.phone?.number1 || '');
                setPhone2(customer.phone?.number2 || '');
                setDeliveryPreference(customer.deliveryPreference || 'pickup-point');
                setTimeSlot(customer.timeSlot || 'morning');
                setInstruction(customer.instruction || '');
            } else if (order) {
                setName(order.customer?.name || order.customerName || '');
                setPhone1(order.customer?.phone?.number1 || '');
                setPhone2(order.customer?.phone?.number2 || '');
                // Orders don't store customer delivery preferences at the root customer object usually, 
                // but we map defaults
                setDeliveryPreference('pickup-point');
                setTimeSlot('morning');
                setInstruction('');
            }
            setError(null);
        }
    }, [order, customer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (customer) {
                // Editing a Master Customer Record
                const updatedCustomerPayload = {
                    ...customer, // Keep existing addresses, etc.
                    name,
                    phone: {
                        ...customer.phone,
                        number1: phone1,
                        number2: phone2
                    },
                    deliveryPreference,
                    timeSlot,
                    instruction
                };

                await api.put(`/customers/individual/${customer.id}`, updatedCustomerPayload);

            } else if (order) {
                // Editing a Customer embedded in an Order (Parcel)
                const updatedParcel = {
                    ...order,
                    customer: {
                        ...order.customer,
                        name: name,
                        phone: {
                            ...order.customer?.phone,
                            number1: phone1,
                            number2: phone2
                        }
                    }
                };

                await api.put(`/parcels/${order.id}`, updatedParcel);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Edit Customer Error:", err);
            setError(err.message || "Impossible de mettre à jour le client.");
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
            <div className="fade-in w-[95vw] sm:w-[600px]" style={{
                backgroundColor: 'white', padding: '0', borderRadius: '12px',
                maxWidth: '90%', border: '1px solid var(--border-color)',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', position: 'relative',
                color: '#1f2937' // Light theme text to match screenshot
            }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Modifier le client</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>

                {error && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 24px', fontSize: '13px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Name Section */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Nom et prénom*</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '4px',
                                    border: '1px solid #d1d5db', background: 'white',
                                    color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                }}
                                required
                            />
                        </div>

                        {/* Contact Info */}
                        <div>
                            <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 'bold' }}>Informations de contact</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Téléphone 1*</label>
                                    <input
                                        type="text"
                                        value={phone1}
                                        onChange={(e) => setPhone1(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '4px',
                                            border: '1px solid #d1d5db', background: 'white',
                                            color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                        }}
                                        required
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Téléphone 2</label>
                                    <input
                                        type="text"
                                        value={phone2}
                                        onChange={(e) => setPhone2(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '4px',
                                            border: '1px solid #d1d5db', background: 'white',
                                            color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Delivery Preferences */}
                        {customer && (
                            <div>
                                <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 'bold' }}>Préférences de livraison</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Méthode de livraison préférée</label>
                                        <select
                                            value={deliveryPreference}
                                            onChange={(e) => setDeliveryPreference(e.target.value)}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '4px',
                                                border: '1px solid #d1d5db', background: 'white',
                                                color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                            }}
                                        >
                                            <option value="pickup-point">Stopdesk</option>
                                            <option value="home">À domicile</option>
                                        </select>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Créneaux horaires de livraison préférés</label>
                                        <select
                                            value={timeSlot}
                                            onChange={(e) => setTimeSlot(e.target.value)}
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '4px',
                                                border: '1px solid #d1d5db', background: 'white',
                                                color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                            }}
                                        >
                                            <option value="morning">Matin</option>
                                            <option value="afternoon">Après-midi</option>
                                            <option value="evening">Soir</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <label style={{ position: 'absolute', top: '-8px', left: '12px', background: 'white', padding: '0 4px', fontSize: '12px', color: '#6b7280' }}>Instructions de livraison</label>
                                    <input
                                        type="text"
                                        value={instruction}
                                        onChange={(e) => setInstruction(e.target.value)}
                                        placeholder="Livraison à la maison"
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '4px',
                                            border: '1px solid #d1d5db', background: 'white',
                                            color: '#1f2937', fontSize: '14px', boxSizing: 'border-box', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                    <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px', borderRadius: '4px', border: 'none',
                                background: '#e5e7eb', color: '#374151', cursor: 'pointer', fontWeight: 'bold'
                            }}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 20px', borderRadius: '4px', border: 'none',
                                background: '#FACC15', color: '#854D0E', fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Modification...' : 'Modifier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
