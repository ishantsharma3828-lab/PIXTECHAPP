import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useContext,
  useRef,
} from "react";
import * as inventoryService from "../../services/inventoryService";
import * as authService from "../../services/authService";
import * as exportService from "../../services/exportService";
import { Product, ProductField } from "../../constants/inventoryFields";
import { applyFilters, Filters } from "../../utils/searchAndFilter";
import { SettingsContext } from "../../contexts/SettingsContext";
import ProductCard from "./ProductCard";
import ProductListRow from "./ProductListRow";
import SelectionBar from "./SelectionBar";
import TrashModal from "./TrashModal";
import ProductModal from "./ProductModal";
import BatchEditModal from "./BatchEditModal";
import ExportConfigModal, { ExportOptions } from "./ExportConfigModal";
import ImportModal from "./ImportModal";
import BarcodeModal from "./BarcodeModal";
import AddProductOptionsModal from "./AddProductOptionsModal";
import { usePermissions } from "../../hooks/usePermissions";

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

type ViewMode = "large" | "medium" | "small" | "list";
export interface ColumnDefinition extends Omit<
  ProductField,
  "isCore" | "isVisible"
> {
  className?: string; // Optional custom class for styling
  sortable?: boolean;
  width?: string;
  isCore?: boolean;
  isVisible?: boolean;
  hideOnMobile?: boolean;
}

