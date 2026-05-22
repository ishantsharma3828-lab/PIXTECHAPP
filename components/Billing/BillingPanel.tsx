import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import * as inventoryService from "../../services/inventoryService";
import * as billingService from "../../services/billingService";
import * as shippingService from "../../services/shippingService";
import { Product } from "../../constants/inventoryFields";
import {
  CartItem,
  Customer,
  Sale,
  DraftOrder,
  Coupon,
  PaymentRecord,
  DebtDetails,
} from "../../constants/billingTypes";
import CartItemRow from "./CartItemRow";
import PaymentModal from "./PaymentModal";
import CartItemOptionsModal from "./CartItemOptionsModal";
import CustomerSelectionModal from "./CustomerSelectionModal";
import CouponModal from "./CouponModal";
import DraftsModal from "./DraftsModal";
import ReceiptModal from "./ReceiptModal"; // Import Receipt Modal
import ProductBrowseModal from "./ProductBrowseModal"; // Import Browse Modal
import { getCurrentUser } from "../../services/authService";
import { usePermissions } from "../../hooks/usePermissions";

export const BillingPanel: React.FC = () => {
  const { settings, t } = useContext(SettingsContext);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("pos_cart_v1");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((i: any) => i && i.cartId && i.id)
        : [];
    } catch (e) {
      return [];
    }
  });

  // Persist Cart & Listen for Updates
  useEffect(() => {
    localStorage.setItem("pos_cart_v1", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | Event) => {
      // Check if it's a storage event or a custom dispatch
      if (e.type === "storage" && (e as StorageEvent).key !== "pos_cart_v1")
        return;

      try {
        const saved = localStorage.getItem("pos_cart_v1");
        const parsed = saved ? JSON.parse(saved) : [];
        if (Array.isArray(parsed)) {
          setCart(parsed.filter((i: any) => i && i.cartId && i.id));
        }
      } catch (err) {
        console.error("Cart sync error", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");

  // State for Billing Logic
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);

  // Shipping & ZR Express State
  const [territories, setTerritories] = useState<any[]>([]);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>("");
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [isFetchingRates, setIsFetchingRates] = useState(false);

  // Modals & UI State
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isDraftsOpen, setDraftsOpen] = useState(false);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [isCouponModalOpen, setCouponModalOpen] = useState(false);
  const [isBrowseModalOpen, setBrowseModalOpen] = useState(false); // Browse Modal State
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showMiscMenu, setShowMiscMenu] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); // Receipt Modal State
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null); // Store last sale
  const [scanActive, setScanActive] = useState(false); // Scanning feedback state

  // Hold Order State
  const [isHoldModalOpen, setHoldModalOpen] = useState(false);
  const [holdNote, setHoldNote] = useState("");

  // Cart Item Options Modal
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);

  // Custom Item Modal State
  const [isCustomItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [customItemData, setCustomItemData] = useState({
    name: "Service Fee",
    price: 0,
    quantity: 1,
  });

  // Payout Modal State
  const [isPayoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutData, setPayoutData] = useState({ amount: 0, reason: "" });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const customItemInputRef = useRef<HTMLInputElement>(null);
  const holdNoteInputRef = useRef<HTMLInputElement>(null);
  const miscButtonRef = useRef<HTMLButtonElement>(null);
  const user = getCurrentUser();
  const role = user?.role || "customer";
  const { isManager, isCashier, selectablePriceTiers, canApplyDiscount } = usePermissions();
  // Users can edit cart options if they are a manager OR if they have access to multiple price tiers
  const canEditCartItem = isManager || selectablePriceTiers.length > 1 || canApplyDiscount;
  const canAccessMiscExtras = isManager; // No Sale / Payout are manager-only
  const isRestricted = ["technician", "customer", "inventory_manager"].includes(role);

  // Load Inventory & Set Customer for Customer Role
  useEffect(() => {
    inventoryService.getProducts().then(setProducts);

    if (role === "customer" && user) {
      // Auto-set the customer based on logged-in user
      // We need to map 'User' to 'Customer' type roughly
      const autoCustomer: Customer = {
        id: user.id || "unknown",
        name: user.fullName || user.username,
        email: user.email,
        phone: user.phone || "",
        address: "", // User profile might not have this yet
        loyaltyPoints: 0, // Would need to fetch real points
        totalSpent: 0,
        tier: "Bronze",
        currentBalance: 0,
      };
      setCustomer(autoCustomer);
    }

    // Fetch ZR Express Territories (Cities)
    shippingService.searchTerritories("").then(setTerritories);
  }, []);

  // Rate Fetching
  useEffect(() => {
    if (selectedTerritoryId) {
      setIsFetchingRates(true);
      shippingService.getRateForTerritory(selectedTerritoryId).then((rate) => {
        setShippingFee(rate || 0);
        setIsFetchingRates(false);
      });
    } else {
      setShippingFee(0);
    }
  }, [selectedTerritoryId]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "F2") {
        e.preventDefault();
        if (isRestricted) handlePlaceOrder();
        else handlePayClick();
      }
      if (e.key === "F3") {
        e.preventDefault();
        setCustomerModalOpen(true);
      }
      if (e.key === "F4") {
        e.preventDefault();
        clearCart();
      }
      if (e.key === "Escape") {
        setPaymentModalOpen(false);
        setDraftsOpen(false);
        setCustomerModalOpen(false);
        setCouponModalOpen(false);
        setBrowseModalOpen(false);
        setShowSearchResults(false);
        setShowMiscMenu(false);
        setCustomItemModalOpen(false);
        setPayoutModalOpen(false);
        setEditingCartItem(null);
        setHoldModalOpen(false);
        // Note: We deliberately might NOT close ReceiptModal on Esc to prevent accidental closure before printing
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  // Focus inputs
  useEffect(() => {
    if (isCustomItemModalOpen) {
      setTimeout(() => customItemInputRef.current?.focus(), 100);
    }
    if (isHoldModalOpen) {
      setTimeout(() => holdNoteInputRef.current?.focus(), 100);
    }
  }, [isCustomItemModalOpen, isHoldModalOpen]);

  // Derived Totals
  const totals = useMemo(
    () =>
      billingService.calculateCartTotals(
        cart,
        coupon,
        pointsRedeemed,
        shippingFee,
      ),
    [cart, coupon, pointsRedeemed, shippingFee],
  );

  // Format Price Helper
  const isRightSideCurrency =
    settings.currencySymbol === "DA" || settings.currencySymbol === "DZD";
  const formatPrice = (val: number) =>
    isRightSideCurrency
      ? `${val.toFixed(2)} ${settings.currencySymbol}`
      : `${settings.currencySymbol}${val.toFixed(2)}`;

  // --- ACTIONS ---

  const addToCart = (product: Product, quantityOverride?: number) => {
    setCart((prev) => {
      // Check if item already exists
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + (quantityOverride || 1) }
            : item,
        );
      }
      const newItem: CartItem = {
        ...product,
        cartId: `cart_${Date.now()}_${Math.random()}`,
        quantity: quantityOverride || 1,
        discountType: "fixed",
        discountValue: 0,
        unitPrice: product.price1, // Default to price1
        priceSelection: "price1",
      };
      return [...prev, newItem];
    });
    setSearchQuery("");
    setShowSearchResults(false);
    setScanActive(true);
    setTimeout(() => setScanActive(false), 300);
    searchInputRef.current?.focus(); // Keep focus for speed
  };

  const handleCustomItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemData.name || customItemData.price < 0) return;

    const customProduct: Product = {
      id: `custom_${Date.now()}`,
      name: customItemData.name,
      sku: "MISC",
      brand: "Custom",
      category: "Misc",
      costPrice: 0,
      price1: Number(customItemData.price),
      price2: 0,
      price3: 0,
      price4: 0,
      quantity: 9999,
      minStock: 0,
      description: "Manual entry",
      warranty: { enabled: false, days: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      images: [],
    };

    addToCart(customProduct, Number(customItemData.quantity));
    setCustomItemModalOpen(false);
    setCustomItemData({ name: "Service Fee", price: 0, quantity: 1 }); // Reset
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutData.amount <= 0 || !payoutData.reason) return;
    alert(
      `Payout Recorded:\nAmount: ${formatPrice(Number(payoutData.amount))}\nReason: ${payoutData.reason}\nUser: ${user?.username}`,
    );
    setPayoutModalOpen(false);
    setPayoutData({ amount: 0, reason: "" });
  };

  const handleNoSale = () => {
    alert("Opening Cash Drawer... (No Sale)");
    setShowMiscMenu(false);
  };

  const updateCartItem = (cartId: string, updates: Partial<CartItem>) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.cartId === cartId) {
              const updated = { ...item, ...updates };
              if (updated.quantity <= 0) return null; // Remove if qty 0
              return updated;
            }
            return item;
          })
          .filter(Boolean) as CartItem[],
    );
  };

  const removeCartItem = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm(t("common.confirm") + "?")) {
      setCart([]);
      setCustomer(null);
      setCoupon(null);
      setPointsRedeemed(0);
    }
  };

  // --- HOLD / RESUME LOGIC ---

  const handleHoldClick = () => {
    if (cart.length === 0) return;
    setHoldNote(""); // Reset note
    setHoldModalOpen(true);
  };

  const confirmHoldOrder = (e: React.FormEvent) => {
    e.preventDefault();
    billingService.saveDraft({
      items: cart,
      customer,
      coupon,
      subtotal: totals.subtotal,
      total: totals.total,
      pointsRedeemed,
      note: holdNote,
      cashierName: user?.username || "Unknown",
    });
    setCart([]);
    setCustomer(null);
    setCoupon(null);
    setPointsRedeemed(0);
    setHoldModalOpen(false);
    alert("Order placed on hold.");
  };

  const handleResumeDraft = (draft: DraftOrder) => {
    setCart(draft.items);
    setCustomer(draft.customer || null);
    setCoupon(draft.coupon || null);
    setPointsRedeemed(draft.pointsRedeemed || 0);

    billingService.deleteDraft(draft.id);
    setDraftsOpen(false);
  };

  const handlePayClick = () => {
    if (cart.length === 0) return;
    setPaymentModalOpen(true);
  };

  const handlePaymentComplete = async (
    payments: PaymentRecord[],
    debtDetails?: DebtDetails,
    deliveryDetails?: any,
  ) => {
    try {
      const completedSale = await billingService.saveSale({
        items: cart,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.totalDiscounts,
        total: totals.total,
        payments: payments,
        debtDetails: debtDetails,
        customerId: customer?.id,
        customerName: customer?.name,
        customerAddress: customer?.address,
        customerPhone: customer?.phone,
        customerEmail: customer?.email,
        cashierId: user?.id || "unknown",
        cashierName: user?.username || "Unknown",
        status: "completed",
        deliveryDetails:
          deliveryDetails ||
          (selectedTerritoryId
            ? {
                status: "pending",
                address: customer?.address || "",
                cityTerritoryId: selectedTerritoryId,
              }
            : undefined),
      });

      setCart([]);
      setCustomer(null);
      setCoupon(null);
      setPointsRedeemed(0);
      setPaymentModalOpen(false);

      setLastCompletedSale(completedSale);
      setIsReceiptModalOpen(true);
    } catch (e) {
      console.error(e);
      alert("Transaction failed.");
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!confirm("Place this order for approval?")) return;

    try {
      await billingService.saveSale({
        items: cart,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.totalDiscounts,
        total: totals.total,
        payments: [], // No payments yet
        customerId: customer?.id,
        customerName: customer?.name,
        customerAddress: customer?.address,
        customerPhone: customer?.phone,
        customerEmail: customer?.email,
        cashierId: user?.id || "unknown",
        cashierName: user?.username || "Unknown",
        status: "pending" as any, // Force cast if strict checked
        deliveryDetails: selectedTerritoryId
          ? {
              status: "pending",
              address: customer?.address || "",
              cityTerritoryId: selectedTerritoryId,
            }
          : undefined,
      });

      setCart([]);
      setCustomer(null);
      setCoupon(null);
      setPointsRedeemed(0);

      alert("Order placed successfully! Waiting for approval.");
    } catch (e) {
      console.error(e);
      alert("Order failed.");
    }
  };

  const handlePointsChange = (val: string) => {
    const points = Math.min(Number(val), customer?.loyaltyPoints || 0);
    setPointsRedeemed(points);
  };

  // --- SEARCH & SCAN LOGIC ---

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lower = searchQuery.toLowerCase();
    // Safe filtering for undefined properties
    return products
      .filter(
        (p) =>
          (p.name || "").toLowerCase().includes(lower) ||
          (p.sku || "").toLowerCase().includes(lower),
      )
      .slice(0, 8); // Limit results
  }, [products, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowSearchResults(!!query);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      // 1. Exact Match (Barcode Scan)
      const exactMatch = products.find(
        (p) =>
          (p.sku && p.sku.toLowerCase() === searchQuery.trim().toLowerCase()) ||
          p.id === searchQuery.trim(),
      );

      if (exactMatch) {
        addToCart(exactMatch);
        return;
      }

      // 2. Fallback: Single Search Result
      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
        return;
      }
    }
  };

  return (
    <div className="flex flex-col h-full sm:-m-4 md:-m-6 lg:-m-8">
      {/* Top Info Bar */}
      <div className="hidden md:flex bg-slate-50 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-4 py-2 flex-col sm:flex-row justify-between items-center text-sm shadow-sm z-10 gap-2 sm:gap-0">
        <div className="flex gap-4">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {new Date().toLocaleDateString()}
          </span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online
          </span>
        </div>
        {role !== "customer" && (
          <div className="flex gap-4 text-slate-600 dark:text-zinc-400 w-full sm:w-auto justify-between sm:justify-start">
            <span>
              Register:{" "}
              <strong className="text-slate-900 dark:text-white">
                Main POS
              </strong>
            </span>
            <span>
              Cashier:{" "}
              <strong className="text-slate-900 dark:text-white capitalize">
                {user?.username}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT: CART AREA (65%) */}
        <div
          className={`flex-none md:flex-[2] flex flex-col border-r md:border-r-0 border-slate-200 dark:border-zinc-800 bg-transparent relative overflow-hidden transition-colors duration-300 ${scanActive ? "ring-4 ring-inset ring-emerald-500 bg-emerald-500/10" : ""} ${showMobileDetails ? "hidden md:flex" : "flex h-full"}`}
        >
          {/* Search Bar */}
          <div className="p-2 md:p-4 bg-slate-50 dark:bg-zinc-900/80 backdrop-blur-md shadow-sm z-20 flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 md:h-5 md:w-5 text-slate-500 dark:text-zinc-400"
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
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleInputKeyDown}
                className="block w-full pl-10 pr-3 py-2.5 md:py-3 border border-slate-200 dark:border-zinc-800 rounded-lg leading-5 bg-white dark:bg-zinc-950/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={t("billing.scan_placeholder")}
                autoComplete="off"
              />
              {/* Search Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-50 dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-800 max-h-80 overflow-y-auto z-50">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-3 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer border-b border-slate-200 dark:border-zinc-800/50 last:border-0 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-slate-200 dark:bg-zinc-800 rounded overflow-hidden shrink-0">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0].url}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                          {product.sku} • {formatPrice(product.price1)}
                        </p>
                      </div>
                      <div
                        className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${product.quantity > 0 ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400"}`}
                      >
                        {product.quantity} in stock
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setBrowseModalOpen(true)}
              className="px-3 md:px-4 py-2.5 md:py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-white rounded-lg font-bold flex items-center gap-2 transition-colors shrink-0"
              title="Browse visual catalog"
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
                  strokeWidth="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span className="hidden sm:inline">Browse</span>
            </button>
          </div>

          {/* HEADER */}
          <div className="hidden md:flex justify-between items-center p-4 pb-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {role === "customer" && (
                <>
                  <span className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </span>
                  My Cart
                </>
              )}
            </h1>

            {role !== "customer" && (
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-zinc-400">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/80 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Register:{" "}
                  <span className="font-mono font-bold text-white">REG-01</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/80 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm">
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Cashier:{" "}
                  <span className="font-bold text-white">
                    {user?.username}
                  </span>
                </div>
              </div>
            )}
          </div>
          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 md:p-4 pb-36 md:pb-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 dark:text-zinc-500 opacity-60">
                <svg
                  className="w-16 h-16 md:w-24 md:h-24 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-base md:text-lg font-medium">
                  {t("billing.empty_cart")}
                </p>
                <p className="text-xs md:text-sm">
                  {t("billing.scan_to_begin")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#1F1F1F] bg-slate-50 dark:bg-zinc-900/80 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
                {cart.map((item) => (
                  <CartItemRow
                    key={item.cartId}
                    item={item}
                    onUpdateQty={(qty) =>
                      updateCartItem(item.cartId, { quantity: qty })
                    }
                    onEdit={() => setEditingCartItem(item)}
                    canEdit={canEditCartItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* MOBILE STICKY CHECKOUT BAR */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50">
            <button
              onClick={() => setShowMobileDetails(true)}
              disabled={cart.length === 0}
              className="w-full h-14 bg-blue-600 text-white rounded-xl flex items-center justify-between px-6 font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center text-sm">
                  {cart.length}
                </div>
                <span>Review Order</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{formatPrice(totals.total)}</span>
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT: TOTALS & ACTIONS (35%) */}
        <div
          className={`w-full md:flex-1 bg-slate-50 dark:bg-zinc-900/80 backdrop-blur-md flex flex-col md:shadow-lg z-30 md:max-w-md border-t md:border-t-0 md:border-l border-slate-200 dark:border-zinc-800 shrink-0 border-t-4 border-t-slate-200 dark:border-t-zinc-800 ${showMobileDetails ? "fixed inset-0 md:relative flex" : "hidden md:flex"}`}
        >
          {/* Mobile Back Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <button
              onClick={() => setShowMobileDetails(false)}
              className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 font-bold"
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
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Cart
            </button>
            <h2 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              Checkout
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Scrollable Content */}
            {/* Customer Section */}
            <div className="p-3 md:p-4 border-b border-slate-200 dark:border-zinc-800 bg-transparent shrink-0">
              {/* Auto-set customer for 'customer' role is handled in useEffect, but we hide the add button/remove button UI if restricted */}
              {customer ? (
                <div className="bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800 group relative overflow-hidden">
                  {/* Decorative background based on tier */}
                  <div
                    className={`absolute top-0 right-0 w-16 h-16 transform translate-x-4 -translate-y-4 rounded-full opacity-10 
                                ${customer.tier === "Gold" ? "bg-yellow-400" : customer.tier === "Silver" ? "bg-gray-400" : "bg-orange-400"}`}
                  />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                        ${customer.tier === "Gold" ? "bg-yellow-500" : customer.tier === "Silver" ? "bg-gray-400" : "bg-orange-400"}`}
                      >
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm">
                            {customer.name}
                          </p>
                          {customer.currentBalance > 0 && isManager && (
                            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
                              {t("contacts.debt").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          {customer.phone || customer.email}
                        </p>
                        {customer.address && (
                          <p className="text-xs text-slate-600 dark:text-zinc-500 truncate max-w-[150px]">
                            {customer.address}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Hide Remove Button for Customer Role */}
                    {role !== "customer" && (
                      <button
                        onClick={() => {
                          setCustomer(null);
                          setPointsRedeemed(0);
                        }}
                        className="text-slate-600 dark:text-zinc-500 hover:text-rose-500 p-1"
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
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800/50 flex justify-between text-xs">
                    <div>
                      <span className="text-slate-600 dark:text-zinc-500">
                        Balance:{" "}
                      </span>
                      <span
                        className={`font-bold ${customer.currentBalance > 0 ? "text-rose-500" : "text-blue-500"}`}
                      >
                        {isManager && customer.currentBalance > 0
                          ? `${formatPrice(customer.currentBalance)} Debt`
                          : `${customer.loyaltyPoints} pts`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-zinc-500">
                        Tier:{" "}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-zinc-100 uppercase">
                        {customer.tier || "Bronze"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Only show Add Customer if NOT a customer role (unless data is loading) */
                role !== "customer" && (
                  <button
                    onClick={() => setCustomerModalOpen(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-zinc-800/50 rounded-lg text-slate-500 dark:text-zinc-400 hover:border-blue-500 hover:text-blue-500 transition flex items-center justify-center gap-2 group"
                  >
                    <span className="bg-slate-50 dark:bg-zinc-900 p-1 rounded-full group-hover:bg-blue-500 group-hover:text-slate-900 dark:hover:text-white transition-colors">
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </span>
                    <span>{t("billing.add_customer")}</span>
                  </button>
                )
              )}
            </div>

            {/* Calculation Body */}
            <div className="flex-1 p-3 md:p-6 space-y-2 md:space-y-3 overflow-y-auto">
              <div className="flex justify-between text-sm md:text-base text-slate-500 dark:text-zinc-400">
                <span>{t("billing.subtotal")}</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base text-slate-500 dark:text-zinc-400">
                <span>{t("billing.tax")}</span>
                <span>{formatPrice(totals.tax)}</span>
              </div>

              {/* Auto Discounts */}
              {totals.autoDiscount > 0 && (
                <div className="flex justify-between text-emerald-500 dark:text-emerald-400 text-xs md:text-sm">
                  <span>Auto Discounts</span>
                  <span>- {formatPrice(totals.autoDiscount)}</span>
                </div>
              )}

              {/* Delivery Rate */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs md:text-sm py-1 border-t border-slate-200 dark:border-zinc-800/50 mt-1 md:mt-2 pt-1 md:pt-2">
                <span className="text-slate-500 dark:text-zinc-400">
                  Delivery Destination
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTerritoryId}
                    onChange={(e) => setSelectedTerritoryId(e.target.value)}
                    className="text-xs p-1.5 border rounded-lg bg-white dark:bg-zinc-950/80 border-slate-200 dark:border-zinc-800 text-white max-w-[150px] focus:ring-1 focus:ring-blue-500 outline-none"
                    title="Select a city to calculate shipping fees via ZR Express"
                  >
                    <option value="">Select City...</option>
                    {territories.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {shippingFee > 0 && (
                <div className="flex justify-between text-indigo-400 text-sm animate-fade-in">
                  <span className="flex items-center gap-2">
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
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    Shipping Cost{" "}
                    {isFetchingRates && (
                      <span className="animate-pulse">(calculating...)</span>
                    )}
                  </span>
                  <span className="font-bold">
                    + {formatPrice(shippingFee)}
                  </span>
                </div>
              )}

              {/* Coupons / Manual Discounts */}
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-500 dark:text-zinc-400">
                  {t("billing.discount")}
                </span>
                {coupon ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-medium">
                      {coupon.code} (-{formatPrice(totals.couponDiscount)})
                    </span>
                    <button
                      onClick={() => setCoupon(null)}
                      className="text-rose-400 hover:text-rose-600"
                    >
                      <svg
                        className="w-3 h-3"
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
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCouponModalOpen(true)}
                    className="text-blue-500 hover:underline text-xs font-bold"
                  >
                    + {t("billing.coupon_code")}
                  </button>
                )}
              </div>

              {/* Loyalty Redemption */}
              {customer && (
                <div className="bg-orange-900/10 p-2 rounded border border-orange-900/30">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-orange-300">
                      {t("billing.redeem_points")}
                    </label>
                    <span className="text-xs text-orange-400">
                      - {formatPrice(totals.loyaltyDiscount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max={customer.loyaltyPoints}
                      step="10"
                      value={pointsRedeemed}
                      onChange={(e) => handlePointsChange(e.target.value)}
                      className="flex-1 h-1 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min="0"
                      max={customer.loyaltyPoints}
                      value={pointsRedeemed}
                      onChange={(e) => handlePointsChange(e.target.value)}
                      className="w-12 text-xs p-1 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 text-white rounded text-right"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-zinc-800/50 my-3 md:my-4 pt-3 md:pt-4">
                <div className="flex justify-between items-end">
                  <span className="text-base md:text-lg font-bold text-slate-800 dark:text-white">
                    {t("billing.total_due")}
                  </span>
                  <span className="text-2xl md:text-3xl font-extrabold text-[var(--color-primary)]">
                    {formatPrice(totals.total)}
                  </span>
                </div>
              </div>

              {/* Points Earned Preview */}
              <div className="text-center">
                <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                  ✨ You will earn {totals.pointsEarned} points
                </span>
              </div>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="p-2 md:p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-4 bg-white dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 relative shrink-0 z-20">
            {/* Misc Menu Popover */}
            {showMiscMenu && (
              <div className="absolute bottom-full right-4 mb-2 bg-white dark:bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-xl border border-slate-200 dark:border-zinc-800 w-56 overflow-hidden z-30 animate-fade-in-up">
                <button
                  onClick={() => {
                    setShowMiscMenu(false);
                    setCustomItemModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-medium text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-zinc-800/50 flex items-center gap-2 transition-colors"
                >
                  ➕ {t("billing.custom_item")}
                </button>
                {canAccessMiscExtras && (
                  <>
                    <button
                      onClick={handleNoSale}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-medium text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-zinc-800/50 flex items-center gap-2 transition-colors"
                    >
                      🔓 {t("billing.no_sale")}
                    </button>
                    <button
                      onClick={() => {
                        setShowMiscMenu(false);
                        setPayoutModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-zinc-800 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors"
                    >
                      💸 {t("billing.payout")}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className={`grid grid-cols-4 gap-1.5 md:gap-2 mb-2`}>
              {/* Primary Action Row */}
              <button
                onClick={handleHoldClick}
                className="col-span-1 py-1 md:py-3 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-500 font-bold hover:bg-orange-500/20 flex flex-col items-center justify-center gap-0.5"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-[10px]">
                  {t("billing.hold")}
                </span>
              </button>

              <button
                onClick={() => setDraftsOpen(true)}
                className="col-span-1 py-1 md:py-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 flex flex-col items-center justify-center gap-0.5"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="text-[10px]">
                  {t("billing.drafts")}
                </span>
              </button>

              <button
                onClick={clearCart}
                className="col-span-1 py-1 md:py-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 flex flex-col items-center justify-center gap-0.5"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span className="text-[10px]">
                  {t("common.clear")}
                </span>
              </button>

              {role !== "customer" && (
                <button
                  ref={miscButtonRef}
                  onClick={() => setShowMiscMenu(!showMiscMenu)}
                  className={`col-span-1 py-1 md:py-3 rounded-lg border border-slate-200 dark:border-zinc-800 font-bold flex flex-col items-center justify-center gap-0.5 transition-colors ${showMiscMenu ? "bg-zinc-800 text-white" : "bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800"}`}
                >
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-[10px]">
                    {t("billing.misc")}
                  </span>
                </button>
              )}
            </div>

            {/* PAY / ORDER BUTTON */}
            {isRestricted ? (
              <button
                onClick={handlePlaceOrder}
                disabled={cart.length === 0}
                className="w-full py-2.5 md:py-4 bg-blue-600 text-white rounded-lg shadow-md hover:brightness-110 active:scale-[0.99] transition-all font-bold text-sm md:text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>ORDER NOW! {formatPrice(totals.total)}</span>
                <span className="hidden md:inline bg-white/20 text-xs px-2 py-0.5 rounded uppercase">
                  F2
                </span>
              </button>
            ) : (
              <button
                onClick={handlePayClick}
                disabled={cart.length === 0}
                className="w-full py-2.5 md:py-4 bg-[var(--color-primary)] text-white rounded-lg shadow-md hover:brightness-110 active:scale-[0.99] transition-all font-bold text-sm md:text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {t("billing.pay")} {formatPrice(totals.total)}
                </span>
                <span className="hidden md:inline bg-white/20 text-xs px-2 py-0.5 rounded uppercase">
                  F2
                </span>
              </button>
            )}
          </div>
        </div>

        {/* --- MODALS --- */}

        {editingCartItem && (
          <CartItemOptionsModal
            item={editingCartItem}
            onClose={() => setEditingCartItem(null)}
            onSave={(updates) =>
              updateCartItem(editingCartItem.cartId, updates)
            }
            onRemove={() => {
              removeCartItem(editingCartItem.cartId);
              setEditingCartItem(null);
            }}
          />
        )}

        {isPaymentModalOpen && (
          <PaymentModal
            total={totals.total}
            customerName={customer?.name}
            customer={customer}
            cart={cart}
            onConfirm={handlePaymentComplete}
            onCancel={() => setPaymentModalOpen(false)}
          />
        )}

        {isCustomerModalOpen && (
          <CustomerSelectionModal
            onSelect={setCustomer}
            onClose={() => setCustomerModalOpen(false)}
          />
        )}

        {isCouponModalOpen && (
          <CouponModal
            currentSubtotal={totals.subtotal}
            onApply={setCoupon}
            onClose={() => setCouponModalOpen(false)}
          />
        )}

        {isDraftsOpen && (
          <DraftsModal
            onResume={handleResumeDraft}
            onClose={() => setDraftsOpen(false)}
          />
        )}

        {isBrowseModalOpen && (
          <ProductBrowseModal
            products={products}
            onClose={() => setBrowseModalOpen(false)}
            onAddToCart={addToCart}
          />
        )}

        {/* HOLD ORDER MODAL */}
        {isHoldModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
                {t("billing.hold")}
              </h3>
              <form onSubmit={confirmHoldOrder}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("contacts.notes")}
                    </label>
                    <input
                      ref={holdNoteInputRef}
                      type="text"
                      value={holdNote}
                      onChange={(e) => setHoldNote(e.target.value)}
                      placeholder="e.g. Phone Order, Forgot Wallet"
                      className="w-full form-input mt-1"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setHoldModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-gray-600 rounded text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded text-sm font-bold"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CUSTOM ITEM MODAL */}
        {isCustomItemModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
                {t("billing.custom_item")}
              </h3>
              <form onSubmit={handleCustomItemSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("expenses.description")}
                    </label>
                    <input
                      ref={customItemInputRef}
                      type="text"
                      value={customItemData.name}
                      onChange={(e) =>
                        setCustomItemData({
                          ...customItemData,
                          name: e.target.value,
                        })
                      }
                      className="w-full form-input mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("inventory.col.price")}
                    </label>
                    <input
                      type="number"
                      value={customItemData.price}
                      onChange={(e) =>
                        setCustomItemData({
                          ...customItemData,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full form-input mt-1"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("inventory.col.qty")}
                    </label>
                    <input
                      type="number"
                      value={customItemData.quantity}
                      onChange={(e) =>
                        setCustomItemData({
                          ...customItemData,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="w-full form-input mt-1"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setCustomItemModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-gray-600 rounded text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded text-sm font-bold"
                  >
                    {t("common.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* PAYOUT MODAL */}
        {isPayoutModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">
                {t("billing.payout")}
              </h3>
              <form onSubmit={handlePayoutSubmit}>
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                    {t("users.stats.cash_alert")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("billing.amount")}
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        {settings.currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={payoutData.amount}
                        onChange={(e) =>
                          setPayoutData({
                            ...payoutData,
                            amount: Number(e.target.value),
                          })
                        }
                        className="w-full pl-8 form-input"
                        min="0.01"
                        step="0.01"
                        autoFocus
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                      {t("rma.reason")}
                    </label>
                    <textarea
                      value={payoutData.reason}
                      onChange={(e) =>
                        setPayoutData({ ...payoutData, reason: e.target.value })
                      }
                      className="w-full form-input mt-1"
                      rows={2}
                      placeholder="e.g., Office Supplies"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-gray-600 rounded text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold hover:bg-red-700"
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECEIPT MODAL */}
        {isReceiptModalOpen && lastCompletedSale && (
          <ReceiptModal
            sale={lastCompletedSale}
            onClose={() => setIsReceiptModalOpen(false)}
          />
        )}

        <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.2s ease-out forwards;
                }
                .form-input {
                    padding: 0.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    background-color: #fff;
                }
                .dark .form-input {
                    background-color: #374151;
                    border-color: #4b5563;
                    color: #fff;
                }
            `}</style>
      </div>
    </div>
  );
};
