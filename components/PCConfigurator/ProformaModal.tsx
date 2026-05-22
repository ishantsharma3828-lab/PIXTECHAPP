
import React, { useState, useContext } from 'react';
import { PCBuild } from '../../services/pcBuilderService';
import { SettingsContext } from '../../contexts/SettingsContext';

interface ProformaModalProps {
    build: PCBuild;
    onClose: () => void;
}

const ProformaModal: React.FC<ProformaModalProps> = ({ build, onClose }) => {
    const { settings, t } = useContext(SettingsContext);
    const [mode, setMode] = useState<'thermal' | 'a4'>('a4');
    const [printLanguage, setPrintLanguage] = useState<'en' | 'fr' | 'ar'>(settings.language);

    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';
    const formatPrice = (val: number) => isRightSideCurrency ? `${val.toFixed(2)} ${settings.currencySymbol}` : `${settings.currencySymbol}${val.toFixed(2)}`;

    // Calculate totals
    const subtotal = build.parts.reduce((sum, p) => sum + (p[build.priceTier || 'price1'] || 0), 0);
    const total = subtotal + (build.assemblyFee || 0);

    const handlePrint = () => {
        window.print();
    };

    const A4Preview = () => (
        <div className="bg-white text-black p-8 w-[210mm] mx-auto shadow-lg border border-slate-200 min-h-[297mm] text-xs relative font-sans">
            {/* Header */}
            <div className="flex justify-between mb-6">
                <div className="w-1/2">
                    <h1 className="text-lg font-bold uppercase mb-1">{settings.companyName}</h1>
                    {settings.legalName && <p className="font-bold text-[10px] mb-1">{settings.legalName}</p>}

                    {settings.companyAddresses && settings.companyAddresses[0] && (
                        <div className="text-[10px] mt-1">
                            {settings.companyAddresses[0].street}, {settings.companyAddresses[0].city}
                        </div>
                    )}

                    {settings.companyPhones && settings.companyPhones.length > 0 && (
                        <div className="text-[10px]">
                            Tél : {settings.companyPhones.join(' / ')}
                        </div>
                    )}
                </div>

                {settings.logoUrl && (
                    <div className="w-1/2 flex justify-end">
                        <img src={settings.logoUrl} alt="Logo" className="object-contain h-16 w-auto" />
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h2 className="text-xl font-black border-2 border-black py-2 px-4 inline-block uppercase bg-slate-50">
                    {t('pc.proforma_invoice')}
                </h2>
                <div className="text-sm font-bold mt-2">N°: {build.id.replace('build_', 'PR-').toUpperCase()}</div>
            </div>

            {/* Info Block */}
            <div className="flex justify-between text-[9px] mb-4">
                <div className="w-1/2">
                    {settings.companyEmails[0] && <div>e-mail : {settings.companyEmails[0]}</div>}
                    {settings.companyWebsites[0] && <div>Site web : {settings.companyWebsites[0]}</div>}
                </div>
                <div className="w-1/2 text-right">
                    {settings.rcNumber && <div>RC : {settings.rcNumber}</div>}
                    {settings.nifNumber && <div>Id Fiscal : {settings.nifNumber}</div>}
                </div>
            </div>

            {/* Client & Date Section */}
            <div className="border border-black p-2 flex justify-between mb-4 text-[10px]">
                <div className="w-1/2">
                    <div className="font-bold mb-1">
                        {settings.companyAddresses[0]?.city || 'Ville'}, le {new Date().toLocaleDateString()}
                    </div>
                    <div>Objet : Devis Configuration PC</div>
                    <div className="mt-1 italic">Validité de l'offre : 7 jours</div>
                </div>
                <div className="w-1/2 pl-8 border-l border-black border-dashed">
                    <div className="font-bold">CLIENT :</div>
                    <div className="font-bold text-sm mt-1">{build.customerName || 'CLIENT PASSAGER'}</div>
                    <div className="mt-2 text-[9px] text-slate-500 uppercase font-bold">Config : {build.name}</div>
                </div>
            </div>

            {/* Table */}
            <div className="border border-black mb-0 min-h-[400px]">
                <table className="w-full text-[9px]">
                    <thead className="bg-slate-100">
                        <tr className="border-b border-black">
                            <th className="p-2 text-center w-10 border-r border-black">#</th>
                            <th className="p-2 text-left border-r border-black pl-2">DESIGNATION DES COMPOSANTS</th>
                            <th className="p-2 text-center w-10 border-r border-black">QTE</th>
                            <th className="p-2 text-right w-24 border-r border-black pr-2">PU HT</th>
                            <th className="p-2 text-right w-24 pr-2">MONTANT HT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {build.parts.map((item, i) => (
                            <tr key={i} className="border-b border-slate-300">
                                <td className="p-2 border-r border-black text-center">{i + 1}</td>
                                <td className="p-2 border-r border-black pl-2 font-medium">{item.name} <span className="text-[8px] text-slate-500 ml-1">({item.categoryType})</span></td>
                                <td className="p-2 border-r border-black text-center">1</td>
                                <td className="p-2 border-r border-black text-right pr-2">{(item[build.priceTier || 'price1'] || 0).toFixed(2)}</td>
                                <td className="p-2 text-right pr-2">{(item[build.priceTier || 'price1'] || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                        {build.assemblyFee > 0 && (
                            <tr className="border-b border-black bg-slate-50 italic">
                                <td className="p-2 border-r border-black text-center">+</td>
                                <td className="p-2 border-r border-black pl-2 font-bold">Installation, Montage & Tests de Stabilité</td>
                                <td className="p-2 border-r border-black text-center">1</td>
                                <td className="p-2 border-r border-black text-right pr-2">{build.assemblyFee.toFixed(2)}</td>
                                <td className="p-2 text-right pr-2">{build.assemblyFee.toFixed(2)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Totals */}
            <div className="flex justify-between items-start mt-6">
                <div className="w-[55%] text-[10px]">
                    <div className="mb-2">
                        <span className="font-bold underline">Notes :</span><br />
                        {build.notes || 'Aucune note spécifique.'}
                    </div>
                    <div className="mt-4 p-2 bg-slate-100 rounded">
                        <p className="font-bold">Calcul de la somme :</p>
                        <p className="italic">Arrêté la présente proforma à la somme de : {total.toFixed(2)} {settings.currencySymbol}</p>
                    </div>
                </div>

                <div className="w-[40%]">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <tbody>
                            <tr>
                                <td className="p-2 border border-black font-bold bg-slate-100">TOTAL HORS TAXES</td>
                                <td className="p-2 border border-black text-right font-bold">{formatPrice(total)}</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td className="p-2 border border-black">REMISE</td>
                                <td className="p-2 border border-black text-right">0.00</td>
                            </tr>
                            <tr>
                                <td className="p-1 border border-black font-black text-base uppercase bg-black text-white">Net à Payer</td>
                                <td className="p-1 border border-black text-right font-black text-lg bg-black text-white">{formatPrice(total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Signatures */}
            <div className="mt-12 flex justify-between text-[10px]">
                <div className="w-1/3 text-center">
                    <div className="border-t border-black pt-2 font-bold uppercase">Cadre Réservé au Client</div>
                    <div className="mt-1 italic text-slate-500">(Lu et Approuvé)</div>
                </div>
                <div className="w-1/3 text-center">
                    <div className="border-t border-black pt-2 font-bold uppercase">Service Commercial PIX TECH</div>
                    <div className="mt-4">
                        {settings.logoUrl && <img src={settings.logoUrl} alt="Stamp" className="h-12 mx-auto opacity-20 grayscale" />}
                        <div className="font-bold mt-2">Cachet et Signature</div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center text-[8px] text-gray-400 border-t border-gray-100 pt-2">
                Ce document est une facture proforma et ne constitue pas une facture définitive. Les prix sont sujets à changement sans préavis.
            </div>
        </div>
    );

    const ThermalPreview = () => (
        <div className="bg-white text-black font-mono text-xs p-4 w-[80mm] mx-auto shadow-lg border border-slate-200 min-h-[400px] flex flex-col">
            <div className="text-center mb-4">
                <h3 className="font-bold text-lg uppercase">{settings.companyName}</h3>
                <p className="text-[10px]">DEVIS CONFIGURATION PC</p>
            </div>

            <div className="border-b border-dashed border-black mb-2"></div>

            <div className="text-[10px] mb-2">
                <div className="flex justify-between"><span>Devis #:</span><span>{build.id.slice(-6).toUpperCase()}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{new Date().toLocaleDateString()}</span></div>
                {build.customerName && <div className="flex justify-between"><span>Client:</span><span>{build.customerName}</span></div>}
            </div>

            <div className="border-b border-dashed border-black mb-2"></div>

            <div className="flex-1">
                {build.parts.map((item, i) => (
                    <div key={i} className="mb-1">
                        <div>{item.name}</div>
                        <div className="flex justify-between text-[9px] text-slate-600">
                            <span>1 x {formatPrice(item[build.priceTier || 'price1'] || 0)}</span>
                            <span className="text-black">{formatPrice(item[build.priceTier || 'price1'] || 0)}</span>
                        </div>
                    </div>
                ))}
                {build.assemblyFee > 0 && (
                    <div className="mt-1 font-bold">
                        <div className="flex justify-between">
                            <span>Montage & Tests</span>
                            <span>{formatPrice(build.assemblyFee)}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-b border-dashed border-black my-2"></div>

            <div className="flex justify-between font-bold text-sm uppercase">
                <span>Total Estimé</span>
                <span>{formatPrice(total)}</span>
            </div>

            <div className="mt-6 text-center text-[9px] italic">
                <p>Offre valable 7 jours.</p>
                <p>Merci pour votre confiance !</p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in backdrop-blur-sm print:bg-white print:p-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-xl shadow-2xl w-[95vw] sm:w-[80vw] max-w-5xl h-[75vh] sm:h-[90vh] flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-zinc-800 print:shadow-none print:h-auto print:border-none">

                {/* LEFT: Controls (Hidden on Print) */}
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-slate-200 dark:border-zinc-800 p-4 md:p-6 flex flex-col print:hidden overflow-y-auto shrink-0 md:shrink">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {t('pc.proforma_invoice')}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-gray-400">Devis pour : {build.name}</p>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Format d'Impression</label>
                            <div className="flex p-1 bg-white dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                                <button
                                    onClick={() => setMode('a4')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'a4' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600'}`}
                                >
                                    A4 Standard
                                </button>
                                <button
                                    onClick={() => setMode('thermal')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'thermal' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600'}`}
                                >
                                    Ticket (80mm)
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                                <span className="font-bold">Note :</span> Le format A4 est recommandé pour les devis professionnels de configuration PC.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 mt-auto pt-6 border-t border-slate-200 dark:border-zinc-800">
                        <button
                            onClick={handlePrint}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            {t('common.print')} {mode === 'thermal' ? 'Ticket' : 'Proforma A4'}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white font-medium"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>

                {/* RIGHT: Live Preview */}
                <div className="flex-1 bg-slate-200 dark:bg-gray-950 p-4 md:p-8 overflow-y-auto flex justify-center print:bg-white print:p-0 print:block">
                    <div className="shadow-2xl print:shadow-none transition-all duration-300 transform origin-top scale-90 md:scale-100 print:scale-100">
                        {mode === 'thermal' ? <ThermalPreview /> : <A4Preview />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProformaModal;
