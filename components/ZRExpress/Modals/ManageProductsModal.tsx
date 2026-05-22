import React, { useState, useEffect } from 'react';
import { api } from '../../../services/zrApi';

interface ManageProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    onSuccess: () => void;
}

export const ManageProductsModal = ({ isOpen, onClose, order, onSuccess }: ManageProductsModalProps) => {
    const [products, setProducts] = useState<any[]>([]);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (order && isOpen) {
            let initialProducts = order.orderedProducts || [];
            if (initialProducts.length === 0 && order.description) {
                // Try to build a mock product from description if none exist
                initialProducts = [{
                    productId: undefined,
                    productName: order.description,
                    quantity: 1,
                    unitPrice: order.amount || 0,
                    stockType: 'none'
                }];
            }
            // Strip out strict uuids to avoid API validation errors if we change things
            const safeProducts = initialProducts.map((p: any) => ({
                productName: p.productName || p.name || '',
                quantity: p.quantity || 1,
                unitPrice: p.unitPrice || p.price || 0,
                stockType: p.stockType || 'none'
            }));

            setProducts(safeProducts);
            setTotalAmount(order.amount || 0);
            setError(null);
        }
    }, [order, isOpen]);

    if (!isOpen) return null;

    const handleAddProduct = () => {
        setProducts([...products, { productName: '', quantity: 1, unitPrice: 0, stockType: 'none' }]);
    };

    const handleRemoveProduct = (index: number) => {
        const newP = [...products];
        newP.splice(index, 1);
        setProducts(newP);
        autoCalculateTotal(newP);
    };

    const handleProductChange = (index: number, field: string, value: any) => {
        const newP = [...products];
        newP[index] = { ...newP[index], [field]: value };
        setProducts(newP);
        autoCalculateTotal(newP);
    };

    const autoCalculateTotal = (prods: any[]) => {
        const sum = prods.reduce((acc, p) => acc + (Number(p.quantity) * Number(p.unitPrice)), 0);
        setTotalAmount(sum);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (products.length === 0) {
            setError("La commande doit contenir au moins un produit.");
            return;
        }

        const invalid = products.find(p => !p.productName || p.quantity < 1 || p.unitPrice < 0);
        if (invalid) {
            setError("Veuillez remplir correctement tous les champs des produits.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const updatedParcel = {
                ...order,
                amount: Number(totalAmount),
                orderedProducts: products.map(p => ({
                    productName: p.productName,
                    quantity: Number(p.quantity),
                    unitPrice: Number(p.unitPrice),
                    stockType: 'none'
                }))
            };

            await api.put(`/parcels/${order.id}`, updatedParcel);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Edit Products Error:", err);
            setError(err.message || "Impossible de mettre à jour les produits.");
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
            <div className="w-[95vw] sm:w-[600px]" style={{
                backgroundColor: 'var(--card-bg)', padding: '24px', borderRadius: '12px',
                maxWidth: '90%', border: '1px solid var(--border-color)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)', position: 'relative',
                maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📦</span> Gérer les produits
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
                </div>

                {error && <div style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {products.map((product, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ flex: 2 }}>
                                    <input
                                        type="text" value={product.productName} placeholder="Nom du produit"
                                        onChange={e => handleProductChange(idx, 'productName', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#0F172A', color: 'var(--text-color)', fontSize: '13px', boxSizing: 'border-box' }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number" value={product.quantity} placeholder="Qté" min="1"
                                        onChange={e => handleProductChange(idx, 'quantity', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#0F172A', color: 'var(--text-color)', fontSize: '13px', boxSizing: 'border-box' }}
                                        required
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input
                                        type="number" value={product.unitPrice} placeholder="Prix" min="0" step="0.01"
                                        onChange={e => handleProductChange(idx, 'unitPrice', e.target.value)}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: '#0F172A', color: 'var(--text-color)', fontSize: '13px', boxSizing: 'border-box' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <button type="button" onClick={() => handleRemoveProduct(idx)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button" onClick={handleAddProduct}
                        style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-color)', padding: '8px 16px', borderRadius: '6px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>+</span> Ajouter un produit
                    </button>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Montant Total (DA) *</label>
                        <input
                            type="number"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(Number(e.target.value))}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '6px',
                                border: '1px solid #4CAF50', background: 'rgba(76, 175, 80, 0.1)',
                                color: '#4CAF50', fontSize: '16px', fontWeight: 'bold', boxSizing: 'border-box'
                            }}
                            required
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                            Le total a été calculé automatiquement mais vous pouvez le modifier si vous avez des frais de livraison ajoutés.
                        </span>
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
                            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
