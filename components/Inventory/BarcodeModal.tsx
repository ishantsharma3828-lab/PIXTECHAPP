import React, { useState, useEffect, useContext, useRef } from "react";
import { Product } from "../../constants/inventoryFields";
import { SettingsContext } from "../../contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";

interface BarcodeModalProps {
  products: Product[];
  onClose: () => void;
}

type LayoutType = "thermal_2x1" | "thermal_4x6" | "a4_30up";

interface LayoutConfig {
  id: LayoutType;
  name: string;
  // Dimensions for the preview container
  width: string;
  height: string;
  // Class for the grid/flex container holding labels
  containerClass: string;
  // Class for the individual label item
  itemClass: string;
}

const LAYOUTS: LayoutConfig[] = [
  {
    id: "thermal_2x1",
    name: 'Thermal Sticker (2" x 1")',
    width: "50mm",
    height: "25mm",
    containerClass: "flex flex-wrap gap-1 justify-center p-2",
    // Fixed dimensions for print
    itemClass: "w-[50mm] h-[25mm] overflow-hidden bg-white",
  },
  {
    id: "thermal_4x6",
    name: 'Shipping Label (4" x 6")',
    width: "100mm",
    height: "150mm",
    containerClass: "flex flex-wrap gap-2 justify-center p-4",
    itemClass: "w-[100mm] h-[150mm] overflow-hidden bg-white",
  },
  {
    id: "a4_30up",
    name: "A4 Sheet (30-up Address)",
    width: "210mm",
    height: "297mm",
    // Using a slightly constrained width (200mm) inside the 210mm page to prevent column drop
    containerClass:
      "grid grid-cols-3 gap-0 p-[5mm] w-[210mm] min-h-[297mm] bg-white shadow-lg mx-auto content-start",
    itemClass:
      "h-[25.4mm] w-[64mm] overflow-hidden outline outline-1 outline-gray-100 bg-white",
  },
];

