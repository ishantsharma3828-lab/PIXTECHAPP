
import React, { useContext, useState, useRef, ChangeEvent, useEffect } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';
import { AppSettings, FONT_PRESETS, FONT_WEIGHTS, SOCIAL_PLATFORMS, CompanyAddress, ColorScheme } from '../constants/defaultSettings';
import { BUSINESS_ACTIVITIES } from '../constants/businessActivities';
import FieldManager from './Settings/FieldManager';
import BannerSettings from './Settings/BannerSettings';

// Helper Component for Simple String Lists (Phones, Emails, etc.)
const MultiInput: React.FC<{
    values: string[];
    onChange: (newValues: string[]) => void;
    placeholder?: string;
    label: string;
    list?: string; // Datalist ID
    type?: string;
}> = ({ values, onChange, placeholder, label, list, type = 'text' }) => {
    const handleAdd = () => onChange([...values, '']);
    const handleRemove = (index: number) => onChange(values.filter((_, i) => i !== index));
    const handleChange = (index: number, val: string) => {
        const newValues = [...values];
        newValues[index] = val;
        onChange(newValues);
    };

    return (
        <div className="space-y-2">
            {values.map((val, index) => (
                <div key={index} className="flex gap-2">
                    <input
                        type={type}
                        value={val}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="form-input flex-1"
                        placeholder={placeholder}
                        list={list}
                    />
                    <button
                        onClick={() => handleRemove(index)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Remove"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
            <button
                onClick={handleAdd}
                className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
                + Add {label}
            </button>
        </div>
    );
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-gray-200">{title}</h3>
        {children}
    </div>
);

const SettingsRow: React.FC<{ label: string; children: React.ReactNode, helpText?: string, alignTop?: boolean }> = ({ label, children, helpText, alignTop }) => (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 ${alignTop ? 'items-start' : 'items-center'}`}>
        <div>
            <label className="text-slate-600 dark:text-gray-400 font-medium">{label}</label>
            {helpText && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{helpText}</p>}
        </div>
        <div className="md:col-span-2">{children}</div>
    </div>
);

// New Helper for Color Pickers with HEX input
const ColorPickerRow: React.FC<{
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, value, onChange }) => (
    <SettingsRow label={label}>
        <div className="flex gap-3 items-center">
            <div className="h-10 w-16 relative overflow-hidden rounded-md border border-slate-300 dark:border-gray-600 shadow-sm shrink-0 transition-transform hover:scale-105">
                <input
                    type="color"
                    name={name}
                    value={value && /^#[0-9A-F]{6}$/i.test(value) ? value : '#000000'}
                    onChange={onChange}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0 m-0"
                />
            </div>
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                className="form-input font-mono uppercase w-32 tracking-wider"
                placeholder="#000000"
                maxLength={9}
            />
        </div>
    </SettingsRow>
);

// Helper to lighten hex color
const lightenColor = (hex: string, percent: number) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

const SettingsPanel: React.FC = () => {
    const { settings, setSettings, saveSettings, restoreDefaults, t, currentColors } = useContext(SettingsContext);
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [feedback, setFeedback] = useState('');
    const [activeColorTab, setActiveColorTab] = useState<'light' | 'dark'>('light');

    const logoInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const arabicFontInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const showFeedback = (message: string) => {
        setFeedback(message);
        setTimeout(() => setFeedback(''), 2000);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const parsedValue = type === 'range' || type === 'number' ? Number(value) : value;
        const newSettings = { ...localSettings, [name]: parsedValue };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    };

    const handleColorChange = (e: ChangeEvent<HTMLInputElement>, mode: 'light' | 'dark') => {
        const { name, value } = e.target;
        // name is e.g. "primary"
        const targetColors = mode === 'light' ? 'lightColors' : 'darkColors';
        const updatedColors = { ...localSettings[targetColors], [name]: value };
        const newSettings = { ...localSettings, [targetColors]: updatedColors };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    }

    const handleAutoGenerateDarkColors = () => {
        const light = localSettings.lightColors;
        // Generate lighter versions of the brand colors for dark mode visibility
        const newDark = {
            primary: lightenColor(light.primary, 30),
            secondary: lightenColor(light.secondary, 30),
            accent: lightenColor(light.accent, 20),
        };
        const newSettings = { ...localSettings, darkColors: newDark };
        setLocalSettings(newSettings);
        setSettings(newSettings);
        setActiveColorTab('dark');
        showFeedback('Dark mode colors generated!');
    };

    const applyCosmicTheme = () => {
        const cosmicSettings: Partial<AppSettings> = {
            themeMode: 'dark',
            appLayout: 'glass_dock',
            darkColors: {
                primary: '#ffffff',
                secondary: '#9ca3af',
                accent: '#38bdf8'
            },
            primaryFont: 'Inter'
        };
        const newSettings = { ...localSettings, ...cosmicSettings };
        setLocalSettings(newSettings);
        setSettings(newSettings);
        setActiveColorTab('dark');
        showFeedback('Cosmic Glass Theme Applied!');
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, fileType: 'logo' | 'font' | 'arabicFont') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (fileType === 'logo') {
                try {
                    showFeedback('Uploading Logo...');
                    // Dynamic import to avoid circular dependencies if any, or just standard import
                    // Ideally importing at top level is better, but for this snippet:
                    const { uploadLogo } = await import('../services/storageService');
                    const publicUrl = await uploadLogo(file);

                    const newSettings = { ...localSettings, logoUrl: publicUrl };
                    setLocalSettings(newSettings);
                    setSettings(newSettings);
                    saveSettings(); // Auto-save after upload
                    showFeedback('Logo Uploaded Successfully!');
                } catch (error) {
                    console.error("Logo upload failed", error);
                    showFeedback('Upload Failed. Check connection.');
                }
            } else {
                // Keep existing logic for Fonts (DataURL is fine for small fonts, or could update later)
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        const dataUrl = event.target.result as string;
                        let newSettings: AppSettings;

                        if (fileType === 'arabicFont') {
                            newSettings = { ...localSettings, arabicFontUrl: dataUrl };
                            showFeedback('Arabic Font Uploaded!');
                        } else {
                            // General Custom Font
                            const fontName = file.name.split('.').slice(0, -1).join('.');
                            if (localSettings.customFonts.some(f => f.name === fontName)) {
                                showFeedback(`Font "${fontName}" is already uploaded.`);
                                return;
                            }
                            const newFont = { name: fontName, dataUrl };
                            newSettings = {
                                ...localSettings,
                                customFonts: [...localSettings.customFonts, newFont],
                                primaryFont: fontName
                            };
                        }
                        setLocalSettings(newSettings);
                        setSettings(newSettings);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleRemoveFont = (fontName: string) => {
        const newFonts = localSettings.customFonts.filter(f => f.name !== fontName);
        let newSettings = { ...localSettings, customFonts: newFonts };

        // If the removed font was the primary or secondary font, reset to default
        if (localSettings.primaryFont === fontName) {
            newSettings.primaryFont = 'Inter';
        }
        if (localSettings.secondaryFont === fontName) {
            newSettings.secondaryFont = 'Poppins';
        }

        setLocalSettings(newSettings);
        setSettings(newSettings);
        showFeedback(`Font "${fontName}" removed.`);
    };

    // --- SOCIAL MEDIA HANDLERS ---
    const handleSocialChange = (index: number, field: 'platform' | 'url', value: string) => {
        const updated = [...localSettings.socialMediaLinks];
        updated[index] = { ...updated[index], [field]: value };
        const newSettings = { ...localSettings, socialMediaLinks: updated };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    };

    const addSocial = () => {
        const newSettings = {
            ...localSettings,
            socialMediaLinks: [...localSettings.socialMediaLinks, { platform: 'Facebook', url: '' }]
        };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    }

    const removeSocial = (index: number) => {
        const updated = localSettings.socialMediaLinks.filter((_, i) => i !== index);
        const newSettings = { ...localSettings, socialMediaLinks: updated };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    }

    // --- ADDRESS HANDLERS ---
    const handleAddressChange = (index: number, field: keyof CompanyAddress, value: string) => {
        const updated = [...localSettings.companyAddresses];
        updated[index] = { ...updated[index], [field]: value };
        const newSettings = { ...localSettings, companyAddresses: updated };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    };

    const addAddress = () => {
        const newAddress: CompanyAddress = {
            id: `addr_${Date.now()}`,
            street: '',
            city: '',
            state: '',
            zip: '',
            country: ''
        };
        const newSettings = { ...localSettings, companyAddresses: [...localSettings.companyAddresses, newAddress] };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    };

    const removeAddress = (index: number) => {
        const updated = localSettings.companyAddresses.filter((_, i) => i !== index);
        const newSettings = { ...localSettings, companyAddresses: updated };
        setLocalSettings(newSettings);
        setSettings(newSettings);
    };

    const handleSave = () => {
        saveSettings();
        showFeedback(t('settings.saved_success'));
    };

    const handleRestore = () => {
        restoreDefaults();
        showFeedback(t('settings.restored_success'));
    }

    const allFonts = [...FONT_PRESETS, ...localSettings.customFonts.map(f => f.name)];

    const currencyOptions = [
        { value: '$', label: '$ (USD)' },
        { value: '€', label: '€ (EUR)' },
        { value: 'DA', label: 'DZD (DA)' },
        { value: 'custom', label: 'Custom' },
    ];

    const currentCurrencySelection = currencyOptions.some(o => o.value === localSettings.currencySymbol)
        ? localSettings.currencySymbol
        : 'custom';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* BRANDING */}
                <Card title={t('settings.branding')}>
                    <SettingsRow label={t('settings.logo_upload')}>
                        <div className="flex items-center space-x-4">
                            <div className="w-20 h-20 bg-slate-200 dark:bg-gray-700 rounded-md flex items-center justify-center overflow-hidden border border-slate-300 dark:border-gray-600">
                                {localSettings.logoUrl && <img src={localSettings.logoUrl} alt="Logo Preview" className="object-contain" style={{ width: `${localSettings.logoSize}px`, height: `${localSettings.logoSize}px` }} />}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => logoInputRef.current?.click()} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 text-sm">Upload</button>
                                {localSettings.logoUrl && (
                                    <button onClick={() => {
                                        const s = { ...localSettings, logoUrl: '' };
                                        setLocalSettings(s); setSettings(s);
                                    }} className="text-xs text-red-500 hover:underline">Remove</button>
                                )}
                            </div>
                            <input type="file" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" className="hidden" />
                        </div>
                    </SettingsRow>
                    <SettingsRow label="Logo Size">
                        <div className="flex items-center space-x-4">
                            <input type="range" min="24" max="128" step="4" name="logoSize" value={localSettings.logoSize} onChange={handleInputChange} className="w-full" />
                            <span className="text-sm text-slate-500 dark:text-gray-400 w-12 text-right">{localSettings.logoSize}px</span>
                        </div>
                    </SettingsRow>
                    <SettingsRow label={t('settings.company_name')}>
                        <input type="text" name="companyName" value={localSettings.companyName} onChange={handleInputChange} className="w-full form-input" />
                    </SettingsRow>
                    <SettingsRow label="Company Name (Arabic)">
                        <input type="text" name="companyNameAr" value={localSettings.companyNameAr || ''} onChange={handleInputChange} className="w-full form-input" dir="rtl" placeholder="اسم الشركة" />
                    </SettingsRow>
                    <SettingsRow label={t('settings.tagline')}>
                        <input type="text" name="tagline" value={localSettings.tagline} onChange={handleInputChange} className="w-full form-input" />
                    </SettingsRow>
                </Card>

                {/* INTEGRATIONS */}
                {/* INTEGRATIONS */}
                <Card title="Integrations & AI">
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-gray-100">Google AI</h4>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">Powering Smart Features</p>
                                </div>
                            </div>
                            {localSettings.geminiApiKey ? (
                                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                                    ✓ Connected
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-slate-200 dark:bg-gray-600/30 text-slate-500 dark:text-gray-400 text-xs font-bold rounded-full border border-slate-300 dark:border-gray-600">
                                    Disconnected
                                </span>
                            )}
                        </div>

                        {!localSettings.geminiApiKey ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-600 dark:text-gray-300">
                                    Connect your Google account to enable <strong>AI Product Descriptions</strong>, <strong>Invoice Scanning</strong>, and <strong>Business Insights</strong>.
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => window.open('https://aistudio.google.com/app/apikey', '_blank')}
                                        className="w-full flex items-center justify-center gap-2 bg-transparent border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-bold py-2.5 rounded-md hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                    >
                                        <span>Step 1: Get Access Token from Google</span>
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-slate-300 dark:border-gray-600"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="px-2 bg-transparent text-xs text-slate-500 text-center">Step 2: Paste Token Below</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="password"
                                            name="geminiApiKey"
                                            value={localSettings.geminiApiKey || ''}
                                            onChange={handleInputChange}
                                            className="flex-1 form-input text-center font-mono text-sm"
                                            placeholder="Paste the token here (AIzaSy...)"
                                        />
                                        <button
                                            onClick={() => {
                                                const cleanedKey = (localSettings.geminiApiKey || '').trim();
                                                if (cleanedKey.startsWith('AIza')) {
                                                    const newSettings = { ...localSettings, geminiApiKey: cleanedKey };
                                                    setLocalSettings(newSettings);
                                                    setSettings(newSettings);
                                                    saveSettings();
                                                    showFeedback(t('settings.saved_success'));
                                                } else {
                                                    showFeedback("Invalid Token Format (Must start with AIza)");
                                                }
                                            }}
                                            disabled={!localSettings.geminiApiKey}
                                            className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-md transition-colors shadow-md"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-500">
                                        This connects the app to Google's Free AI Tier. No credit card required.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 rounded-md border border-slate-200 dark:border-gray-600 bg-transparent">
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">You are connected to Google AI</p>
                                <p className="text-xs text-slate-500 mb-3">Your token ends in ...{localSettings.geminiApiKey.slice(-4)}</p>
                                <button
                                    onClick={() => {
                                        const s = { ...localSettings, geminiApiKey: '' };
                                        setLocalSettings(s);
                                        setSettings(s);
                                        showFeedback("Disconnected from Google AI");
                                    }}
                                    className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium"
                                >
                                    Disconnect account
                                </button>
                            </div>
                        )}
                    </div>
                </Card>



                {/* WEBSITE & BANNERS */}
                <Card title="Website & Banners">
                    <BannerSettings />
                </Card>

                {/* SYSTEM & BOOT - Electron Only */}
                {(window as any).electron && (
                    <Card title="System & Boot">
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg border border-slate-200 dark:border-gray-600 bg-transparent">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-gray-100">Kiosk Mode (Store PC)</h4>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">Lock the app to fullscreen and block other apps.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={localSettings.kioskMode || false}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                const newSettings = { ...localSettings, kioskMode: val };
                                                setLocalSettings(newSettings);
                                                setSettings(newSettings);
                                                if ((window as any).electron) {
                                                    (window as any).electron.invoke('update-electron-settings', {
                                                        kioskMode: val,
                                                        autoLaunch: localSettings.autoLaunch
                                                    });
                                                }
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                                <p className="text-[10px] text-orange-500 mt-2 font-bold">⚠️ Warning: This makes it harder to exit the app. Use Alt+F4 to quit if needed.</p>
                            </div>

                            <div className="p-4 rounded-lg border border-slate-200 dark:border-gray-600 bg-transparent">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-gray-100">Auto-Launch on Boot</h4>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">Start the app automatically when Windows starts.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={localSettings.autoLaunch || false}
                                            onChange={(e) => {
                                                const val = e.target.checked;
                                                const newSettings = { ...localSettings, autoLaunch: val };
                                                setLocalSettings(newSettings);
                                                setSettings(newSettings);
                                                if ((window as any).electron) {
                                                    (window as any).electron.invoke('update-electron-settings', {
                                                        kioskMode: localSettings.kioskMode,
                                                        autoLaunch: val
                                                    });
                                                }
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* REGIONAL */}
                <Card title={t('settings.regional')}>
                    <SettingsRow label={t('settings.language')}>
                        <select name="language" value={localSettings.language} onChange={handleInputChange} className="form-select w-full">
                            <option value="en">English</option>
                            <option value="fr">Français (French)</option>
                            <option value="ar">العربية (Arabic)</option>
                        </select>
                    </SettingsRow>

                    <SettingsRow label={t('settings.currency')}>
                        <div className="flex gap-2">
                            <select
                                value={currentCurrencySelection}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                        handleInputChange({ target: { name: 'currencySymbol', value: '' } } as any);
                                    } else {
                                        handleInputChange({ target: { name: 'currencySymbol', value: val } } as any);
                                    }
                                }}
                                className="form-select w-1/3"
                            >
                                {currencyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            {currentCurrencySelection === 'custom' && (
                                <input
                                    type="text"
                                    name="currencySymbol"
                                    value={localSettings.currencySymbol}
                                    onChange={handleInputChange}
                                    placeholder="Symbol"
                                    className="form-input flex-1"
                                    maxLength={5}
                                    autoFocus
                                />
                            )}
                        </div>
                    </SettingsRow>

                    <SettingsRow label="Invoice Arabic Font (.ttf)">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => arabicFontInputRef.current?.click()}
                                className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 text-sm"
                            >
                                Upload Arabic Font
                            </button>
                            {localSettings.arabicFontUrl && <span className="text-xs text-green-600 font-bold">✓ Uploaded</span>}
                            {localSettings.arabicFontUrl && (
                                <button onClick={() => {
                                    const s = { ...localSettings, arabicFontUrl: '' };
                                    setLocalSettings(s); setSettings(s);
                                }} className="text-xs text-red-500 hover:underline">Clear</button>
                            )}
                            <input type="file" ref={arabicFontInputRef} onChange={(e) => handleFileChange(e, 'arabicFont')} accept=".ttf" className="hidden" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Required for generating PDF invoices in Arabic if standard fonts fail.</p>
                    </SettingsRow>
                </Card>

                {/* APPEARANCE & COLORS */}
                <Card title={t('settings.colors')}>
                    <SettingsRow label="UI Zoom (Scale)">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button 
                                onClick={() => {
                                    const newVal = Math.max(50, (localSettings.uiScale || 100) - 5);
                                    const s = { ...localSettings, uiScale: newVal };
                                    setLocalSettings(s); setSettings(s);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-zinc-800 rounded-full text-slate-700 dark:text-zinc-100 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
                            </button>
                            <input 
                                type="range" 
                                name="uiScale" 
                                min="50" 
                                max="150" 
                                step="5"
                                value={localSettings.uiScale || 100} 
                                onChange={handleInputChange} 
                                className="flex-grow h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <button 
                                onClick={() => {
                                    const newVal = Math.min(150, (localSettings.uiScale || 100) + 5);
                                    const s = { ...localSettings, uiScale: newVal };
                                    setLocalSettings(s); setSettings(s);
                                }}
                                className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-zinc-800 rounded-full text-slate-700 dark:text-zinc-100 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <span className="text-sm font-bold text-slate-700 dark:text-gray-300 w-10 text-right">
                                {localSettings.uiScale || 100}%
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Adjust the overall size of the interface. Lower values make everything smaller and fit more on screen.</p>
                    </SettingsRow>

                    <SettingsRow label="Theme Mode">
                        <select name="themeMode" value={localSettings.themeMode} onChange={handleInputChange} className="form-select w-full">
                            <option value="light">Light Mode</option>
                            <option value="dark">Dark Mode</option>
                            <option value="system">System Default</option>
                        </select>
                    </SettingsRow>

                    <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 mt-2">
                        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setActiveColorTab('light')}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeColorTab === 'light' ? 'bg-slate-200 text-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Light Mode Colors
                                </button>
                                <button
                                    onClick={() => setActiveColorTab('dark')}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeColorTab === 'dark' ? 'bg-gray-700 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                                >
                                    Dark Mode Colors
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleAutoGenerateDarkColors}
                                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1"
                                    title="Generate dark mode colors based on light mode colors"
                                >
                                    <span>✨ Auto-Generate Dark Colors</span>
                                </button>
                                <button
                                    onClick={applyCosmicTheme}
                                    className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded border border-gray-700 hover:bg-gray-900 flex items-center gap-1"
                                    title="Apply Cosmic Glass Theme"
                                >
                                    <span>🌌 Cosmic Glass Theme</span>
                                </button>
                            </div>
                        </div>

                        {activeColorTab === 'light' ? (
                            <div className="space-y-3 animate-fade-in">
                                <ColorPickerRow label={t('settings.primary_color')} name="primary" value={localSettings.lightColors.primary} onChange={(e) => handleColorChange(e, 'light')} />
                                <ColorPickerRow label={t('settings.secondary_color')} name="secondary" value={localSettings.lightColors.secondary} onChange={(e) => handleColorChange(e, 'light')} />
                                <ColorPickerRow label={t('settings.accent_color')} name="accent" value={localSettings.lightColors.accent} onChange={(e) => handleColorChange(e, 'light')} />
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in">
                                <ColorPickerRow label={t('settings.primary_color')} name="primary" value={localSettings.darkColors.primary} onChange={(e) => handleColorChange(e, 'dark')} />
                                <ColorPickerRow label={t('settings.secondary_color')} name="secondary" value={localSettings.darkColors.secondary} onChange={(e) => handleColorChange(e, 'dark')} />
                                <ColorPickerRow label={t('settings.accent_color')} name="accent" value={localSettings.darkColors.accent} onChange={(e) => handleColorChange(e, 'dark')} />
                            </div>
                        )}
                    </div>
                </Card>

                {/* TYPOGRAPHY */}
                <Card title={t('settings.typography')}>
                    <SettingsRow label="Font Size Scale">
                        <select name="fontSizeScale" value={localSettings.fontSizeScale} onChange={handleInputChange} className="w-full form-select">
                            <option value="sm">Small</option>
                            <option value="md">Medium</option>
                            <option value="lg">Large</option>
                        </select>
                    </SettingsRow>
                    <SettingsRow label="Custom UI Font">
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <button onClick={() => fontInputRef.current?.click()} className="px-4 py-2 bg-slate-200 dark:bg-gray-700 text-slate-800 dark:text-gray-200 rounded-md hover:bg-slate-300 dark:hover:bg-gray-600 text-sm">Upload Font</button>
                                <input type="file" ref={fontInputRef} onChange={(e) => handleFileChange(e, 'font')} accept=".ttf,.otf,.woff2" className="hidden" />
                            </div>

                            {localSettings.customFonts.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase">Uploaded Fonts:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {localSettings.customFonts.map(font => (
                                            <div key={font.name} className="flex items-center gap-2 bg-slate-100 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-slate-200 dark:border-gray-600">
                                                <span className="text-sm font-medium">{font.name}</span>
                                                <button
                                                    onClick={() => handleRemoveFont(font.name)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                    title="Delete Font"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </SettingsRow>

                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
                        <h4 className="text-lg font-semibold mb-4 text-slate-700 dark:text-gray-300">Body Typography</h4>
                        <SettingsRow label={t('settings.font_family')}>
                            <select name="primaryFont" value={localSettings.primaryFont} onChange={handleInputChange} className="w-full form-select">
                                {allFonts.map(font => <option key={font} value={font}>{font}</option>)}
                            </select>
                        </SettingsRow>
                        <SettingsRow label="Font Weight">
                            <select name="primaryFontWeight" value={localSettings.primaryFontWeight} onChange={handleInputChange} className="w-full form-select">
                                {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label} ({w.value})</option>)}
                            </select>
                        </SettingsRow>
                        <SettingsRow label="Letter Spacing">
                            <input type="text" name="primaryLetterSpacing" value={localSettings.primaryLetterSpacing} onChange={handleInputChange} placeholder="e.g., normal, 0.05em, 1px" className="w-full form-input" />
                        </SettingsRow>
                        <ColorPickerRow label="Font Color (Light Mode)" name="primaryFontColor" value={localSettings.primaryFontColor} onChange={handleInputChange} />
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-zinc-800">
                        <h4 className="text-lg font-semibold mb-4 text-slate-700 dark:text-gray-300">Heading Typography</h4>
                        <SettingsRow label={t('settings.font_family')}>
                            <select name="secondaryFont" value={localSettings.secondaryFont} onChange={handleInputChange} className="w-full form-select">
                                {allFonts.map(font => <option key={font} value={font}>{font}</option>)}
                            </select>
                        </SettingsRow>
                        <SettingsRow label="Font Weight">
                            <select name="secondaryFontWeight" value={localSettings.secondaryFontWeight} onChange={handleInputChange} className="w-full form-select">
                                {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label} ({w.value})</option>)}
                            </select>
                        </SettingsRow>
                        <SettingsRow label="Letter Spacing">
                            <input type="text" name="secondaryLetterSpacing" value={localSettings.secondaryLetterSpacing} onChange={handleInputChange} placeholder="e.g., normal, -0.025em" className="w-full form-input" />
                        </SettingsRow>
                        <ColorPickerRow label="Heading Color (Light Mode)" name="secondaryFontColor" value={localSettings.secondaryFontColor} onChange={handleInputChange} />
                    </div>
                </Card>

                {/* PREVIEW */}
                <Card title={t('settings.preview')}>
                    <div className={`p-4 border border-slate-200 dark:border-zinc-800 rounded-lg transition-colors duration-300 ${activeColorTab === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-slate-800'}`}>
                        <div className="flex items-center mb-4">
                            {localSettings.logoUrl && <img src={localSettings.logoUrl} className="mr-3 object-contain" style={{ width: `${localSettings.logoSize}px`, height: `${localSettings.logoSize}px` }} alt="Logo" />}
                            <div>
                                <h4 className="text-lg" style={{
                                    fontFamily: localSettings.secondaryFont,
                                    fontWeight: localSettings.secondaryFontWeight,
                                    letterSpacing: localSettings.secondaryLetterSpacing,
                                    color: localSettings.secondaryFontColor,
                                }}>{localSettings.companyName || 'Company Name'}</h4>
                                <p className="text-sm" style={{
                                    fontFamily: localSettings.primaryFont,
                                    fontWeight: localSettings.primaryFontWeight,
                                    letterSpacing: localSettings.primaryLetterSpacing,
                                    color: localSettings.primaryFontColor,
                                }}>{localSettings.tagline || 'Tagline'}</p>
                            </div>
                        </div>
                        <div className={`text-xs mb-2 ${activeColorTab === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
                            {localSettings.companyAddresses[0] && (
                                <p>
                                    {localSettings.companyAddresses[0].street}
                                    {localSettings.companyAddresses[0].city ? `, ${localSettings.companyAddresses[0].city}` : ''}
                                </p>
                            )}
                            {localSettings.companyPhones[0] && <p>Tel: {localSettings.companyPhones[0]}</p>}
                            {localSettings.rcNumber && <p>RC: {localSettings.rcNumber}</p>}
                        </div>

                        {/* Dynamic Preview Colors based on current editing tab */}
                        <div className="flex space-x-2">
                            <button style={{ backgroundColor: activeColorTab === 'dark' ? localSettings.darkColors.primary : localSettings.lightColors.primary, fontFamily: localSettings.primaryFont }} className="text-white px-4 py-2 rounded-md">Primary</button>
                            <button style={{ backgroundColor: activeColorTab === 'dark' ? localSettings.darkColors.secondary : localSettings.lightColors.secondary, fontFamily: localSettings.primaryFont }} className="text-white px-4 py-2 rounded-md">Secondary</button>
                            <button style={{ backgroundColor: activeColorTab === 'dark' ? localSettings.darkColors.accent : localSettings.lightColors.accent, fontFamily: localSettings.primaryFont }} className="text-white px-4 py-2 rounded-md">Accent</button>
                        </div>
                    </div>
                </Card>
            </div>

            <Card title={t('settings.company_info')}>
                {/* Legal Info */}
                <div className="mb-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase mb-4">Professional / Legal Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Legal Name & Form (e.g. SARL ...)</label>
                            <input type="text" name="legalName" value={localSettings.legalName} onChange={handleInputChange} className="w-full form-input" placeholder="SARL MY COMPANY" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-slate-500 uppercase font-bold">Legal Name (Arabic)</label>
                            <input type="text" name="legalNameAr" value={localSettings.legalNameAr || ''} onChange={handleInputChange} className="w-full form-input" dir="rtl" placeholder="الاسم القانوني" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">RC (Trade Register)</label>
                            <input type="text" name="rcNumber" value={localSettings.rcNumber} onChange={handleInputChange} className="w-full form-input" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">NIF (Tax ID)</label>
                            <input type="text" name="nifNumber" value={localSettings.nifNumber} onChange={handleInputChange} className="w-full form-input" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">NIS (Stat ID)</label>
                            <input type="text" name="nisNumber" value={localSettings.nisNumber} onChange={handleInputChange} className="w-full form-input" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 uppercase font-bold">ART (Art. Imp.)</label>
                            <input type="text" name="artNumber" value={localSettings.artNumber} onChange={handleInputChange} className="w-full form-input" />
                        </div>
                    </div>
                </div>

                {/* Address Manager */}
                <div className="mb-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase">{t('settings.company_address')}</h4>
                    </div>

                    <div className="space-y-4 mb-4">
                        {localSettings.companyAddresses.map((addr, idx) => (
                            <div key={addr.id} className="p-3 bg-slate-50 dark:bg-gray-700/30 rounded border border-slate-200 dark:border-gray-600 relative group">
                                <button
                                    onClick={() => removeAddress(idx)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                    title="Remove Address"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <div className="grid grid-cols-2 gap-3 pr-6">
                                    <div className="col-span-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Street</label>
                                        <input
                                            type="text"
                                            value={addr.street}
                                            onChange={(e) => handleAddressChange(idx, 'street', e.target.value)}
                                            className="form-input w-full text-sm"
                                            placeholder="123 Main St"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500">City</label>
                                        <input
                                            type="text"
                                            value={addr.city}
                                            onChange={(e) => handleAddressChange(idx, 'city', e.target.value)}
                                            className="form-input w-full text-sm"
                                            placeholder="City"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500">State / Prov</label>
                                        <input
                                            type="text"
                                            value={addr.state}
                                            onChange={(e) => handleAddressChange(idx, 'state', e.target.value)}
                                            className="form-input w-full text-sm"
                                            placeholder="State"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Zip / Postal</label>
                                        <input
                                            type="text"
                                            value={addr.zip}
                                            onChange={(e) => handleAddressChange(idx, 'zip', e.target.value)}
                                            className="form-input w-full text-sm"
                                            placeholder="Zip"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-slate-500">Country</label>
                                        <input
                                            type="text"
                                            value={addr.country}
                                            onChange={(e) => handleAddressChange(idx, 'country', e.target.value)}
                                            className="form-input w-full text-sm"
                                            placeholder="Country"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={addAddress} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                            + Add Address
                        </button>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">Address (Arabic)</label>
                        <textarea
                            name="addressAr"
                            value={localSettings.addressAr || ''}
                            onChange={handleInputChange}
                            className="form-input w-full text-sm mt-1"
                            dir="rtl"
                            placeholder="العنوان الكامل"
                            rows={2}
                        />
                    </div>
                </div>

                {/* Simple Lists */}
                <SettingsRow label={t('settings.company_phone')} alignTop>
                    <MultiInput
                        label="Phone"
                        values={localSettings.companyPhones}
                        onChange={(vals) => { setLocalSettings({ ...localSettings, companyPhones: vals }); setSettings({ ...localSettings, companyPhones: vals }); }}
                        placeholder="+1 234..."
                    />
                </SettingsRow>
                <SettingsRow label={t('settings.company_email')} alignTop>
                    <MultiInput
                        label="Email"
                        values={localSettings.companyEmails}
                        onChange={(vals) => { setLocalSettings({ ...localSettings, companyEmails: vals }); setSettings({ ...localSettings, companyEmails: vals }); }}
                        placeholder="contact@..."
                        type="email"
                    />
                </SettingsRow>
                <SettingsRow label={t('settings.company_website')} alignTop>
                    <MultiInput
                        label="Website"
                        values={localSettings.companyWebsites}
                        onChange={(vals) => { setLocalSettings({ ...localSettings, companyWebsites: vals }); setSettings({ ...localSettings, companyWebsites: vals }); }}
                        placeholder="www.company.com"
                    />
                </SettingsRow>

                <SettingsRow label={t('settings.business_activity')} alignTop>
                    <MultiInput
                        label="Activity"
                        values={localSettings.businessActivities}
                        onChange={(vals) => { setLocalSettings({ ...localSettings, businessActivities: vals }); setSettings({ ...localSettings, businessActivities: vals }); }}
                        placeholder="Search code or name..."
                        list="business-activities"
                    />
                    <datalist id="business-activities">
                        {BUSINESS_ACTIVITIES.map(act => (
                            <option key={act.code} value={`${act.code} - ${act.label}`} />
                        ))}
                    </datalist>
                </SettingsRow>

                <SettingsRow label="Activity (Arabic)" alignTop>
                    <input
                        type="text"
                        name="businessActivityAr"
                        value={localSettings.businessActivityAr || ''}
                        onChange={handleInputChange}
                        className="form-input w-full"
                        dir="rtl"
                        placeholder="النشاط التجاري"
                    />
                </SettingsRow>

                {/* Social Media Manager */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase mb-3">{t('settings.social_media')}</h4>
                    <div className="space-y-3">
                        {localSettings.socialMediaLinks.map((link, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <div className="w-1/3 space-y-1">
                                    <select
                                        value={SOCIAL_PLATFORMS.includes(link.platform) ? link.platform : 'Custom'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'Custom') handleSocialChange(index, 'platform', '');
                                            else handleSocialChange(index, 'platform', val);
                                        }}
                                        className="form-select w-full"
                                    >
                                        {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                        <option value="Custom">Custom</option>
                                    </select>
                                    {(!SOCIAL_PLATFORMS.includes(link.platform) || link.platform === '') && (
                                        <input
                                            type="text"
                                            placeholder="Platform Name"
                                            value={link.platform}
                                            onChange={(e) => handleSocialChange(index, 'platform', e.target.value)}
                                            className="form-input w-full text-xs"
                                        />
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={link.url}
                                    onChange={(e) => handleSocialChange(index, 'url', e.target.value)}
                                    className="form-input flex-1"
                                    placeholder="URL or Handle"
                                />
                                <button onClick={() => removeSocial(index)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                        <button onClick={addSocial} className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                            + Add Social Media
                        </button>
                    </div>
                </div>
            </Card>

            <Card title={t('settings.manage_fields')}>
                <FieldManager />
            </Card>

            <div className="flex justify-end items-center space-x-4 mt-6 pb-12">
                {feedback && <span className="text-green-500 transition-opacity duration-300 font-bold">{feedback}</span>}
                <button onClick={handleRestore} className="px-6 py-2 bg-slate-500 text-white rounded-md hover:bg-gray-600">{t('settings.restore')}</button>
                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold shadow-lg" style={{ backgroundColor: currentColors.primary }}>{t('settings.save')}</button>
            </div>

            <div className="text-center text-xs text-gray-300 mt-8 pb-4">
                v2.1 - Settings Loaded
            </div>

            <style>{`
        .form-input, .form-select {
          background-color: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          width: 100%;
        }
        .dark .form-input, .dark .form-select {
          background-color: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }
        input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            background: #e5e7eb;
            border-radius: 9999px;
            height: 0.5rem;
        }
        .dark input[type="range"] {
            background: #4b5563;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 9999px;
            background: var(--color-primary, #3b82f6);
            cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 9999px;
            background: var(--color-primary, #3b82f6);
            cursor: pointer;
        }
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
       `}</style>
        </div>
    );
};

export default SettingsPanel;