const InventoryPanel: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<"bulk" | "ai">("bulk");
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isAddOptionsModalOpen, setIsAddOptionsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // RBAC via centralised hook
  const {
    canAddProduct, canEditProduct, canDeleteProduct,
    canImportProducts, canBulkEdit, canBulkDelete,
    visiblePrices, showStock,
    isSpecialClient, isManager,
  } = usePermissions();

  const user = authService.getCurrentUser();
  const role = user?.role || 'customer';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [productsToPrint, setProductsToPrint] = useState<Product[]>([]);

  const [filters, setFilters] = useState<Filters>({
    searchQuery: '', category: 'all', brand: 'all', stockStatus: 'all',
    dateRange: { startDate: '', endDate: '' }, priceRange: { min: 0, max: 0 },
  });
  const debouncedSearchQuery = useDebounce(filters.searchQuery, 300);

  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | 'stockStatus'; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const prevMaxPriceRef = useRef(0);

  const { settings, t, currentColors } = useContext(SettingsContext);

  const isRightSideCurrency =
    settings.currencySymbol === "DA" || settings.currencySymbol === "DZD";

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const products = await inventoryService.getProducts();
      setAllProducts(products);
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err); // Capture actual error
      setError(`Failed to fetch products: ${msg}`);
      console.error("Fetch Error Details:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    // Check for productId in URL to auto-open product details
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const productId = params.get("productId");
    if (productId) {
      // We need to wait for products to load, or find it in the fetched list
      // Since fetchProducts is async, we might need to rely on allProducts effect
    }
  }, [fetchProducts]);

  // Effect to handle deep linking to product after products are loaded
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1]);
    const productId = params.get("productId");
    if (productId && allProducts.length > 0) {
      const found = allProducts.find((p) => p.id === productId);
      if (found) {
        setEditingProduct(found);
        setIsProductModalOpen(true);
        // Clear the param so it doesn't reopen on refresh/re-render causing loops
        // window.history.replaceState(null, '', window.location.hash.split('?')[0]);
      }
    }
  }, [allProducts]);

  const maxPrice = useMemo(() => {
    if (allProducts.length === 0) return 1000;
    return Math.ceil(Math.max(...allProducts.map((p) => p.price1)));
  }, [allProducts]);

  useEffect(() => {
    if (maxPrice > 0) {
      if (filters.priceRange.max === 0) {
        // Initial load
        setFilters((f) => ({
          ...f,
          priceRange: { ...f.priceRange, max: maxPrice },
        }));
      } else if (maxPrice > prevMaxPriceRef.current) {
        // If new max is higher than old max (e.g. added expensive item)
        // And the current filter was covering the old full range (or more)
        // Then update filter to cover new full range so the new item isn't hidden
        if (filters.priceRange.max >= prevMaxPriceRef.current) {
          setFilters((f) => ({
            ...f,
            priceRange: { ...f.priceRange, max: maxPrice },
          }));
        }
      }
    }
    prevMaxPriceRef.current = maxPrice;
  }, [maxPrice, filters.priceRange.max]);

  const filteredProducts = useMemo(() => {
    const debouncedFilters = { ...filters, searchQuery: debouncedSearchQuery };
    const result = applyFilters(allProducts, debouncedFilters);

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Product];
        let bValue: any = b[sortConfig.key as keyof Product];

        // Specific handling for stockStatus ('inStock', 'lowStock', 'outOfStock') derived logic?
        // Or actually calling it by quantity? Usually we sort columns by data.
        if (sortConfig.key === "stockStatus") {
          aValue = a.quantity; // Simplification: sort by quantity for status
          bValue = b.quantity;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allProducts, filters, debouncedSearchQuery, sortConfig]);

  const handleSort = (key: keyof Product | "stockStatus") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const showFeedback = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const executeExport = async (options: ExportOptions) => {
    setIsExportModalOpen(false);
    try {
      await exportService.generateCustomCatalog(
        filteredProducts,
        settings,
        options,
        currentColors,
      );
      showFeedback("Catalog exported successfully!", "success");
    } catch (err) {
      console.error(err);
      showFeedback("Failed to export catalog.", "error");
    }
  };

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFilters((prev) => ({
        // @ts-ignore
        ...prev,
        // @ts-ignore
        [parent]: {
          ...prev[parent],
          [child]: valueAsNumberIfApplicable(child, value),
        },
      }));
    } else {
      setFilters((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleClearFilters = () => {
    setFilters((prev) => ({
      ...prev,
      category: "all",
      brand: "all",
      stockStatus: "all",
      dateRange: { startDate: "", endDate: "" },
      priceRange: { min: 0, max: maxPrice },
    }));
  };

  const valueAsNumberIfApplicable = (fieldName: string, value: string) => {
    if (["min", "max"].includes(fieldName)) {
      return Number(value);
    }
    return value;
  };

  const uniqueCategories = useMemo(
    () => ["all", ...Array.from(new Set(allProducts.map((p) => p.category)))],
    [allProducts],
  );
  const uniqueBrands = useMemo(
    () => ["all", ...Array.from(new Set(allProducts.map((p) => p.brand)))],
    [allProducts],
  );

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(productId)) {
        newSelected.delete(productId);
      } else {
        newSelected.add(productId);
      }
      return newSelected;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allVisibleIds = new Set(filteredProducts.map((p) => p.id));
    const selectedVisibleIds = new Set(
      [...selectedProducts].filter((id) => allVisibleIds.has(id)),
    );

    if (
      selectedVisibleIds.size === allVisibleIds.size &&
      allVisibleIds.size > 0
    ) {
      setSelectedProducts((prev) => {
        const newSelected = new Set(prev);
        allVisibleIds.forEach((id) => newSelected.delete(id));
        return newSelected;
      });
    } else {
      setSelectedProducts((prev) => new Set([...prev, ...allVisibleIds]));
    }
  }, [filteredProducts, selectedProducts]);

  const allVisibleProductIds = useMemo(
    () => new Set(filteredProducts.map((p) => p.id)),
    [filteredProducts],
  );
  const selectedVisibleProductIds = useMemo(
    () =>
      new Set(
        [...selectedProducts].filter((id) => allVisibleProductIds.has(id)),
      ),
    [selectedProducts, allVisibleProductIds],
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const allVisibleCount = allVisibleProductIds.size;
      const selectedVisibleCount = selectedVisibleProductIds.size;

      if (allVisibleCount > 0 && selectedVisibleCount === allVisibleCount) {
        selectAllCheckboxRef.current.checked = true;
        selectAllCheckboxRef.current.indeterminate = false;
      } else if (selectedVisibleCount > 0) {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = true;
      } else {
        selectAllCheckboxRef.current.checked = false;
        selectAllCheckboxRef.current.indeterminate = false;
      }
    }
  }, [selectedVisibleProductIds, allVisibleProductIds]);

  const handleClearSelection = () => setSelectedProducts(new Set());

  const handleBatchEdit = () => {
    setIsBatchEditModalOpen(true);
  };

  const handleMoveProductsToTrash = async (productIds: string[]) => {
    try {
      await inventoryService.moveProductsToTrash(productIds);
      setAllProducts((currentProducts) =>
        currentProducts.filter((p) => !productIds.includes(p.id)),
      );
      setSelectedProducts((currentSelected) => {
        const newSelected = new Set(currentSelected);
        productIds.forEach((id) => newSelected.delete(id));
        return newSelected;
      });
    } catch (err) {
      setError("Failed to move items to trash.");
      console.error(err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsAddOptionsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handlePrintBarcode = (product: Product) => {
    setProductsToPrint([product]);
    setIsBarcodeModalOpen(true);
  };

  const handleBatchPrintBarcode = () => {
    const items = allProducts.filter((p) => selectedProducts.has(p.id));
    setProductsToPrint(items);
    setIsBarcodeModalOpen(true);
  };

  const handleProductSave = async (savedProduct: Product) => {
    await fetchProducts();
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleBatchSave = async (result: {
    successCount: number;
    failureCount: number;
  }) => {
    setIsBatchEditModalOpen(false);
    showFeedback(
      `Batch update complete: ${result.successCount} succeeded, ${result.failureCount} failed.`,
    );
    setSelectedProducts(new Set());
    await fetchProducts();
  };

  const handleApproveProduct = async (product: Product) => {
    try {
      await inventoryService.updateProduct(product.id, {
        approvalStatus: "approved",
      });
      showFeedback("Product approved.", "success");
      fetchProducts();
    } catch (e) {
      showFeedback("Approval failed.", "error");
    }
  };

  const listColumns = useMemo((): ColumnDefinition[] => {
    let cols: ColumnDefinition[] = [
      { key: "images", label: "", type: "image", width: "48px", isCore: true },
      { key: "name", label: t("inventory.col.name"), type: "text", sortable: true, className: "font-semibold text-slate-900 dark:text-white truncate", width: "minmax(0, 3fr)", isCore: true },
      { key: "sku", label: t("inventory.col.sku"), type: "text", sortable: true, className: "font-mono text-xs text-slate-500 truncate", width: "minmax(0, 1.2fr)", isCore: true, hideOnMobile: true },
      { key: "category", label: t("inventory.col.category"), type: "badge", sortable: true, width: "minmax(0, 1.2fr)", isCore: true, hideOnMobile: true },
      { key: "brand", label: t("inventory.col.brand"), type: "text", sortable: true, width: "minmax(0, 1fr)", isCore: true, hideOnMobile: true },
      // Stock qty — hidden for special_client
      ...(showStock ? [{ key: "quantity", label: t("inventory.col.qty"), type: "number", sortable: true, className: "font-bold text-center", width: "minmax(40px, 0.6fr)", isCore: true } as ColumnDefinition] : []),
      { key: "price1", label: t("inventory.col.price"), type: "currency", sortable: true, className: "font-bold text-right text-[var(--color-primary)]", width: "minmax(50px, 0.8fr)", isCore: true },
      // Stock status badge — hidden for special_client
      ...(showStock ? [{ key: "stockStatus", label: t("inventory.col.status"), type: "badge", sortable: true, className: "text-center", width: "minmax(0, 0.8fr)", isCore: true, hideOnMobile: true } as ColumnDefinition] : []),
      { key: "warranty", label: t("inventory.col.warranty"), type: "text", className: "text-center", width: "minmax(0, 0.6fr)", isCore: true, hideOnMobile: true },
    ];

    // Inject visible Custom Fields
    const customFields = (settings?.productFields || [])
      .filter((f) => f.isVisible && !f.isCore)
      .filter((f) => {
        const keyStr = f.key as string;
        if (keyStr === 'costPrice' && !visiblePrices.includes('cost_price')) return false;
        if (['price2', 'price3', 'price4'].includes(keyStr) && !visiblePrices.includes(keyStr as any)) return false;
        if (['quantity', 'minStock'].includes(keyStr) && !showStock) return false;
        return true;
      })
      .map((f) => ({ key: f.key, label: f.label, type: f.type, sortable: true, width: "minmax(0, 1fr)", isCore: false, hideOnMobile: true }));
    cols = [...cols, ...customFields];

    cols.push({ key: "actions", label: t("common.actions"), type: "actions", width: "80px", isCore: true, hideOnMobile: true });

    return cols;
  }, [t, showStock, settings?.productFields]);

  // Generate Grid Template String dynamically
  const gridTemplateStyle = useMemo(() => {
    const templateDesktop = listColumns.map((c) => c.width || "1fr").join(" ");
    const templateMobile = listColumns
      .filter((c) => !c.hideOnMobile)
      .map((c) => c.width || "1fr")
      .join(" ");
    return {
      "--grid-cols-desktop": templateDesktop,
      "--grid-cols-mobile": templateMobile,
    } as React.CSSProperties;
  }, [listColumns]);

  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const renderHeader = () => (
    <div className="mb-2 sm:mb-6 sticky top-[-16px] sm:top-[-24px] md:top-[-32px] pt-[16px] sm:pt-[24px] md:pt-[32px] z-30 backdrop-blur-xl bg-slate-50/90 dark:bg-zinc-950/90 pb-2 -mx-4 px-4 md:mx-0 md:px-0 shadow-sm border-b border-transparent dark:border-transparent sm:border-slate-200/50 sm:dark:border-zinc-800/50 flex flex-col md:gap-4 gap-1.5 transition-all">
      {/* Title */}
      <div className="flex items-center justify-between hidden sm:flex">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mr-2 truncate">
          {t("inventory.title")}
        </h1>
      </div>

      <div className="flex flex-row md:flex-col gap-1.5 md:gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-2 sm:pl-4 flex items-center pointer-events-none">
              <svg
                className="h-3 w-3 sm:h-5 sm:w-5 text-slate-400 dark:text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              name="searchQuery"
              value={filters.searchQuery}
              onChange={handleFilterChange}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1.5 sm:py-3 sm:pl-12 sm:pr-4 border border-slate-200 dark:border-zinc-800 rounded sm:rounded-xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 text-[10px] sm:text-sm transition-all shadow-none sm:shadow-sm h-full"
            />
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between w-auto md:w-full shrink-0">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-1 px-1.5 py-1.5 sm:px-2 sm:py-1.5 rounded text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 transition-colors shrink-0 border border-slate-200 dark:border-zinc-800 h-full"
              >
                <svg
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span className="hidden sm:inline">Filter</span>
              </button>
            {canAddProduct && (
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1 px-1.5 py-1.5 sm:px-2 sm:py-1.5 rounded text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition-colors shrink-0 h-full"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="hidden sm:inline">Add</span>
                </button>
            )}
            {/* Export — cashier gets PDF only; managers get all formats */}
            <button
              onClick={() => handleExportClick()}
              className="flex items-center gap-1 px-1.5 py-1.5 sm:px-2 sm:py-1.5 rounded text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 transition-colors shrink-0 border border-slate-200 dark:border-zinc-800 h-full"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
          {canDeleteProduct && (
            <button
              onClick={() => setIsTrashModalOpen(true)}
              className="flex items-center gap-1.5 p-1.5 sm:p-2 rounded text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
              title="Trash"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Horizontal Category Quick-Bar (Pills) */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilters((prev) => ({ ...prev, category: cat }))}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                filters.category === cat
                  ? "bg-slate-800 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900 border border-transparent"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-sm"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const ViewSwitcher: React.FC = () => {
    const iconBaseClasses =
      "p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors text-slate-500 dark:text-gray-400";
    const iconActiveClasses =
      "bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-500/20";
    return (
      <div className="hidden sm:flex items-center gap-1 bg-slate-100/50 dark:bg-zinc-900/50 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner">
        <button
          onClick={() => setViewMode("large")}
          className={`${iconBaseClasses} ${viewMode === "large" && iconActiveClasses}`}
          title="Large Grid"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h5v5H4zM15 6h5v5h-5zM4 15h5v5H4zM15 15h5v5h-5zM15 15h5v5h-5z"
            ></path>
          </svg>
        </button>
        <button
          onClick={() => setViewMode("medium")}
          className={`${iconBaseClasses} ${viewMode === "medium" && iconActiveClasses}`}
          title="Medium Grid"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h3v3H4zM10 6h3v3h-3zM16 6h3v3h-3zM4 12h3v3H4zM10 12h3v3h-3zM16 12h3v3h-3zM4 18h3v3H4zM10 18h3v3h-3zM16 18h3v3h-3z"
            ></path>
          </svg>
        </button>
        <button
          onClick={() => setViewMode("small")}
          className={`${iconBaseClasses} ${viewMode === "small" && iconActiveClasses}`}
          title="Small Grid"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V3zM8 3a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3zM14 3a1 1 0 011-1h2a1 1 0 01-1 1h-2a1 1 0 01-1-1V3zM2 9a1 1 0 011-1h2a1 1 0 01-1 1H3a1 1 0 01-1-1V9zM8 9a1 1 0 011-1h2a1 1 0 01-1 1H9a1 1 0 01-1-1V9zM14 9a1 1 0 011-1h2a1 1 0 01-1 1H9a1 1 0 01-1-1V9zM2 15a1 1 0 011-1h2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2zM8 15a1 1 0 011-1h2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2zM14 15a1 1 0 011-1h2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2z"></path>
          </svg>
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`${iconBaseClasses} ${viewMode === "list" && iconActiveClasses}`}
          title="List View"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>
    );
  };

  const gridClasses: Record<Exclude<ViewMode, "list">, string> = {
    large:
      "grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7",
    medium:
      "grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8",
    small:
      "grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 xl:grid-cols-12",
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderProductArea = () => {
    const effectiveViewMode =
      isMobile && viewMode === "list" ? "large" : viewMode;

    if (effectiveViewMode === "list") {
      return (
        <div className="bg-white dark:bg-zinc-950 sm:rounded-2xl sm:shadow-sm sm:border transition-all border-slate-200 dark:border-zinc-800 -mx-4 sm:mx-0 overflow-hidden mb-24">
          <div className="min-w-full w-full flex flex-col gap-[1px] bg-slate-100 dark:bg-zinc-900 sm:bg-transparent px-2 sm:px-0">
            {/* TABLE HEADER */}
            <div
              style={gridTemplateStyle}
              className="hidden sm:grid grid-cols-[var(--grid-cols-desktop)] gap-2 items-center px-1.5 sm:px-2 py-1 sm:py-1.5 bg-slate-50/50 dark:bg-zinc-950/50 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-200 dark:border-zinc-800"
            >
              {listColumns.map((col, idx) => (
                <div
                  key={col.key}
                  className={`${col.hideOnMobile ? "hidden sm:block" : ""} min-w-0 truncate ${col.sortable ? "cursor-pointer hover:text-[var(--color-primary)] transition-colors" : ""} ${col.key === "actions" || col.key === "price1" ? "text-right" : ""} ${col.key === "quantity" || col.key === "stockStatus" || col.key === "warranty" ? "text-center" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key as any)}
                >
                  {col.label}
                  {col.sortable && sortConfig.key === col.key && (
                    <span className="ml-1 text-blue-400">
                      {sortConfig.direction === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* TABLE BODY */}
            {filteredProducts.map((product) => (
              <ProductListRow
                key={product.id}
                product={product}
                isSelected={selectedProducts.has(product.id)}
                onSelect={handleSelectProduct}
                columns={listColumns}
                onEdit={() => handleOpenEditModal(product)}
                onMoveToTrash={() => handleMoveProductsToTrash([product.id])}
                onPrintLabel={() => handlePrintBarcode(product)}
                canEdit={canEditProduct}
                canDelete={canDeleteProduct}
                onApprove={
                  isManager
                    ? () => handleApproveProduct(product)
                    : undefined
                }
                onRowClick={() => handleOpenEditModal(product)}
                enableSelection={role !== "customer"}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div
        className={`grid ${gridClasses[effectiveViewMode as Exclude<ViewMode, "list">]} gap-2 sm:gap-4 pb-32`}
      >
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            size={effectiveViewMode as Exclude<ViewMode, "list">}
            isSelected={selectedProducts.has(product.id)}
            onSelect={handleSelectProduct}
            onEdit={() => handleOpenEditModal(product)}
            onMoveToTrash={() => handleMoveProductsToTrash([product.id])}
            onPrintLabel={() => handlePrintBarcode(product)}
            canEdit={canEditProduct}
            canDelete={canDeleteProduct}
            onApprove={
              isManager ? () => handleApproveProduct(product) : undefined
            }
            onRowClick={() => handleOpenEditModal(product)}
            enableSelection={role !== "customer"}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {renderHeader()}

      {showFilters && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:relative sm:z-auto sm:inset-auto sm:mt-4 sm:flex-none">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm sm:hidden"
            onClick={() => setShowFilters(false)}
          ></div>
          <div className="bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-none sm:bg-transparent border-t border-slate-200 dark:border-zinc-800 sm:border-0 p-6 sm:p-0 relative z-10 animate-fade-in-up sm:animate-fade-in-down shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:shadow-none w-full max-h-[85vh] sm:max-h-auto overflow-y-auto custom-scrollbar flex flex-col pb-safe">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full mx-auto mb-6 sm:hidden shrink-0"></div>

            <div className="flex justify-between items-center mb-6 sm:hidden shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Filters
              </h2>
              <button
                onClick={handleClearFilters}
                className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg shrink-0"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-4 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                  Brand
                </label>
                <div className="relative">
                  <select
                    name="brand"
                    value={filters.brand}
                    onChange={handleFilterChange}
                    className="w-full p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-zinc-100 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  >
                    {uniqueBrands.map((b) => (
                      <option key={b} value={b}>
                        {b === "all" ? "All Brands" : b}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                  Stock Status
                </label>
                <div className="relative">
                  <select
                    name="stockStatus"
                    value={filters.stockStatus}
                    onChange={handleFilterChange}
                    className="w-full p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-zinc-100 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="inStock">In Stock</option>
                    <option value="lowStock">Low Stock</option>
                    <option value="outOfStock">Out of Stock</option>
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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

              <div className="space-y-1.5">
                <div className="flex justify-between items-center pr-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1">
                    Max Price
                  </label>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-500/20">
                    {filters.priceRange.max}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 h-12">
                  <input
                    type="range"
                    name="priceRange.max"
                    min="0"
                    max={maxPrice}
                    value={filters.priceRange.max}
                    onChange={handleFilterChange}
                    className="flex-1 h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              <div className="hidden sm:flex justify-end pt-6">
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-rose-500 hover:text-rose-400 uppercase tracking-wider transition-colors flex items-center gap-1.5"
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
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(false)}
              className="sm:hidden w-full mt-6 py-4 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-transform"
            >
              Show Results
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 mb-4 text-sm rounded-lg transition-opacity duration-300 ${feedback.type === "success" ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20" : "bg-rose-100 dark:bg-rose-500/10 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"}`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      {!isLoading && !error && filteredProducts.length > 0 && (
        <div className="flex items-center justify-between mb-4 mt-2 sm:mt-0 px-2 sm:px-1 sm:mx-0 overflow-hidden">
          {role !== "customer" && (
            <div className="flex items-center gap-2 focus-within:ring-2 focus-within:ring-blue-500/30 rounded sm:pl-0">
              <input
                type="checkbox"
                ref={selectAllCheckboxRef}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-blue-500 focus:ring-blue-500 cursor-pointer shadow-sm transition-transform active:scale-90"
                aria-label="Select all items on this page"
                id="select-all-checkbox"
              />
              <label
                htmlFor="select-all-checkbox"
                className="text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 select-none cursor-pointer tracking-wider"
              >
                All
              </label>
            </div>
          )}
          <div className="flex items-center gap-3 sm:gap-4 ml-auto pr-4 sm:pr-0">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400 tracking-tight">
              {filteredProducts.length}/{allProducts.length}
            </span>
            <ViewSwitcher />
          </div>
        </div>
      )}

      {isLoading && (
        <div className={`grid ${gridClasses["large"]} gap-2 sm:gap-4`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-100 dark:bg-zinc-900 rounded-2xl h-48 sm:h-56"
            ></div>
          ))}
        </div>
      )}
      {error && (
        <div className="text-center p-8 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-2xl border border-rose-200 dark:border-rose-500/20">
          {error}
        </div>
      )}

      {!isLoading && !error && filteredProducts.length === 0 && (
        <div className="text-center p-12 bg-white dark:bg-zinc-950 rounded-lg shadow-md border border-slate-200 dark:border-zinc-800">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-gray-100">
            {t("inventory.no_products")}
          </h3>
          <p className="text-slate-500 dark:text-gray-400 mt-2">
            {t("inventory.try_adjusting")}
          </p>
          {(filters.category !== "all" ||
            filters.brand !== "all" ||
            filters.stockStatus !== "all" ||
            filters.searchQuery ||
            filters.dateRange.startDate ||
            filters.dateRange.endDate) && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              {t("common.clear")} {t("common.filter")}
            </button>
          )}
        </div>
      )}

      {!isLoading &&
        !error &&
        filteredProducts.length > 0 &&
        renderProductArea()}

      {selectedProducts.size > 0 && (
        <SelectionBar
          count={selectedProducts.size}
          onBatchEdit={handleBatchEdit}
          onMoveToTrash={() =>
            handleMoveProductsToTrash(Array.from(selectedProducts))
          }
          onClearSelection={handleClearSelection}
          onPrintLabels={handleBatchPrintBarcode}
          canBulkEdit={canBulkEdit}
          canBulkDelete={canBulkDelete}
        />
      )}

      {isTrashModalOpen && (
        <TrashModal
          onClose={() => setIsTrashModalOpen(false)}
          onDataChange={fetchProducts}
        />
      )}

      {isProductModalOpen && (
        <ProductModal
          productToEdit={editingProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleProductSave}
        />
      )}

      {isBatchEditModalOpen && (
        <BatchEditModal
          selectedIds={Array.from(selectedProducts)}
          uniqueCategories={uniqueCategories.filter((c) => c !== "all")}
          uniqueBrands={uniqueBrands.filter((b) => b !== "all")}
          onClose={() => setIsBatchEditModalOpen(false)}
          onSave={handleBatchSave}
        />
      )}

      {isExportModalOpen && (
        <ExportConfigModal
          products={filteredProducts}
          onClose={() => setIsExportModalOpen(false)}
          onExport={executeExport}
          pdfOnly={!isManager}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          initialMode={importMode}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={fetchProducts}
          onRequestManualAdd={() => {
            setIsImportModalOpen(false);
            handleOpenAddModal();
          }}
        />
      )}

      {isBarcodeModalOpen && (
        <BarcodeModal
          products={productsToPrint}
          onClose={() => setIsBarcodeModalOpen(false)}
        />
      )}

      {isAddOptionsModalOpen && (
        <AddProductOptionsModal
          onClose={() => setIsAddOptionsModalOpen(false)}
          onSelectBulkImport={() => {
            setIsAddOptionsModalOpen(false);
            setImportMode("bulk");
            setIsImportModalOpen(true);
          }}
          onSelectAiInvoice={() => {
            setIsAddOptionsModalOpen(false);
            setImportMode("ai");
            setIsImportModalOpen(true);
          }}
          onSelectManualEntry={() => {
            setIsAddOptionsModalOpen(false);
            setIsProductModalOpen(true);
          }}
        />
      )}

      <style>{`
        .form-select, .form-input {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
        }
        .dark .form-select, .dark .form-input {
          background-color: #0f172a;
          border-color: #1f2937; /* gray-800 */
          color: #f8fafc;
        }
        @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
            animation: fade-in-down 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default InventoryPanel;
