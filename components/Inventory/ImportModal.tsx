import React, { useState, useContext, useRef } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { Product, ProductField } from "../../constants/inventoryFields";
import * as inventoryService from "../../services/inventoryService";
import * as aiService from "../../services/aiService";
import * as imageService from "../../services/imageService";
import ProductImagesUploader from "./ProductImagesUploader";
import ExcelJS from "exceljs";

// SheetJS loaded via CDN (kept for template generation or fallbacks if needed)
const XLSX = (window as any).XLSX;

const getFriendlyErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("API key not valid"))
      return "Invalid API Key. Please check your settings.";
    if (msg.includes("403")) return "Access Denied. API Key might be expired.";
    if (msg.includes("429")) return "Quota Exceeded. Try again later.";

    // Try to parse JSON error from Google
    try {
      // Extract JSON part if mixed with text
      const match = msg.match(/\{.*\}/);
      if (match) {
        const json = JSON.parse(match[0]);
        if (json.error && json.error.message) return json.error.message;
      }
    } catch (e) {
      /* ignore parse error */
    }

    return msg;
  }
  return "Unknown error occurred";
};

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  onRequestManualAdd: () => void;
  initialMode?: "bulk" | "ai";
}

// Helper component for editing a scanned item
const ScannedItemEditor: React.FC<{
  item: Partial<Product>;
  onChange: (updated: Partial<Product>) => void;
}> = ({ item, onChange }) => {
  const { settings, t } = useContext(SettingsContext);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const isCheckbox = (e.target as HTMLInputElement).type === "checkbox";
    const checked = (e.target as HTMLInputElement).checked;
    const finalValue =
      type === "number" ? Number(value) : isCheckbox ? checked : value;

    if (name.startsWith("customFields.")) {
      const key = name.split(".")[1];
      onChange({
        ...item,
        customFields: {
          ...(item.customFields || {}),
          [key]: finalValue,
        },
      });
    } else if (name.startsWith("warranty.")) {
      const key = name.split(".")[1];
      onChange({
        ...item,
        warranty: {
          ...(item.warranty || { enabled: false, days: 0 }),
          [key]: finalValue,
        },
      });
    } else {
      onChange({
        ...item,
        [name]: finalValue,
      });
    }
  };

  const handleImagesChange = (images: { id: string; url: string }[]) => {
    onChange({ ...item, images });
  };

  const renderField = (field: ProductField) => {
    const commonInputClasses =
      "w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600";
    // Translate label
    const displayLabel = field.isCore
      ? t(`inventory.col.${field.key}`)
      : field.label;
    const label = displayLabel.includes("inventory.col.")
      ? field.label
      : displayLabel;

    if (field.type === "warranty") {
      const isEnabled = item.warranty?.enabled || false;
      const days = item.warranty?.days || 0;
      return (
        <div
          key="warranty-field"
          className="col-span-1 sm:col-span-2 bg-slate-50/50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800/50"
        >
          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-3 tracking-widest">
            {label}
          </label>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isEnabled ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-zinc-800 group-hover:border-gray-400 dark:group-hover:border-slate-500"}`}
              >
                {isEnabled && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                name="warranty.enabled"
                checked={isEnabled}
                onChange={handleChange}
                className="hidden"
              />
              Enabled
            </label>
            {isEnabled && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                <input
                  type="number"
                  name="warranty.days"
                  value={days}
                  onChange={handleChange}
                  className={`${commonInputClasses} w-28`}
                  placeholder="Days"
                />
                <span className="text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest">
                  days
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    const fieldKey = field.isCore ? field.key : `customFields.${field.key}`;
    // Access value safely
    let fieldValue;
    if (field.isCore) {
      fieldValue = item[field.key as keyof Product];
    } else {
      fieldValue = item.customFields?.[field.key];
    }

    return (
      <div
        key={field.key}
        className={
          field.type === "longtext" ? "col-span-1 sm:col-span-2" : "col-span-1"
        }
      >
        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-widest ml-1">
          {label}
        </label>
        {field.type === "longtext" ? (
          <textarea
            name={fieldKey}
            value={(fieldValue as string) || ""}
            onChange={handleChange}
            className={`${commonInputClasses} min-h-[100px] resize-none`}
            placeholder={`Enter ${label}...`}
          />
        ) : field.type === "boolean" ? (
          <label className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${fieldValue ? "bg-blue-600 border-blue-600" : "border-slate-300 dark:border-zinc-800 group-hover:border-gray-400 dark:group-hover:border-slate-500"}`}
            >
              {fieldValue && (
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <input
              name={fieldKey}
              type="checkbox"
              checked={!!fieldValue}
              onChange={handleChange}
              className="hidden"
            />
            <span>{t("common.yes")}</span>
          </label>
        ) : (
          <input
            name={fieldKey}
            type={field.type === "number" ? "number" : "text"}
            value={fieldValue !== undefined ? fieldValue : ""}
            onChange={handleChange}
            className={commonInputClasses}
            placeholder={`Enter ${label}...`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">
          Product Images
        </h5>
        <div className="bg-slate-50/50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800/50">
          <ProductImagesUploader
            productId={item.id || "temp_scan"}
            initialImages={item.images || []}
            onChange={handleImagesChange}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 ml-1">
          Product Details
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {settings.productFields.filter((f) => !f.isVirtual).map(renderField)}
        </div>
      </div>
    </div>
  );
};

interface ImportedRowData {
  data: any[];
  images?: { blob: Blob; extension: string }[];
}

const ImportModal: React.FC<ImportModalProps> = ({
  onClose,
  onImportComplete,
  onRequestManualAdd,
  initialMode,
}) => {
  const { settings, t } = useContext(SettingsContext);
  const [step, setStep] = useState<1 | 2>(1); // 1: Selection/Upload, 2: Map/Review
  const [uploadMode, setUploadMode] = useState<"selection" | "bulk" | "ai">(
    initialMode || "selection",
  );

  // Bulk State
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportedRowData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // AI State
  const [scannedItems, setScannedItems] = useState<Partial<Product>[]>([]);
  const [selectedScannedIndex, setSelectedScannedIndex] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STEP 1: FILE HANDLING ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadMode === "bulk") processBulkFile(file);
    if (uploadMode === "ai") processAiFile(file);
  };

  const processBulkFile = async (file: File) => {
    setRawFile(file);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        setError("No worksheet found in file.");
        return;
      }

      const rows: any[][] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        // ExcelJS rows are 1-based objects, we want array
        const rowValues = row.values as any[];
        // ExcelJS values array is 1-based (index 0 is null usually), so slice(1)
        // But sometimes it depends on how it's parsed. Let's normalize.
        const cleanRow = Array.isArray(rowValues) ? rowValues.slice(1) : [];
        rows.push(cleanRow);
      });

      if (rows.length < 2) {
        setError("File appears empty or missing headers.");
        return;
      }

      const fileHeaders = rows[0].map((h) => String(h));
      const dataRows = rows.slice(1);

      // Extract Images
      const images = worksheet.getImages();
      const rowImages: Record<number, { blob: Blob; extension: string }[]> = {};

      images.forEach((img) => {
        const imgId = img.imageId;
        const media = workbook.model.media?.find(
          (m) => (m as any).index === Number(imgId),
        );

        if (media) {
          // range.tl.nativeRow is 0-indexed.
          // Header is usually Row 0 (0-indexed).
          // Data starts Row 1 (0-indexed).
          // So if image is in Row 1, it corresponds to dataRows[0].
          const rowIndex = Math.floor(img.range.tl.nativeRow); // 0-indexed row number
          const dataRowIndex = rowIndex - 1; // Subtract 1 for header row

          if (dataRowIndex >= 0) {
            const blob = new Blob([media.buffer], {
              type: `image/${media.extension}`,
            });
            if (!rowImages[dataRowIndex]) rowImages[dataRowIndex] = [];
            rowImages[dataRowIndex].push({ blob, extension: media.extension });
          }
        }
      });

      setHeaders(fileHeaders);

      // Combine data and images
      const combinedData: ImportedRowData[] = dataRows.map((row, idx) => ({
        data: row,
        images: rowImages[idx] || [],
      }));

      setParsedData(combinedData);

      // Auto-map fields
      const initialMapping: Record<string, string> = {};
      settings.productFields.forEach((field) => {
        let match = fileHeaders.find(
          (h) => h.toLowerCase() === field.label.toLowerCase(),
        );
        if (!match)
          match = fileHeaders.find(
            (h) => h.toLowerCase() === field.key.toLowerCase(),
          );
        if (!match && field.key === "price1")
          match = fileHeaders.find(
            (h) =>
              h.toLowerCase().includes("price") ||
              h.toLowerCase().includes("selling"),
          );
        if (!match && field.key === "costPrice")
          match = fileHeaders.find((h) => h.toLowerCase().includes("cost"));
        if (!match && field.key === "quantity")
          match = fileHeaders.find(
            (h) =>
              h.toLowerCase().includes("qty") ||
              h.toLowerCase().includes("stock"),
          );

        if (match) {
          initialMapping[field.key as string] = match;
        }
      });

      setFieldMapping(initialMapping);
      setStep(2);
    } catch (err) {
      console.error("Bulk Import Error:", err);
      setError("Failed to parse file. Please ensure it is a valid .xlsx file.");
    }
  };

  const processAiFile = async (file: File) => {
    setRawFile(file);
    setIsAnalyzing(true);
    try {
      const results = await aiService.scanInvoice(file);
      // Add temp IDs for image handling
      const hydratedResults = results.map((r, i) => ({
        ...r,
        id: `ai_scan_${Date.now()}_${i}`,
        images: [],
        category: r.category || "Uncategorized",
        brand: r.brand || "Generic",
      }));
      setScannedItems(hydratedResults);
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(`AI Analysis failed: ${getFriendlyErrorMessage(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      if (uploadMode === "bulk") processBulkFile(e.dataTransfer.files[0]);
      if (uploadMode === "ai") processAiFile(e.dataTransfer.files[0]);
    }
  };

  const downloadTemplate = () => {
    const headers = settings.productFields.map((f) => f.label);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "inventory_template.xlsx");
  };

  // --- STEP 2: MAPPING & IMPORT ---

  const handleMappingChange = (fieldKey: string, header: string) => {
    setFieldMapping((prev) => ({ ...prev, [fieldKey]: header }));
  };

  const handleScannedItemUpdate = (updatedItem: Partial<Product>) => {
    setScannedItems((prev) =>
      prev.map((item, idx) =>
        idx === selectedScannedIndex ? updatedItem : item,
      ),
    );
  };

  const removeScannedItem = (index: number) => {
    const newItems = scannedItems.filter((_, i) => i !== index);
    setScannedItems(newItems);
    if (selectedScannedIndex >= newItems.length)
      setSelectedScannedIndex(Math.max(0, newItems.length - 1));
  };

  const executeImport = async () => {
    setImporting(true);
    try {
      let productsToImport: Omit<Product, "id" | "createdAt" | "updatedAt">[] =
        [];

      if (uploadMode === "bulk") {
        // Using map async wrapper pattern is tricky, prefer for-loop or Promise.all
        productsToImport = await Promise.all(
          parsedData.map(async (row) => {
            const product: any = {
              images: [],
              customFields: {},
              warranty: { enabled: false, days: 0 },
            };

            settings.productFields.forEach((field) => {
              const mappedHeader = fieldMapping[field.key as string];
              if (mappedHeader) {
                const headerIndex = headers.indexOf(mappedHeader);
                if (headerIndex !== -1) {
                  let value = row.data[headerIndex];
                  // Handle types
                  if (field.type === "number") value = parseFloat(value) || 0;
                  else if (field.type === "boolean")
                    value = String(value).toLowerCase() === "true";
                  else {
                    value =
                      value === null || value === undefined
                        ? ""
                        : String(value).trim();
                  }

                  if (field.isCore) product[field.key as string] = value;
                  else product.customFields[field.key as string] = value;
                }
              }
            });

            // Handle Images
            if (row.images && row.images.length > 0) {
              try {
                const newProductId = crypto.randomUUID();
                (product as any).id = newProductId; // Force ID

                for (const img of row.images) {
                  const savedImg = await imageService.saveImage(
                    newProductId,
                    img.blob,
                  );
                  product.images.push(savedImg);
                }
              } catch (e) {
                console.error("Failed to save imported images", e);
              }
            } else {
              // If no manually assigned ID, one will be created by service/DB?
              // If I assign one above, I must ensure service respects it.
              // looking at `inventoryService.addMultipleProducts`...
              // If it ignores the ID, then my image link is broken.
              // I'll assume for now I need to Generate ID here to be safe.
              if (!(product as any).id)
                (product as any).id = crypto.randomUUID();
            }

            if (!product.name) product.name = "Unnamed Product";
            return product;
          }),
        );
      } else if (uploadMode === "ai") {
        productsToImport = scannedItems.map((item) => {
          // Clean up the temp ID and ensure required fields
          const { id, ...rest } = item;
          const product: any = {
            ...rest,
            name: item.name || "Unnamed AI Product",
            price1: item.price1 || 0,
            quantity: item.quantity || 0,
            minStock: item.minStock || 0,
            category: item.category || "Uncategorized",
            brand: item.brand || "Generic",
            customFields: item.customFields || {},
            images: item.images || [],
          };
          return product;
        });
      }

      const count =
        await inventoryService.addMultipleProducts(productsToImport);
      alert(`${t("import.success")} ${count} ${t("inventory.products")}.`);
      onImportComplete();
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        `An error occurred during import: ${getFriendlyErrorMessage(err)}`,
      );
    } finally {
      setImporting(false);
    }
  };

  const renderSelectionScreen = () => (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 h-full items-stretch justify-center p-3 sm:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-y-auto sm:overflow-visible">
      <button
        onClick={() => setUploadMode("bulk")}
        className="flex-1 flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 sm:p-8 bg-slate-50/50 dark:bg-zinc-950/40 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-[2.5rem] hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group relative overflow-hidden min-h-[80px] sm:min-h-0 text-left sm:text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex flex-row sm:flex-col items-center w-full gap-4 sm:gap-0">
          <div className="w-12 h-12 sm:w-20 sm:h-20 flex-shrink-0 bg-white dark:bg-zinc-950 rounded-xl sm:rounded-3xl flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-500 border border-slate-200 dark:border-zinc-800 group-hover:border-blue-500/30 sm:mb-6 shadow-sm dark:shadow-2xl">
            <svg
              className="w-6 h-6 sm:w-10 sm:h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-xl font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {t("import.mode.bulk")}
            </h3>
            <p className="text-[9px] sm:text-xs font-medium text-slate-500 dark:text-slate-500 mt-0.5 sm:mt-3 max-w-[200px] leading-relaxed hidden sm:block">
              {t("import.mode.bulk.desc")}
            </p>
          </div>
          <div className="hidden sm:block mt-6 sm:mt-8 px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-100 dark:bg-zinc-950 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-all">
            Choose Method
          </div>
        </div>
      </button>

      <button
        onClick={() => setUploadMode("ai")}
        className="flex-1 flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 sm:p-8 bg-slate-50/50 dark:bg-zinc-950/40 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-[2.5rem] hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-all group relative overflow-hidden min-h-[80px] sm:min-h-0 text-left sm:text-center"
      >
        <div className="absolute top-2 right-2 sm:top-6 sm:right-6 bg-purple-600 text-white text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-0.5 sm:py-1 rounded-full z-10 shadow-lg shadow-purple-600/20 animate-pulse">
          NEW
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex flex-row sm:flex-col items-center w-full gap-4 sm:gap-0">
          <div className="w-12 h-12 sm:w-20 sm:h-20 flex-shrink-0 bg-white dark:bg-zinc-950 rounded-xl sm:rounded-3xl flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:scale-110 transition-all duration-500 border border-slate-200 dark:border-zinc-800 group-hover:border-purple-500/30 sm:mb-6 shadow-sm dark:shadow-2xl">
            <svg
              className="w-6 h-6 sm:w-10 sm:h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-xl font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {t("import.mode.ai")}
            </h3>
            <p className="text-[9px] sm:text-xs font-medium text-slate-500 dark:text-slate-500 mt-0.5 sm:mt-3 max-w-[200px] leading-relaxed hidden sm:block">
              {t("import.mode.ai.desc")}
            </p>
          </div>
          <div className="hidden sm:block mt-6 sm:mt-8 px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-100 dark:bg-zinc-950 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-all">
            Try AI Magic
          </div>
        </div>
      </button>

      <button
        onClick={onRequestManualAdd}
        className="flex-1 flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 sm:p-8 bg-slate-50/50 dark:bg-zinc-950/40 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl sm:rounded-[2.5rem] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group relative overflow-hidden min-h-[80px] sm:min-h-0 text-left sm:text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10 flex flex-row sm:flex-col items-center w-full gap-4 sm:gap-0">
          <div className="w-12 h-12 sm:w-20 sm:h-20 flex-shrink-0 bg-white dark:bg-zinc-950 rounded-xl sm:rounded-3xl flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-500 border border-slate-200 dark:border-zinc-800 group-hover:border-emerald-500/30 sm:mb-6 shadow-sm dark:shadow-2xl">
            <svg
              className="w-6 h-6 sm:w-10 sm:h-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm sm:text-xl font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              {t("import.mode.manual")}
            </h3>
            <p className="text-[9px] sm:text-xs font-medium text-slate-500 mt-0.5 sm:mt-3 max-w-[200px] leading-relaxed hidden sm:block">
              {t("import.mode.manual.desc")}
            </p>
          </div>
          <div className="hidden sm:block mt-6 sm:mt-8 px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-100 dark:bg-zinc-950 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-zinc-800 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-all">
            Add Manually
          </div>
        </div>
      </button>
    </div>
  );

  const renderAiReview = () => {
    const selectedItem = scannedItems[selectedScannedIndex];

    return (
      <div className="flex flex-col sm:flex-row h-full gap-6 sm:gap-8 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Left: List */}
        <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-zinc-800/60 pb-4 sm:pb-0 sm:pr-6 flex flex-col h-[40%] sm:h-full flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
              {t("common.selected")}
            </h4>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-950 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-800">
              {scannedItems.length} Items
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {scannedItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedScannedIndex(idx)}
                className={`p-4 rounded-[1.5rem] border cursor-pointer transition-all relative group ${
                  idx === selectedScannedIndex
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
                    : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950/50"
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold text-xs truncate tracking-tight ${idx === selectedScannedIndex ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"}`}
                    >
                      {item.name || "Unnamed Product"}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-500 truncate mt-0.5 tracking-wider uppercase">
                      {item.sku || "No SKU"}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeScannedItem(idx);
                    }}
                    className="text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-3 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500 dark:text-slate-500">
                    QTY:{" "}
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </span>
                  </span>
                  <span
                    className={
                      idx === selectedScannedIndex
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300"
                    }
                  >
                    {item.price1?.toFixed(2)} {settings.currencySymbol}
                  </span>
                </div>
                {item.customFields?.aiConfidence !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${Number(item.customFields.aiConfidence) > 80 ? "bg-emerald-500" : Number(item.customFields.aiConfidence) > 50 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, Number(item.customFields.aiConfidence)))}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500">
                      {item.customFields.aiConfidence}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Editor */}
        <div className="w-full sm:w-2/3 flex flex-col h-[60%] sm:h-full">
          {scannedItems.length > 0 ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">
                  {t("common.edit")}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500">
                    Item {selectedScannedIndex + 1} of {scannedItems.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-800 rounded-[2rem] p-4 sm:p-6">
                  <ScannedItemEditor
                    item={selectedItem}
                    onChange={handleScannedItemUpdate}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 bg-slate-50/50 dark:bg-zinc-950/20 border border-dashed border-slate-200 dark:border-zinc-800 rounded-[2.5rem]">
              <svg
                className="w-16 h-16 mb-4 opacity-20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40">
                No products scanned
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-zinc-950/90 z-[100] flex items-center justify-center p-0 md:p-4 backdrop-blur-xl animate-fade-in md:pt-4 pt-safe">
      <div
        className={`bg-white dark:bg-zinc-950 rounded-none md:rounded-[2.5rem] shadow-2xl w-full h-[100dvh] md:w-[60vw] md:h-auto md:max-h-[85vh] ${step === 2 && uploadMode === "ai" ? "max-w-5xl" : "max-w-3xl"} border-0 md:border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden relative`}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-zinc-800/60 flex justify-between items-center bg-white/80 dark:bg-zinc-950/80 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-100 dark:bg-purple-600/10 flex items-center justify-center text-purple-600 dark:text-purple-500 border border-purple-200 dark:border-purple-500/20">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-50 tracking-tight">
                {uploadMode === "ai" && step === 2
                  ? t("import.review")
                  : t("import.title")}
              </h2>
              <p className="text-[9px] sm:text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                {uploadMode === "ai" && step === 2
                  ? t("import.mode.ai.desc")
                  : t("import.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 rounded-full text-slate-500 dark:text-slate-400 transition-all"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar pb-24 sm:pb-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs font-medium">{error}</span>
            </div>
          )}

          {step === 1 && uploadMode === "selection" && renderSelectionScreen()}

          {/* BULK UPLOAD */}
          {step === 1 && uploadMode === "bulk" && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-6 duration-500 h-full flex flex-col justify-center max-w-xl mx-auto">
              <div className="flex justify-start">
                <button
                  onClick={() => setUploadMode("selection")}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 transition-colors"
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
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  {t("import.back")}
                </button>
              </div>

              <div
                className="border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 rounded-[2.5rem] p-12 hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all cursor-pointer group relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-20 h-20 mx-auto bg-white dark:bg-zinc-950 rounded-3xl flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-500 border border-slate-200 dark:border-zinc-800 group-hover:border-blue-500/30 mb-6 shadow-sm dark:shadow-2xl">
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {t("import.drag_drop")}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                    {t("import.mode.bulk.desc")}
                  </p>
                  <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-all">
                    Browse Files
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xls, .xlsx"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-colors"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {t("import.template")}
                </button>
              </div>
            </div>
          )}

          {/* AI UPLOAD / ANALYZING */}
          {step === 1 && uploadMode === "ai" && (
            <div className="space-y-8 text-center animate-in fade-in slide-in-from-bottom-6 duration-500 h-full flex flex-col justify-center max-w-xl mx-auto">
              <div className="flex justify-start">
                <button
                  onClick={() => !isAnalyzing && setUploadMode("selection")}
                  disabled={isAnalyzing}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-2 transition-colors disabled:opacity-20"
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
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  {t("import.back")}
                </button>
              </div>

              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center space-y-6 py-12">
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-[2rem] border-4 border-slate-200 dark:border-zinc-800 opacity-50"></div>
                    <div className="absolute inset-0 rounded-[2rem] border-4 border-purple-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-purple-500 animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                      {t("import.analyzing")}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-500 tracking-wide">
                      Extracting products, prices, and specs via AI...
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 rounded-[2.5rem] p-12 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/5 transition-all cursor-pointer group relative overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto bg-white dark:bg-zinc-950 rounded-3xl flex items-center justify-center text-gray-400 dark:text-slate-500 group-hover:text-purple-500 group-hover:scale-110 transition-all duration-500 border border-slate-200 dark:border-zinc-800 group-hover:border-purple-500/30 mb-6 shadow-sm dark:shadow-2xl">
                      <svg
                        className="w-10 h-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {t("import.mode.ai.desc")}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
                      Upload an invoice or product list image, and our AI will
                      extract the data automatically.
                    </p>
                    <div className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 group-hover:bg-slate-200 dark:group-hover:bg-slate-800 transition-all">
                      Select Image or PDF
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*, application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>
          )}

          {/* BULK MAPPING */}
          {step === 2 && uploadMode === "bulk" && (
            <div className="space-y-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-500">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                  {t("import.mapping")}
                </h3>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-zinc-950 px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-800">
                  {headers.length} Columns Detected
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {settings.productFields.map((field) => (
                  <div
                    key={field.key}
                    className="bg-slate-50/50 dark:bg-zinc-950/50 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800/50 group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-widest ml-1">
                      {t(`inventory.col.${field.key}`) || field.label}{" "}
                      {field.key === "name" && (
                        <span className="text-red-500">*</span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={fieldMapping[field.key as string] || ""}
                        onChange={(e) =>
                          handleMappingChange(
                            field.key as string,
                            e.target.value,
                          )
                        }
                        className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-slate-200 text-xs font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="">(Skip Field)</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-slate-500">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-hidden mt-4 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 ml-1">
                  {t("import.preview")}
                </h4>
                <div className="overflow-auto border border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950/30">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-zinc-950/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest">
                          Image
                        </th>
                        {settings.productFields.slice(0, 5).map((f) => (
                          <th
                            key={f.key}
                            className="px-4 py-3 text-left text-[10px] font-black text-slate-800 dark:text-gray-300 uppercase tracking-widest"
                          >
                            {t(`inventory.col.${f.key}`) || f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
                      {parsedData.slice(0, 3).map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {row.images && row.images.length > 0 ? (
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                                <svg
                                  className="w-5 h-5 text-blue-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-gray-400 dark:text-slate-600">
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
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              </div>
                            )}
                          </td>
                          {settings.productFields.slice(0, 5).map((f) => {
                            const header = fieldMapping[f.key as string];
                            const headerIdx = headers.indexOf(header);
                            const val =
                              headerIdx !== -1 ? row.data[headerIdx] : "-";
                            return (
                              <td
                                key={f.key}
                                className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                              >
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* AI REVIEW */}
          {step === 2 && uploadMode === "ai" && renderAiReview()}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md flex flex-col-reverse sm:flex-row justify-between gap-4 sticky bottom-0 z-30">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="w-full sm:w-auto px-8 py-4 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-zinc-800 active:scale-95 text-center"
            >
              {t("import.back")}
            </button>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          {step === 2 && (
            <button
              onClick={executeImport}
              disabled={
                importing || (uploadMode === "ai" && scannedItems.length === 0)
              }
              className="w-full sm:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)] font-black uppercase tracking-widest text-xs hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3 text-center disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {importing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>
                    {t("import.start")} (
                    {uploadMode === "ai"
                      ? scannedItems.length
                      : parsedData.length}
                    )
                  </span>
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
              `}</style>
    </div>
  );
};

export default ImportModal;
