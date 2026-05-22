
import React, { useState, useContext } from 'react';
import { Sale } from '../../constants/billingTypes';
import { SettingsContext } from '../../contexts/SettingsContext';
import * as receiptService from '../../services/receiptService';
import { api } from '../../services/zrApi';

interface ReceiptModalProps {
    sale: Sale;
    onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
    const { settings, t } = useContext(SettingsContext);
    const [mode, setMode] = useState<'thermal' | 'a4'>('thermal');
    const [printLanguage, setPrintLanguage] = useState<'en' | 'fr' | 'ar'>(settings.language);

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number | undefined | null) => {
        const num = typeof val === 'number' ? val : 0;
        return isRightSideCurrency ? `${num.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${num.toFixed(2)}`;
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        if (mode === 'thermal') {
            receiptService.generateThermalReceiptPDF(sale, settings);
        } else {
            receiptService.generateA4InvoicePDF(sale, settings, printLanguage);
        }
    };

    const handleShare = (method: 'whatsapp' | 'email') => {
        let link = '';
        if (method === 'whatsapp') {
            link = receiptService.getWhatsAppLink(sale, settings);
        } else {
            link = receiptService.getEmailLink(sale, settings);
        }
        window.open(link, '_blank');
    };

    const handlePrintZR = async () => {
        const trackingNumber = sale.deliveryDetails?.zrExpressTrackingNumber;
        if (!trackingNumber) return;
        try {
            const result: any = await api.post('/parcels/labels/individual/pdf', {
                trackingNumbers: [trackingNumber],
                format: 'A4'
            });
            if (result && result.parcelLabelFiles && result.parcelLabelFiles.length > 0 && result.parcelLabelFiles[0].fileUrl) {
                window.open(result.parcelLabelFiles[0].fileUrl, '_blank');
            } else {
                alert("Impossible de générer l'étiquette. Veuillez réessayer.");
            }
        } catch (error) {
            console.error('Error generating label:', error);
            alert("Erreur lors de la génération de l'étiquette.");
        }
    };

    // Preview Components
    const ThermalPreview = () => (
        <div className="bg-white text-black font-mono text-sm p-4 w-[80mm] mx-auto shadow-lg border border-slate-200 min-h-[400px] flex flex-col">
            {/* Header */}
            <div className="text-center mb-4">
                {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-12 mx-auto mb-2 filter grayscale" />}
                <h3 className="font-bold text-lg uppercase">{settings.companyName}</h3>
                {settings.companyAddresses && settings.companyAddresses[0] && (
                    <p className="text-xs">
                        {settings.companyAddresses[0].street}<br />
                        {settings.companyAddresses[0].city} {settings.companyAddresses[0].zip}
                    </p>
                )}
                {settings.companyPhones && settings.companyPhones[0] && <p className="text-xs">Tel: {settings.companyPhones[0]}</p>}

                {(settings.rcNumber || settings.nifNumber) && (
                    <div className="text-[10px] mt-1 border-t border-slate-300 pt-1">
                        {settings.rcNumber && <span>RC: {settings.rcNumber} </span>}
                        {settings.nifNumber && <span>NIF: {settings.nifNumber}</span>}
                    </div>
                )}
            </div>

            <div className="border-b border-dashed border-black mb-2"></div>

            <div className="text-xs mb-2">
                <div className="flex justify-between"><span>Order #:</span><span>{sale.friendlyId || sale.id.slice(-8).toUpperCase()}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{new Date(sale.date).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>Cashier:</span><span>{sale.cashierName}</span></div>
                {sale.customerName && <div className="flex justify-between"><span>Customer:</span><span>{sale.customerName}</span></div>}
            </div>

            <div className="border-b border-dashed border-black mb-2"></div>

            {/* Items */}
            <div className="flex-1">
                <div className="flex font-bold text-xs mb-1">
                    <span className="flex-1">{t('stock.item')}</span>
                    <span className="w-16 text-right">{t('stock.total')}</span>
                </div>
                {sale.items.map((item, i) => (
                    <div key={i} className="mb-1 text-xs">
                        <div>{item.name}</div>
                        <div className="flex justify-between text-[10px] pl-2 text-slate-600">
                            <span>{item.quantity} x {formatPrice(item.unitPrice)}</span>
                            <span className="text-black text-xs">{formatPrice((item.unitPrice * item.quantity) - item.discountValue)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Totals */}
            <div className="text-xs space-y-1">
                <div className="flex justify-between"><span>{t('billing.subtotal')}</span><span>{formatPrice(sale.subtotal)}</span></div>
                {sale.discount > 0 && <div className="flex justify-between"><span>{t('billing.discount')}</span><span>-{formatPrice(sale.discount)}</span></div>}
                {sale.tax > 0 && <div className="flex justify-between"><span>{t('billing.tax')}</span><span>{formatPrice(sale.tax)}</span></div>}
                <div className="flex justify-between font-bold text-sm mt-1"><span>{t('pc.total')}</span><span>{formatPrice(sale.total)}</span></div>
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            {/* Payments */}
            <div className="text-xs space-y-1">
                {sale.payments.map((p, i) => (
                    <div key={i} className="flex justify-between uppercase">
                        <span>{t(`billing.pay_${p.method}` as any)}</span>
                        <span>{formatPrice(p.amount)}</span>
                    </div>
                ))}
                {sale.debtDetails && (
                    <div className="flex justify-between uppercase font-bold mt-1">
                        <span>{t('contacts.debt')}</span>
                        <span>{formatPrice(sale.debtDetails.totalDebtAmount)}</span>
                    </div>
                )}
            </div>

            {/* Footer & QR */}
            <div className="mt-6 text-center">
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(sale.id)}`}
                    alt="QR"
                    className="w-20 h-20 mx-auto mb-2"
                />
                <p className="text-xs font-bold">Thank you!</p>
                <p className="text-[10px]">No returns without receipt.</p>
            </div>
        </div>
    );

    const A4Preview = () => (
        <div className="bg-white text-black p-8 w-[210mm] mx-auto shadow-lg border border-slate-200 min-h-[297mm] text-xs relative font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 text-[10px] leading-tight relative">
                <div className="absolute -top-2 -left-2 text-xl font-bold border-b border-black">0</div>
                <div className="w-1/2 mt-4">
                    <h2 className="font-bold text-lg">{settings.companyName.toUpperCase()}</h2>
                    <p>{settings.companyAddresses[0]?.street || ''}</p>
                    <p>Tél : {settings.companyPhones[0] || ''}</p>
                </div>
                <div className="w-1/2 text-center mt-8">
                    <div className="font-bold text-xl mb-1">BON DE LIVRAISON - FACTURE</div>
                    <div className="text-sm font-bold mt-1">N°: {sale.friendlyId || sale.id}</div>
                    <div className="mt-2 text-xs">
                        {/* Barcode Placeholder if lib not available in preview */}
                        <div className="h-8 border border-black mx-auto w-32 flex items-center justify-center bg-slate-100">|||| |||| ||||</div>
                    </div>
                </div>
            </div>

            {/* Info Block (RC/NIF/etc) */}
            <div className="flex justify-between text-[9px] mb-4">
                <div className="w-1/2">
                    <div>Compte : </div>
                    <div>RIB : </div>
                    {settings.companyEmails[0] && <div>e-mail : {settings.companyEmails[0]}</div>}
                    {settings.companyWebsites[0] && <div>Site web : {settings.companyWebsites[0]}</div>}
                </div>
                <div className="w-1/2 text-right">
                    {settings.rcNumber && <div>RC : {settings.rcNumber}</div>}
                    {settings.artNumber && <div>AI : {settings.artNumber}</div>}
                    {settings.nifNumber && <div>Id Fiscal : {settings.nifNumber}</div>}
                    {settings.nisNumber && <div>NIS : {settings.nisNumber}</div>}
                </div>
            </div>

            {/* Client & Date Section - Bordered */}
            <div className="border border-black p-2 flex justify-between mb-4 text-[10px]">
                <div className="w-1/2">
                    <div className="font-bold mb-1">
                        {settings.companyAddresses[0]?.city || 'Ville'}, le {new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div>Mode de Paiement : {(sale.payments || []).map(p => p.method).join(', ')} {sale.debtDetails ? '(Crédit)' : ''}</div>
                </div>
                <div className="w-1/2 pl-8 border-l border-black border-dashed">
                    <div className="font-bold">DOIT {sale.customerId || ''}</div>
                    <div className="font-bold text-sm mt-1">{sale.customerName || 'CLIENT PASSAGER'}</div>
                    <div className="mt-1">{sale.customerAddress || ''}</div>
                </div>
            </div>

            {/* Table */}
            <div className="border border-black border-b-0 mb-0">
                <table className="w-full text-[9px]">
                    <thead className="bg-slate-100">
                        <tr className="border-b border-black">
                            <th className="p-1 text-center w-10 border-r border-black">CODE</th>
                            <th className="p-1 text-left border-r border-black pl-2">DESIGNATION</th>
                            <th className="p-1 text-center w-10 border-r border-black">QTE</th>
                            <th className="p-1 text-right w-20 border-r border-black pr-2">PU HT</th>
                            <th className="p-1 text-center w-10 border-r border-black">RIS.%</th>
                            <th className="p-1 text-right w-24 border-r border-black pr-2">MONTANT HT</th>
                            <th className="p-1 text-center w-10">TVA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map((item, i) => (
                            <tr key={i} className="border-b border-black">
                                <td className="p-1 border-r border-black text-center">{item.sku || '-'}</td>
                                <td className="p-1 border-r border-black pl-2">{item.name}</td>
                                <td className="p-1 border-r border-black text-center">{item.quantity}</td>
                                <td className="p-1 border-r border-black text-right pr-2">{item.unitPrice.toFixed(2)}</td>
                                <td className="p-1 border-r border-black text-center">{item.discountType === 'percentage' ? item.discountValue : '-'}</td>
                                <td className="p-1 border-r border-black text-right pr-2">{((item.unitPrice * item.quantity) - item.discountValue).toFixed(2)}</td>
                                <td className="p-1 text-center">0</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Spacer */}
            <div className="border-t border-black mb-4"></div>

            <div className="w-[55%] text-[10px]">
                <div className="font-bold mb-2">NB. UV : {(sale.items || []).reduce((a, c) => a + c.quantity, 0).toFixed(2)}</div>
                <div className="mb-1">Arrêté la présente facture à la somme de :</div>
                <div className="font-bold mb-2">*** {(sale.total || 0).toFixed(2)} {settings.currencySymbol} ***</div>
            </div>

            <div className="w-[40%]">
                <table className="w-full text-[10px] border-collapse border border-black">
                    <tbody>
                        <tr>
                            <td className="p-1 border border-black font-bold">TOTAL HT</td>
                            <td className="p-1 border border-black text-right font-bold">{formatPrice(sale.subtotal)}</td>
                        </tr>
                        <tr>
                            <td className="p-1 border border-black">TVA</td>
                            <td className="p-1 border border-black text-right">{formatPrice(sale.tax)}</td>
                        </tr>
                        <tr>
                            <td className="p-1 border border-black">TIMBRE</td>
                            <td className="p-1 border border-black text-right">0.00</td>
                        </tr>
                        <tr>
                            <td className="p-1 border border-black font-bold text-sm">NET A PAYER</td>
                            <td className="p-1 border border-black text-right font-bold text-sm">{formatPrice(sale.total)}</td>
                        </tr>
                        <tr>
                            <td className="p-1 border border-black font-bold">VERSÉ</td>
                            <td className="p-1 border border-black text-right font-bold">
                                {formatPrice(sale.debtDetails ? (sale.debtDetails.advancePayment || sale.debtDetails.paidAmount || 0) : sale.total)}
                            </td>
                        </tr>
                        {/* Always show RESTE if there is debt/credit involved */}
                        {(sale.debtDetails?.isDebt || (sale.debtDetails?.remainingAmount ?? 0) > 0) && (
                            <tr>
                                <td className="p-1 border border-black font-bold text-red-600">RESTE</td>
                                <td className="p-1 border border-black text-right font-bold text-red-600">{formatPrice(sale.debtDetails?.remainingAmount ?? 0)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Signatures */}
            <div className="mt-8 flex justify-between text-[10px]">
                <div className="w-1/3 text-center">
                    <div className="font-bold mb-8">Signature client</div>
                </div>
                <div className="w-1/3 text-center">
                    <div className="font-bold mb-1">
                        {(sale.cashierName || '').toLowerCase().includes('admin') ? 'Administrateur' : 'Vendeur'}
                    </div>
                    <div>{sale.cashierName || ''}</div>
                    <div className="font-bold mt-8">Signature vendeur</div>
                </div>
            </div>

            {/* Tax Summary Table (Bottom Right) */}
            <div className="absolute bottom-8 right-8 w-1/3 border-t border-black pt-2 text-[9px]">
                <div className="flex justify-between font-bold border-b border-black pb-1">
                    <span>TVA</span><span>Base HT</span><span>Montant TVA</span>
                </div>
                <div className="flex justify-between mt-1">
                    <span>TVA 0%</span>
                    <span>{formatPrice(sale.subtotal)}</span>
                    <span>{formatPrice(sale.tax)}</span>
                </div>
                <div className="flex justify-between mt-1 pt-1 border-t border-black font-bold">
                    <span>Total</span>
                    <span>{formatPrice(sale.subtotal)}</span>
                    <span>{formatPrice(sale.tax)}</span>
                </div>
                <div className="text-right mt-2">{new Date(sale.date).toLocaleDateString()}</div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white dark:bg-zinc-950/95 z-[200] flex items-center justify-center sm:p-4 animate-fade-in backdrop-blur-sm print:bg-white print:p-0">
            <div className="bg-white dark:bg-zinc-950 sm:rounded-xl shadow-2xl w-full h-[100dvh] sm:h-[90vh] sm:w-[80vw] max-w-5xl flex flex-col md:flex-row overflow-hidden border-t sm:border border-slate-200 dark:border-zinc-800/50 print:shadow-none print:h-auto print:border-none">

                {/* LEFT: Controls (Hidden on Print) */}
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-zinc-900/50 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800/50 p-4 md:p-6 flex flex-col print:hidden overflow-y-auto shrink-0 md:shrink">
                    <div className="mb-4 md:mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t('billing.sale_complete')}
                        </h2>
                        <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-1">{t('billing.receipt_ready')} <span className="font-mono text-blue-500 dark:text-blue-400">#{sale.id.slice(-6)}</span></p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-[10px] font-black text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-1 md:mb-2">{t('export.format')}</label>
                            <div className="flex p-1 bg-white dark:bg-zinc-950/50 rounded-lg border border-slate-200 dark:border-zinc-800/50">
                                <button
                                    onClick={() => setMode('thermal')}
                                    className={`flex-1 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-md transition-all ${mode === 'thermal' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-slate-200 dark:bg-zinc-900'}`}
                                >
                                    Thermal
                                </button>
                                <button
                                    onClick={() => setMode('a4')}
                                    className={`flex-1 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-md transition-all ${mode === 'a4' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 hover:bg-slate-50 dark:hover:text-slate-200 dark:bg-zinc-900'}`}
                                >
                                    A4 Invoice
                                </button>
                            </div>
                        </div>

                        {mode === 'a4' && (
                            <div>
                                <label className="block text-[10px] font-black text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">{t('settings.language')}</label>
                                <select
                                    value={printLanguage}
                                    onChange={(e) => setPrintLanguage(e.target.value as any)}
                                    className="w-full p-2.5 bg-white dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                >
                                    <option value="en">English</option>
                                    <option value="fr">Français</option>
                                    <option value="ar">العربية</option>
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleShare('email')}
                                className="p-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 text-slate-500 dark:text-zinc-400 hover:text-blue-400 transition-all flex flex-col items-center gap-2 group"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span className="text-xs font-bold uppercase tracking-wider">{t('billing.receipt_modal.email')}</span>
                            </button>
                            <button
                                onClick={() => handleShare('whatsapp')}
                                className="p-3 bg-slate-50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/10 text-slate-500 dark:text-zinc-400 hover:text-emerald-400 transition-all flex flex-col items-center gap-2 group"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                <span className="text-xs font-bold uppercase tracking-wider">{t('billing.receipt_modal.whatsapp')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 md:space-y-3 mt-auto pt-4 md:pt-6 border-t border-slate-200 dark:border-zinc-800/50">
                        {sale.deliveryDetails?.zrExpressTrackingNumber && (
                            <button
                                onClick={handlePrintZR}
                                className="w-full py-2.5 md:py-3.5 bg-indigo-600 text-white rounded-lg md:rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 mb-2 text-sm md:text-base"
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                Imprimer Borderaux ZR
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            className="w-full py-2.5 md:py-3.5 bg-blue-600 text-white rounded-lg md:rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            {mode === 'thermal' ? t('billing.print_receipt') : 'Print A4'}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="w-full py-2.5 md:py-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/50 text-slate-600 dark:text-slate-200 rounded-lg md:rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            {t('billing.download_pdf')}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 md:py-3 text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 font-bold uppercase tracking-wider text-[10px] md:text-xs transition-colors"
                        >
                            {t('common.close')} & {t('billing.new_sale')}
                        </button>
                    </div>
                </div>

                {/* RIGHT: Live Preview */}
                <div className="flex-1 bg-zinc-400/20 dark:bg-zinc-950 p-4 shrink-0 overflow-auto flex justify-center md:justify-center items-start print:bg-white print:p-0 print:block">
                    <div className="shadow-2xl print:shadow-none transition-all duration-300 transform origin-top md:origin-top scale-[0.45] sm:scale-[0.7] md:scale-100 print:!scale-100 pb-[calc(10rem+env(safe-area-inset-bottom,0px))] md:pb-0">
                        {mode === 'thermal' ? <ThermalPreview /> : <A4Preview />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptModal;
