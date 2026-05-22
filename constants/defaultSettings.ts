
import { ProductField } from './inventoryFields';

export interface CustomFont {
  name: string;
  dataUrl: string;
}

export interface CompanyAddress {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SocialMediaLink {
  platform: string;
  url: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface DashboardBanner {
  title: string;
  subtitle: string;
  image: string;
  path: string;
  color: string;
}

export interface AppSettings {
  logoUrl: string;
  logoSize: number;
  companyName: string;
  companyNameAr: string; // Arabic Company Name
  tagline: string;

  // Professional Details
  legalName: string; // Nom et forme juridique
  legalNameAr: string; // Arabic Legal Name
  rcNumber: string; // Registre du commerce
  nifNumber: string; // Numéro d'identification fiscale
  nisNumber: string; // Numéro d'identification statistique
  artNumber: string; // Article d'imposition

  // Contact Info (Arrays)
  companyAddresses: CompanyAddress[];
  addressAr: string; // Arabic Address (Full string)
  companyPhones: string[];
  companyEmails: string[];
  companyWebsites: string[];

  // Business Activity
  businessActivities: string[];
  businessActivityAr: string; // Arabic Activity

  // Social Media
  socialMediaLinks: SocialMediaLink[];

  // Banners
  dashboardBanners: DashboardBanner[];

  // Theming
  themeMode: 'light' | 'dark' | 'system';
  appLayout: 'classic' | 'glass_dock' | 'gamex'; // New layout mode
  lightColors: ColorScheme;
  darkColors: ColorScheme;

  primaryFont: string;
  primaryFontWeight: string;
  primaryLetterSpacing: string;
  primaryFontColor: string;
  secondaryFont: string;
  secondaryFontWeight: string;
  secondaryLetterSpacing: string;
  secondaryFontColor: string;
  fontSizeScale: 'sm' | 'md' | 'lg';
  uiScale: number; // New field for UI zoom level
  customFonts: CustomFont[];
  arabicFontUrl: string; // New field for Invoice Arabic Font
  productFields: ProductField[];
  currencySymbol: string;
  language: 'en' | 'fr' | 'ar';
  geminiApiKey?: string; // Optional user-provided API key
  kioskMode?: boolean;
  autoLaunch?: boolean;

  // ZR Express Integration
  zrExpressApiKey?: string;
  zrExpressTenantId?: string;
}

export const SOCIAL_PLATFORMS = [
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Twitter',
  'Google',
  'YouTube',
  'TikTok',
  'Snapchat',
  'Pinterest'
];

export const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '/build/icon.ico',
  logoSize: 32,
  companyName: 'PIX TECH',
  companyNameAr: '',
  tagline: 'Your Business, Managed.',

  legalName: '',
  legalNameAr: '',
  rcNumber: '',
  nifNumber: '',
  nisNumber: '',
  artNumber: '',

  companyAddresses: [
    { id: 'addr_default', street: '123 Business Rd', city: 'Tech City', state: 'TC', zip: '10001', country: 'Country' }
  ],
  addressAr: '',
  companyPhones: ['+1 234 567 890'],
  companyEmails: ['info@pospro.com'],
  companyWebsites: ['www.pospro.com'],
  businessActivities: [],
  businessActivityAr: '',

  socialMediaLinks: [],
  dashboardBanners: [
    {
      title: "Gaming PCs",
      subtitle: "Custom Built Performance",
      image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=600&auto=format&fit=crop",
      path: "/pc-configurator",
      color: "from-purple-600 to-blue-600"
    },
    {
      title: "Components",
      subtitle: "Upgrade Your Rig",
      image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=600&auto=format&fit=crop",
      path: "/inventory",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Accessories",
      subtitle: "Keyboards, Mice & More",
      image: "https://images.unsplash.com/photo-1612287230217-969ead3e6973?q=80&w=600&auto=format&fit=crop",
      path: "/inventory?category=peripherals",
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Services",
      subtitle: "Repairs & Maintenance",
      image: "https://images.unsplash.com/photo-1597872200969-2f65a5e0f177?q=80&w=600&auto=format&fit=crop",
      path: "/service-desk",
      color: "from-blue-500 to-indigo-500"
    }
  ],
  arabicFontUrl: '', // Default empty

  themeMode: 'dark',
  appLayout: 'glass_dock',
  lightColors: {
    primary: '#3B82F6', // Professional Blue
    secondary: '#1F2937', // Slate 800
    accent: '#3B82F6',
  },
  darkColors: {
    primary: '#3B82F6', // Professional Blue
    secondary: '#111827', // Gray 900
    accent: '#3B82F6',
  },

  primaryFont: 'Inter',
  primaryFontWeight: '400',
  primaryLetterSpacing: 'normal',
  primaryFontColor: '#18181b', // zinc-900
  secondaryFont: 'Inter',
  secondaryFontWeight: '600',
  secondaryLetterSpacing: 'normal',
  secondaryFontColor: '#09090b', // zinc-950
  fontSizeScale: 'md',
  uiScale: 100,
  customFonts: [],
  // arabicFontUrl: '', // Removed duplicate
  productFields: [
    { key: 'name', label: 'Product Name', type: 'text', isCore: true, isVisible: true },
    { key: 'sku', label: 'SKU', type: 'text', isCore: true, isVisible: true },
    { key: 'brand', label: 'Brand', type: 'text', isCore: true, isVisible: true },
    { key: 'category', label: 'Category', type: 'text', isCore: true, isVisible: false },
    { key: 'costPrice', label: 'Cost Price', type: 'number', isCore: true, isVisible: false },
    { key: 'price1', label: 'Price 1 (Standard)', type: 'number', isCore: true, isVisible: true },
    { key: 'price2', label: 'Price 2', type: 'number', isCore: true, isVisible: false },
    { key: 'price3', label: 'Price 3 (Build 1)', type: 'number', isCore: true, isVisible: false },
    { key: 'price4', label: 'Price 4 (Build 2)', type: 'number', isCore: true, isVisible: false },
    { key: 'quantity', label: 'Quantity', type: 'number', isCore: true, isVisible: true },
    { key: 'minStock', label: 'Minimum Stock', type: 'number', isCore: true, isVisible: false },
    { key: 'status', label: 'Status', type: 'status', isCore: true, isVisible: true, isVirtual: true },
    { key: 'description', label: 'Description', type: 'longtext', isCore: true, isVisible: false },
    { key: 'warranty', label: 'Warranty', type: 'warranty', isCore: true, isVisible: false },
    // PC Builder Compatibility Fields
    { key: 'socket', label: 'PC: Socket (CPU/Mobo)', type: 'text', isCore: false, isVisible: true, placeholder: 'e.g. AM4, LGA1700' },
    { key: 'memory_type', label: 'PC: Memory Type', type: 'text', isCore: false, isVisible: true, placeholder: 'e.g. DDR4, DDR5' },
    { key: 'wattage', label: 'PC: Wattage (TDP/Cap)', type: 'number', isCore: false, isVisible: true, placeholder: 'e.g. 65 (CPU) or 750 (PSU)' },
  ],
  currencySymbol: '$',
  language: 'en',
  geminiApiKey: '',
  kioskMode: false,
  autoLaunch: false,

  // ZR Express Defaults (Empty)
  zrExpressApiKey: '',
  zrExpressTenantId: '',
};

export const FONT_PRESETS = [
  'Inter',
  'Roboto',
  'Poppins',
  'Open Sans',
  'Lato',
];

export const FONT_WEIGHTS = [
  { label: 'Thin', value: '100' },
  { label: 'Extra Light', value: '200' },
  { label: 'Light', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semi Bold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
];
