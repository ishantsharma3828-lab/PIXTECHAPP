import React, { useState } from 'react';
import { api } from '../../../services/zrApi';
import statesData from '../../../data/states.json';

interface UpdateStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

export const UpdateStatusModal = ({ isOpen, onClose, order, onSuccess }: UpdateStatusModalProps) => {
    const [selectedStateId, setSelectedStateId] = useState('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStateId) {
            setError("Veuillez sélectionner un nouveau statut.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.patch(`/parcels/${order.id}/state`, {
                parcelId: order.id,
                newStateId: selectedStateId,
                comment: comment || ""
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Update Status Error:", err);
            setError(err.message || "Une erreur s'est produite lors de la mise à jour du statut.");
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
            <div className="w-[95vw] sm:w-[400px]" style={{
                backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px',
                maxWidth: '90%', border: '1px solid var(--border-color)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📝</span> Mettre à jour le statut
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>

                {error && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Nouveau Statut *</label>
                        <select
                            value={selectedStateId}
                            onChange={(e) => setSelectedStateId(e.target.value)}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '6px',
                                border: '1px solid var(--border-color)', background: '#0F172A',
                                color: 'var(--text-color)', fontSize: '14px'
                            }}
                            required
                        >
                            <option value="">Sélectionner un statut...</option>
                            {statesData.map((state: any) => (
                                <option key={state.id} value={state.id}>{state.description}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Commentaire (Optionnel)</label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Ex: Livré au voisin..."
                            rows={3}
                            style={{
                                width: '100%', padding: '10px', borderRadius: '6px',
                                border: '1px solid var(--border-color)', background: '#0F172A',
                                color: 'var(--text-color)', fontSize: '14px', resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
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
                            {isSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
