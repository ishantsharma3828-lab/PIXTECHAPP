import { useState, useEffect } from 'react';
import { api } from '../../services/zrApi';
import { CreateModal } from './CreateModal';

interface DataTableProps {
    moduleName: string;
    onRowClick?: (item: any) => void;
}

const getEndpointConfigForModule = (name: string): { endpoint: string, method: 'GET' | 'POST', body?: any } => {
    switch (name) {
        case 'Catalog': return { endpoint: '/products/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Claims': return { endpoint: '/claims/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Customers': return { endpoint: '/customers/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Hubs': return { endpoint: '/hubs/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Orders': return { endpoint: '/parcels/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Rates': return { endpoint: '/delivery-pricing/rates', method: 'GET' };
        case 'Roles': return { endpoint: '/roles', method: 'GET' };
        case 'Supplier': return { endpoint: '/supplier-payment/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Treasury': return { endpoint: '/payment-request/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Users': return { endpoint: '/users/search', method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
        case 'Webhooks': return { endpoint: '/webhooks/endpoints', method: 'GET' };
        // Fallback generic
        default: return { endpoint: `/${name.toLowerCase().replace(' ', '-')}/search`, method: 'POST', body: { pageNumber: 1, pageSize: 50 } };
    }
};

export const DataTable = ({ moduleName, onRowClick }: DataTableProps) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Determine if the current module supports creation
    const canCreate = moduleName === 'Orders' || moduleName === 'Customers';

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const config = getEndpointConfigForModule(moduleName);
                let result;
                if (config.method === 'GET') {
                    result = await api.get(config.endpoint);
                } else {
                    result = await api.post(config.endpoint, config.body);
                }

                if (isMounted) setData(result);
            } catch (err: any) {
                if (isMounted) setError(err.message || 'Failed to fetch data');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [moduleName, refreshTrigger]);

    const renderDataDisplay = () => {
        if (loading) return <div className="loading-spinner">Loading {moduleName}...</div>;
        if (error) return <div className="error-message">{error}</div>;
        if (!data) return null;

        // Handle pagination format commonly found in APIs (data.items, data.data, etc)
        const items = Array.isArray(data) ? data : (data.items || data.data || [data]);

        if (!Array.isArray(items) || items.length === 0) {
            return <div>No records found for {moduleName}.</div>;
        }

        const headers = Object.keys(items[0]).slice(0, 6); // Display up to 6 columns

        const renderCellContent = (value: any): string => {
            if (value === null || value === undefined) return '-';
            if (typeof value !== 'object') return String(value);

            // Handle arrays
            if (Array.isArray(value)) {
                return value.length > 0 ? `[${value.length} items]` : '[]';
            }

            // Handle common nested structures in ZR Express API
            if (value.number1) return String(value.number1); // Phone objects
            if (value.city) {
                // Address objects
                const parts = [value.street, value.city, value.country].filter(Boolean);
                return parts.join(', ');
            }
            if (value.name) return String(value.name); // Generic named objects
            if (value.title) return String(value.title); // Generic titled objects

            // Fallback for flat objects, just join values
            try {
                const keys = Object.keys(value);
                if (keys.length <= 2) {
                    return keys.map(k => `${k}: ${value[k]}`).join(' | ');
                }
                return '{...}'; // Too complex to show inline
            } catch (e) {
                return String(value);
            }
        };

        return (
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {headers.map((h) => <th key={h}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr
                                key={idx}
                                onClick={() => onRowClick && onRowClick(item)}
                                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                                className={onRowClick ? 'clickable-row' : ''}
                            >
                                {headers.map((h) => (
                                    <td key={h}>{renderCellContent(item[h])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="glass card fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>{moduleName} Data</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {canCreate && (
                        <button className="refresh-btn" style={{ background: 'var(--success)' }} onClick={() => setIsModalOpen(true)}>
                            + Create {moduleName === 'Orders' ? 'Order' : 'Customer'}
                        </button>
                    )}
                    <button className="refresh-btn" onClick={() => setRefreshTrigger(prev => prev + 1)} >
                        Refresh
                    </button>
                </div>
            </div>
            {renderDataDisplay()}

            {isModalOpen && canCreate && (
                <CreateModal
                    moduleName={moduleName as 'Customers' | 'Orders'}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        setRefreshTrigger(prev => prev + 1); // Auto refresh table
                    }}
                />
            )}
        </div>
    );
};