const BarcodeModal: React.FC<BarcodeModalProps> = ({ products, onClose }) => {
  const { settings, t } = useContext(SettingsContext);
  const [selectedLayout, setSelectedLayout] =
    useState<LayoutType>("thermal_2x1");
  const [copies, setCopies] = useState<number>(1);

  // Content Options
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [namePosition, setNamePosition] = useState<"top" | "bottom">("bottom");
  const [showSku, setShowSku] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [invertLogo, setInvertLogo] = useState(false);

  const activeLayout =
    LAYOUTS.find((l) => l.id === selectedLayout) || LAYOUTS[0];
  const isRightSideCurrency =
    settings.currencySymbol === "DA" || settings.currencySymbol === "DZD";

  // Safe String Helper - moved out to ensure stability
  const safeString = (val: any, fallback = ""): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "string") {
      if (val.includes("[object Object]")) return fallback;
      return val;
    }
    if (typeof val === "number") return String(val);
    if (typeof val === "object") return fallback;
    return String(val);
  };

  useEffect(() => {
    // Debounce barcode generation to allow DOM to settle
    const timer = setTimeout(() => {
      if ((window as any).JsBarcode) {
        try {
          const elements = document.querySelectorAll(".barcode-svg");
          elements.forEach((el) => {
            const value = el.getAttribute("data-value");
            if (value && value.trim().length > 0) {
              (window as any).JsBarcode(el, value, {
                format: "CODE128",
                lineColor: "#000000",
                background: "rgba(0,0,0,0)", // Transparent bg
                width: selectedLayout === "a4_30up" ? 1.3 : 2,
                height: 100, // We control height via CSS max-height
                displayValue: false, // DO NOT DISPLAY TEXT
                text: " ", // FORCE EMPTY TEXT if displayValue is ignored
                margin: 0,
              });
            }
          });
        } catch (e) {
          console.error("Barcode generation failed", e);
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [
    selectedLayout,
    copies,
    products,
    showPrice,
    showName,
    showSku,
    showLogo,
    namePosition,
    invertLogo,
  ]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.error("Print failed", e);
      alert("Failed to open print dialog.");
    }
  };

  const itemsToPrint = products.flatMap((p) => Array(copies).fill(p));

  const renderLabel = (product: Product, index: number) => {
    const rawPrice = typeof product.price1 === "number" ? product.price1 : 0;
    const priceDisplay = isRightSideCurrency
      ? `${rawPrice.toFixed(2)} ${settings.currencySymbol}`
      : `${settings.currencySymbol}${rawPrice.toFixed(2)}`;

    const safeName = safeString(product.name, "Item");
    let rawSku = safeString(product.sku);
    if (!rawSku || rawSku.trim() === "") rawSku = safeString(product.id);
    const safeSku = rawSku;

    const hasLogo = showLogo && settings.logoUrl;
    const hasTopName = showName && namePosition === "top";

    // Layout Styles
    const headerHeight = hasLogo
      ? hasTopName
        ? "35%"
        : "30%"
      : hasTopName
        ? "15%"
        : "0%";
    const footerHeight = showName && namePosition === "bottom" ? "25%" : "15%";

    return (
      <div
        key={`${product.id}-${index}`}
        className={`flex flex-col justify-between items-center p-[2px] relative box-border ${activeLayout.itemClass}`}
        style={{ breakInside: "avoid" }}
      >
        {/* 1. HEADER ZONE (Fixed Max Height) */}
        <div
          className="w-full flex flex-col items-center justify-center overflow-hidden flex-shrink-0"
          style={{
            maxHeight: headerHeight,
            minHeight: hasTopName ? "10px" : "0",
          }}
        >
          {hasLogo && (
            <img
              src={settings.logoUrl}
              alt=""
              className="object-contain"
              style={{
                height: hasTopName ? "70%" : "100%",
                maxWidth: "90%",
                filter: invertLogo ? "invert(1)" : "none",
                marginBottom: hasTopName ? "1px" : "0",
              }}
            />
          )}
          {hasTopName && (
            <div
              className="font-bold text-black leading-none w-full truncate px-1 text-center"
              style={{ fontSize: "9px" }}
            >
              {safeName}
            </div>
          )}
        </div>

        {/* 2. BODY ZONE (Barcode - Flexible) */}
        {/* min-h-0 allows it to shrink if logo is huge */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0 overflow-hidden py-[1px]">
          <svg
            className="barcode-svg"
            data-value={safeSku}
            style={{
              width: "95%",
              height: "100%",
              maxHeight: "100%",
              display: "block", // Fix SVG whitespace
            }}
            preserveAspectRatio="none"
          ></svg>
        </div>

        {/* 3. FOOTER ZONE (Fixed Height at Bottom) */}
        <div
          className="w-full px-1 flex-shrink-0 flex flex-col justify-end"
          style={{ minHeight: "10px", maxHeight: footerHeight }}
        >
          {showName && namePosition === "bottom" && (
            <div
              className="font-bold text-black leading-none w-full truncate text-center mb-[1px]"
              style={{ fontSize: "9px" }}
            >
              {safeName}
            </div>
          )}

          <div className="flex justify-between items-end w-full pt-[1px] border-t border-slate-300">
            {showSku && (
              <span
                className="font-mono text-slate-800 truncate max-w-[60%] leading-none"
                style={{ fontSize: "8px" }}
              >
                {safeSku}
              </span>
            )}
            {showPrice && (
              <span
                className="font-bold text-black leading-none ml-auto"
                style={{ fontSize: "10px" }}
              >
                {priceDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex sm:items-center justify-center p-0 sm:p-4 print:hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
          onClick={onClose}
        />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-white dark:bg-zinc-950 rounded-t-[32px] sm:rounded-[28px] w-full sm:max-w-6xl max-h-[90dvh] h-[90dvh] sm:h-auto sm:max-h-[85vh] shadow-2xl absolute bottom-0 sm:relative z-10 border-t sm:border border-slate-100 dark:border-zinc-800 flex flex-col pointer-events-auto overflow-hidden mt-auto sm:mt-0"
        >
          {/* Mobile Handle */}
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mt-4 mb-2 sm:hidden shrink-0"></div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 pt-2 border-b border-gray-100 dark:border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[14px] bg-blue-50 dark:bg-blue-600/10 flex items-center justify-center text-blue-600 dark:text-blue-500 border border-blue-100 dark:border-blue-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v1m6 11h2m-6.5-1.5l-3.879 3.879A2 2 0 016.025 20H5a2 2 0 01-2-2V6a2 2 0 012-2h1.025a2 2 0 011.414.586l3.88 3.879M12 4h6a2 2 0 012 2v6m-3-3h3m-3 3v3"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                  {t("barcode.title")}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Printing {itemsToPrint.length} labels
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 rounded-full hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
            {/* Controls Sidebar */}
            <div className="w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-zinc-800/60 p-6 flex flex-col space-y-6 overflow-y-auto custom-scrollbar shrink-0">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                  {t("barcode.layout")}
                </label>
                <select
                  style={{ WebkitAppearance: "none" }}
                  value={selectedLayout}
                  onChange={(e) =>
                    setSelectedLayout(e.target.value as LayoutType)
                  }
                  className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  {LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                  {t("barcode.copies")}
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) =>
                      setCopies(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                  Design Options
                </label>
                <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-[18px] border border-slate-200 dark:border-zinc-800/50 p-4 space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      Show Logo
                    </span>
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={() => setShowLogo(!showLogo)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                  </label>

                  {showLogo && (
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-4 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        Invert Logo Colors
                      </span>
                      <input
                        type="checkbox"
                        checked={invertLogo}
                        onChange={() => setInvertLogo(!invertLogo)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-colors"
                      />
                    </label>
                  )}

                  <div className="border-t border-slate-200 dark:border-zinc-800/50 my-2"></div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                        {t("barcode.show_name")}
                      </span>
                      <input
                        type="checkbox"
                        checked={showName}
                        onChange={() => setShowName(!showName)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-colors"
                      />
                    </label>

                    {showName && (
                      <div className="flex items-center justify-between pl-4">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          Position
                        </span>
                        <select
                          style={{ WebkitAppearance: "none" }}
                          className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none"
                          value={namePosition}
                          onChange={(e) =>
                            setNamePosition(e.target.value as "top" | "bottom")
                          }
                        >
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 dark:border-zinc-800/50 my-2"></div>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {t("barcode.show_price")}
                    </span>
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={() => setShowPrice(!showPrice)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                  </label>

                  <div className="border-t border-slate-200 dark:border-zinc-800/50 my-2"></div>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {t("barcode.show_sku")}
                    </span>
                    <input
                      type="checkbox"
                      checked={showSku}
                      onChange={() => setShowSku(!showSku)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-blue-600 focus:ring-blue-500 transition-colors"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-slate-100 dark:bg-zinc-950/50 p-4 sm:p-8 overflow-auto flex justify-center items-start custom-scrollbar">
              <div
                key={selectedLayout}
                className="bg-white shadow-xl transition-all duration-300 origin-top rounded-sm"
                style={{
                  width: selectedLayout === "a4_30up" ? "210mm" : "auto",
                  minHeight: "150px",
                }}
              >
                <div className={activeLayout.containerClass}>
                  {itemsToPrint.map((p, i) => renderLabel(p, i))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md flex flex-col-reverse sm:flex-row justify-between gap-3 shrink-0 pb-safe">
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all border border-slate-200 dark:border-zinc-800"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-blue-600 text-white rounded-2xl shadow-[0_4px_12px_rgba(59,130,246,0.3)] font-bold text-xs hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Labels
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hidden Printable Area */}
      <div id="printable-area" className="hidden print:block bg-white">
        <div
          className={
            selectedLayout === "a4_30up"
              ? activeLayout.containerClass
              : "flex flex-wrap gap-1 p-0 m-0"
          }
        >
          {itemsToPrint.map((p, i) => renderLabel(p, i))}
        </div>
      </div>

      <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        visibility: hidden;
                    }
                    /* Hide the React Root to ensure no leaks */
                    #root {
                        display: none !important;
                    }
                    /* Force display the printable area */
                    #printable-area {
                        visibility: visible !important;
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        overflow: visible;
                    }
                    #printable-area * {
                        visibility: visible !important;
                    }
                    .page-break-after-always {
                        page-break-after: always;
                    }
                    .break-inside-avoid {
                        break-inside: avoid;
                    }
                }
                .form-select, .form-input {
                  border-radius: 0.75rem; /* rounded-xl */
                  padding: 0.625rem 1rem;
                  transition: all 0.2s;
                }
                .form-select:focus, .form-input:focus {
                  outline: none;
                  border-color: #3b82f6; /* blue-500 */
                  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                  height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: rgba(51, 65, 85, 0.5);
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: rgba(71, 85, 105, 0.8);
                }
            `}</style>
    </AnimatePresence>
  );
};

export default BarcodeModal;
