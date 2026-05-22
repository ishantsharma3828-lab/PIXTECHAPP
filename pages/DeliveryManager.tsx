import React, { useState, useEffect, useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import * as billingService from '../services/billingService';
import * as shippingService from '../services/shippingService';
import { Sale, DeliveryStatus } from '../constants/billingTypes';
import { getCurrentUser } from '../services/authService';
import { logDeliveryStatusChange, logZRExpressSync } from '../services/activityLogService';
import { addNotification } from '../services/notificationService';
import {
    Truck,
    Package,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
    Printer
} from 'lucide-react';

const DeliveryManager: React.FC = () => {
    const { settings } = useContext(SettingsContext);
    const [deliveries, setDeliveries] = useState<Sale[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'deliveries' | 'claims'>('deliveries');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isFetchingClaims, setIsFetchingClaims] = useState(false);
    const user = getCurrentUser();

    useEffect(() => {
        loadDeliveries();
        loadClaims();
    }, []);

    const loadClaims = async () => {
        setIsFetchingClaims(true);
        const fetchedClaims = await shippingService.fetchZRExpressClaims();
        setClaims(fetchedClaims);
        setIsFetchingClaims(false);
    };

    const loadDeliveries = async () => {
        const allSales = await billingService.getSalesHistory();
        // Filter for sales that have delivery details OR rely on COD
        const deliverySales = allSales.filter(sale =>
            sale.deliveryDetails ||
            sale.payments.some(p => p.method === 'cod')
        );
        setDeliveries(deliverySales);
    };

    const updateStatus = async (saleId: string, status: DeliveryStatus) => {
        if (confirm(`Update delivery status to ${status}?`)) {
            await billingService.updateDeliveryStatus(saleId, status);
            if (user) {
                logDeliveryStatusChange(user.id, user.username, saleId, status);
                
                if (status === 'returned') {
                    addNotification({
                        title: 'Delivery Returned',
                        message: `Order ${saleId} was returned by the courier.`,
                        type: 'warning',
                        roleTarget: ['admin', 'manager']
                    });
                }
            }
            await loadDeliveries(); // Reload to get fresh state including API sync effects if any
        }
    };

    const markCODPaid = async (saleId: string) => {
        if (confirm('Confirm that COD payment has been collected?')) {
            try {
                await billingService.markCODPaid(saleId);
                await loadDeliveries(); // Reload to reflect updated status
            } catch (error: any) {
                alert(`Error: ${error.message}`);
            }
        }
    };

    const printBorderaux = async (trackingNumber: string) => {
        try {
            console.log('[Delivery Manager] Fetching borderaux for:', trackingNumber);
            const pdfBlob = await shippingService.getShippingLabel(trackingNumber);

            if (pdfBlob) {
                // Create a URL for the PDF blob and open in new window
                const url = URL.createObjectURL(pdfBlob);
                const printWindow = window.open(url, '_blank');

                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                } else {
                    // Fallback: download the PDF
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `borderaux_${trackingNumber}.pdf`;
                    link.click();
                    URL.revokeObjectURL(url);
                }
            } else {
                alert('Failed to fetch shipping label. Please try again.');
            }
        } catch (error: any) {
            console.error('[Delivery Manager] Print borderaux failed:', error);
            alert(`Error: ${error.message || 'Failed to print borderaux'}`);
        }
    };

    const handleSyncZRExpress = async () => {
        setIsSyncing(true);
        try {
            const zrOrders = await shippingService.fetchZRExpressOrders();
            console.log("Fetched ZR Orders:", zrOrders);
            if (zrOrders.length > 0) {
                if (user) {
                    logZRExpressSync(user.id, user.username, zrOrders.length);
                }
                alert(`Synced ${zrOrders.length} orders from ZR Express!\n(Check console for details. Auto-import coming soon)`);
            } else {
                alert("No orders found on ZR Express.");
            }
        } catch (error) {
            console.error("Sync failed", error);
            alert("Failed to sync with ZR Express. Check API settings.");
        } finally {
            setIsSyncing(false);
        }
    };

    const cancelOrder = async (saleId: string, parcelId: string) => {
        if (confirm('Are you sure you want to cancel this ZR Express parcel?')) {
            const success = await shippingService.deleteZRExpressOrder(parcelId);
            if (success) {
                await billingService.updateDeliveryStatus(saleId, 'cancelled');
                if (user) logDeliveryStatusChange(user.id, user.username, saleId, 'cancelled');
                await loadDeliveries();
                alert('Order cancelled successfully on ZR Express.');
            } else {
                alert('Failed to cancel order. It might already be processed or shipped.');
            }
        }
    };

    const refundOrder = async (saleId: string, parcelId: string) => {
        if (confirm('Are you sure you want to request a refund for this parcel?')) {
            const success = await shippingService.refundZRExpressOrder(parcelId);
            if (success) {
                // Keep local status, just notify
                alert('Refund requested successfully on ZR Express.');
            } else {
                alert('Failed to request refund. Check ZR Express dashboard.');
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 animate-in fade-in overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Truck className="text-indigo-500" />
                        Delivery & Claims Manager
                    </h1>
                    <p className="text-slate-500">Track shipments, manage claims, and handle returns</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('deliveries')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'deliveries' ? 'bg-white shadow-sm text-indigo-600 dark:bg-gray-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}
                    >
                        Deliveries
                    </button>
                    <button
                        onClick={() => setActiveTab('claims')}
                        className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'claims' ? 'bg-white shadow-sm text-indigo-600 dark:bg-gray-700 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-gray-400'}`}
                    >
                        Claims
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSyncZRExpress}
                        disabled={isSyncing}
                        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 flex items-center gap-2 ${isSyncing ? 'opacity-50' : ''}`}
                        title="Sync from ZR Express"
                    >
                        <svg className={`w-5 h-5 text-purple-600 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <button onClick={() => { loadDeliveries(); loadClaims(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full" title="Refresh">
                        <Clock className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </div>

            {activeTab === 'deliveries' ? (
                <div className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:overflow-visible">
                    {/* PENDING COLUMN */}
                    <div className="bg-slate-100 dark:bg-gray-800/50 p-4 rounded-xl w-[85vw] md:w-auto shrink-0 snap-center flex flex-col max-h-[70vh] md:max-h-none">
                        <h2 className="font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Pending
                        </h2>
                        <div className="space-y-3 overflow-y-auto pr-1">
                            {deliveries.filter(d => !d.deliveryDetails?.status || d.deliveryDetails.status === 'pending').map(sale => (
                                <DeliveryCard
                                    key={sale.id}
                                    sale={sale}
                                    onAction={() => updateStatus(sale.id, 'shipped')}
                                    actionLabel="Mark Shipped"
                                    onPrintBorderaux={sale.deliveryDetails?.zrExpressTrackingNumber ?
                                        () => printBorderaux(sale.deliveryDetails!.zrExpressTrackingNumber!) : undefined}
                                />
                            ))}
                        </div>
                    </div>

                    {/* SHIPPED COLUMN */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl w-[85vw] md:w-auto shrink-0 snap-center flex flex-col max-h-[70vh] md:max-h-none">
                        <h2 className="font-bold text-blue-500 uppercase mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Out for Delivery
                        </h2>
                        <div className="space-y-3 overflow-y-auto pr-1">
                            {deliveries.filter(d => d.deliveryDetails?.status === 'shipped').map(sale => (
                                <DeliveryCard
                                    key={sale.id}
                                    sale={sale}
                                    onAction={() => updateStatus(sale.id, 'delivered')}
                                    actionLabel="Confirm Delivery"
                                    isShipped
                                    onSecondaryAction={() => updateStatus(sale.id, 'returned')}
                                    secondaryActionLabel="Return"
                                    onMarkPaid={() => markCODPaid(sale.id)}
                                    onPrintBorderaux={sale.deliveryDetails?.zrExpressTrackingNumber ?
                                        () => printBorderaux(sale.deliveryDetails!.zrExpressTrackingNumber!) : undefined}
                                />
                            ))}
                        </div>
                    </div>

                    {/* COMPLETED COLUMN */}
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl w-[85vw] md:w-auto shrink-0 snap-center flex flex-col max-h-[70vh] md:max-h-none">
                        <h2 className="font-bold text-green-500 uppercase mb-4 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Delivered
                        </h2>
                        <div className="space-y-3 overflow-y-auto pr-1">
                            {deliveries.filter(d => d.deliveryDetails?.status === 'delivered').map(sale => (
                                <DeliveryCard key={sale.id} sale={sale} />
                            ))}
                        </div>
                    </div>

                    {/* RETURNED COLUMN */}
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl w-[85vw] md:w-auto shrink-0 snap-center flex flex-col max-h-[70vh] md:max-h-none">
                        <h2 className="font-bold text-red-500 uppercase mb-4 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Returned
                        </h2>
                        <div className="space-y-3 overflow-y-auto pr-1">
                            {deliveries.filter(d => d.deliveryDetails?.status === 'returned').map(sale => (
                                <DeliveryCard
                                    key={sale.id}
                                    sale={sale}
                                    onRefundOrder={sale.deliveryDetails?.zrExpressParcelId ?
                                        () => refundOrder(sale.id, sale.deliveryDetails!.zrExpressParcelId!) : undefined}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* CLAIMS VIEWER */
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-gray-900">
                        <h2 className="font-bold text-slate-800 dark:text-white">ZR Express Claims</h2>
                        {isFetchingClaims && <span className="text-xs text-slate-500 animate-pulse">Fetching latest...</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {claims.length === 0 && !isFetchingClaims ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <CheckCircle className="w-12 h-12 mb-3 text-green-400" />
                                <p>No active claims found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {claims.map((claim: any) => (
                                    <div key={claim.id} className="border border-slate-200 dark:border-gray-700 p-4 rounded-xl hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-indigo-600 text-sm">{claim.title || 'Untitled Claim'}</span>
                                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-gray-700 rounded-md font-mono">{claim.parcel?.trackingNumber}</span>
                                        </div>
                                        <div className="text-sm text-slate-600 dark:text-gray-300 mb-4 line-clamp-3">
                                            {claim.description}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-400 mt-auto border-t border-gray-100 dark:border-gray-700 pt-3">
                                            <span>Status: <strong className="text-slate-700 dark:text-gray-300">{claim.state?.name || 'Open'}</strong></span>
                                            <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface DeliveryCardProps {
    sale: Sale;
    onAction?: () => void;
    actionLabel?: string;
    isShipped?: boolean;
    onSecondaryAction?: () => void;
    secondaryActionLabel?: string;
    onMarkPaid?: () => void;
    onPrintBorderaux?: () => void;
    onCancelOrder?: () => void;
    onRefundOrder?: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({
    sale, onAction, actionLabel, isShipped, onSecondaryAction,
    secondaryActionLabel, onMarkPaid, onPrintBorderaux, onCancelOrder, onRefundOrder
}) => {

    // Find COD amount
    const codPayment = sale.payments.find(p => p.method === 'cod');

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-slate-800 dark:text-white truncate">{sale.customerName || 'Guest'}</span>
                <span className="text-xs text-gray-400">#{sale.id.slice(-4)}</span>
            </div>

            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300 mb-3">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                <p className="bg-slate-50 dark:bg-gray-700/50 p-2 rounded w-full text-xs">
                    {sale.deliveryDetails?.address || sale.payments.find(p => p.note)?.note || 'No address provided'}
                </p>
            </div>

            <div className="flex justify-between items-center text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="font-bold">
                    {codPayment ? (
                        <span className="text-indigo-600 flex items-center gap-1">
                            COD: ${codPayment.amount}
                        </span>
                    ) : (
                        <span className="text-green-600">Paid Pre-Delivery</span>
                    )}
                </div>
                <div className="flex gap-2 flex-wrap">
                    {/* Print Borderaux button for ZR Express orders */}
                    {onPrintBorderaux && (
                        <button
                            onClick={onPrintBorderaux}
                            className="text-xs px-3 py-1.5 rounded-md font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-1"
                        >
                            <Printer className="w-3 h-3" />
                            Print Borderaux
                        </button>
                    )}
                    {/* Mark as Paid button for COD orders */}
                    {codPayment && sale.status === 'pending' && onMarkPaid && (
                        <button
                            onClick={onMarkPaid}
                            className="text-xs px-3 py-1.5 rounded-md font-bold bg-green-600 text-white hover:bg-green-700 shadow-sm flex items-center gap-1"
                        >
                            💵 Mark Paid
                        </button>
                    )}
                    {/* Action buttons for Advanced Logic */}
                    {onRefundOrder && (
                        <button
                            onClick={onRefundOrder}
                            className="text-xs px-2 py-1.5 rounded-md font-bold text-blue-500 hover:bg-blue-50 border border-blue-200"
                        >
                            Request Refund
                        </button>
                    )}
                    {onCancelOrder && (
                        <button
                            onClick={onCancelOrder}
                            className="text-xs px-2 py-1.5 rounded-md font-bold text-orange-500 hover:bg-orange-50 border border-orange-200"
                        >
                            Cancel Order
                        </button>
                    )}
                    {onSecondaryAction && secondaryActionLabel && (
                        <button
                            onClick={onSecondaryAction}
                            className="text-xs px-2 py-1.5 rounded-md font-bold text-red-500 hover:bg-red-50 border border-red-200"
                        >
                            {secondaryActionLabel}
                        </button>
                    )}
                    {onAction && actionLabel && (
                        <button
                            onClick={onAction}
                            className={`text-xs px-3 py-1.5 rounded-md font-bold text-white shadow-sm
                                ${isShipped ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryManager;
