
import { Sale } from '../constants/billingTypes';
import { AppSettings, CompanyAddress } from '../constants/defaultSettings';

// Loaded via CDN in index.html
const jsPDF = (window as any).jspdf.jsPDF;
// JsBarcode is loaded via CDN in index.html
const JsBarcode = (window as any).JsBarcode;

// --- TRANSLATION DICTIONARY ---
const INVOICE_LABELS = {
    fr: {
        title: "BON DE LIVRAISON - FACTURE",
        no: "N°",
        account: "Compte",
        rib: "RIB",
        email: "e-mail",
        website: "Site web",
        rc: "RC",
        ai: "AI",
        nif: "NIF",
        nis: "NIS",
        datePrefix: "le",
        paymentMode: "Mode de Paiement",
        billTo: "DOIT",
        clientPassager: "CLIENT PASSAGER",
        tel: "Tél",
        col_no: "N°",
        col_code: "CODE",
        col_desc: "DESIGNATION",
        col_qty: "QTE",
        col_price: "PU HT",
        col_disc: "REM.%",
        col_total: "MONTANT HT",
        col_vat: "TVA",
        total_units: "NB. UV",
        stopped_at: "Arrêté la présente facture à la somme de :",
        total_ht: "TOTAL HT",
        vat: "TVA",
        stamp: "TIMBRE",
        net_to_pay: "NET A PAYER",
        admin: "Administrateur",
        seller: "Vendeur",
        sig_client: "Signature client",
        sig_seller: "Signature vendeur",
        tax_base: "Base HT",
        tax_amount: "Montant TVA",
        page: "Page",
        vat_0: "TVA 0%",
        total: "Total"
    },
    en: {
        title: "DELIVERY NOTE - INVOICE",
        no: "No",
        account: "Account",
        rib: "IBAN",
        email: "Email",
        website: "Website",
        rc: "RC",
        ai: "AI",
        nif: "Tax ID",
        nis: "NIS",
        datePrefix: "Date",
        paymentMode: "Payment Method",
        billTo: "BILL TO",
        clientPassager: "WALK-IN CUSTOMER",
        tel: "Tel",
        col_no: "#",
        col_code: "CODE",
        col_desc: "DESCRIPTION",
        col_qty: "QTY",
        col_price: "UNIT PRICE",
        col_disc: "DISC%",
        col_total: "AMOUNT",
        col_vat: "VAT",
        total_units: "Total Units",
        stopped_at: "Total amount in words:",
        total_ht: "SUBTOTAL",
        vat: "VAT",
        stamp: "STAMP",
        net_to_pay: "TOTAL DUE",
        admin: "Administrator",
        seller: "Seller",
        sig_client: "Customer Signature",
        sig_seller: "Seller Signature",
        tax_base: "Base Amt",
        tax_amount: "Tax Amt",
        page: "Page",
        vat_0: "VAT 0%",
        total: "Total"
    },
    ar: {
        title: "فاتورة - سند تسليم",
        no: "رقم",
        account: "حساب",
        rib: "RIB",
        email: "إيميل",
        website: "موقع",
        rc: "سجل تجاري",
        ai: "مادة ضريبية",
        nif: "رقم جبائي",
        nis: "رقم إحصائي",
        datePrefix: "التاريخ",
        paymentMode: "طريقة الدفع",
        billTo: "مطلوب من",
        clientPassager: "عميل عابر",
        tel: "هاتف",
        col_no: "رقم",
        col_code: "كود",
        col_desc: "البيان",
        col_qty: "كمية",
        col_price: "سعر الوحدة",
        col_disc: "خصم",
        col_total: "المبلغ",
        col_vat: "ضريبة",
        total_units: "عدد الوحدات",
        stopped_at: "المبلغ الإجمالي بالحروف:",
        total_ht: "المجموع",
        vat: "الضريبة",
        stamp: "الطابع",
        net_to_pay: "الصافي للدفع",
        admin: "المدير",
        seller: "البائع",
        sig_client: "توقيع العميل",
        sig_seller: "توقيع البائع",
        tax_base: "الأساس",
        tax_amount: "قيمة الضريبة",
        page: "صفحة",
        vat_0: "ضريبة 0%",
        total: "الإجمالي"
    }
};

const PAYMENT_METHODS_TRANS = {
    cash: { en: 'Cash', fr: 'Espèces', ar: 'نقدي' },
    card: { en: 'Card', fr: 'Carte Bancaire', ar: 'بطاقة' },
    transfer: { en: 'Transfer', fr: 'Virement', ar: 'تحويل' },
    debt: { en: 'Credit/Debt', fr: 'Crédit', ar: 'آجل' }
};

const formatCurrency = (amount: number | undefined | null, settings: AppSettings) => {
    const num = typeof amount === 'number' ? amount : 0;
    const symbol = settings.currencySymbol;
    const isRight = symbol === 'DA' || symbol === 'DZD';
    // Format with space thousands separator
    const val = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return isRight ? `${val} ${symbol}` : `${symbol}${val}`;
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
};

const formatAddress = (addr: CompanyAddress | undefined): string => {
    if (!addr) return '';
    const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(p => p && p.trim() !== '');
    return parts.join(', ');
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = url;
    });
};

const generateBarcodeBase64 = (text: string): string => {
    const canvas = document.createElement("canvas");
    try {
        JsBarcode(canvas, text, {
            format: "CODE128",
            displayValue: false,
            width: 2,
            height: 40,
            margin: 0
        });
        return canvas.toDataURL("image/png");
    } catch (e) {
        console.error("Barcode gen failed", e);
        return "";
    }
};

// --- FONT LOADER HELPER ---
const loadArabicFont = async (doc: any, settings: AppSettings): Promise<string | null> => {
    const fontName = "ArabicFont";

    // 1. Check if user uploaded a font
    if (settings.arabicFontUrl) {
        try {
            const base64 = settings.arabicFontUrl.split(',')[1];
            if (base64) {
                doc.addFileToVFS(fontName + ".ttf", base64);
                doc.addFont(fontName + ".ttf", fontName, "normal");
                doc.addFont(fontName + ".ttf", fontName, "bold");
                return fontName;
            }
        } catch (e) {
            console.error("Failed to load uploaded Arabic font", e);
        }
    }

    // 2. Fallback to online fonts
    const fontUrls = [
        'https://fonts.gstatic.com/s/amiri/v26/J7aRnpd8CGxBHpUrtLMA7w.ttf',
        'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf'
    ];

    for (const url of fontUrls) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;

            const buffer = await response.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            const chunkSize = 8192;

            for (let i = 0; i < len; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
                binary += String.fromCharCode.apply(null, chunk as any);
            }

            const base64 = btoa(binary);
            doc.addFileToVFS(fontName + ".ttf", base64);
            doc.addFont(fontName + ".ttf", fontName, "normal");
            doc.addFont(fontName + ".ttf", fontName, "bold");
            return fontName;
        } catch (e) {
            console.warn(`Failed to load fallback Arabic font from ${url}`, e);
        }
    }

    return null;
};

// --- NUMBER TO WORDS ENGINE ---

// French & English helpers (Keep existing logic)
const FRENCH_UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const FRENCH_TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const FRENCH_TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

const convertGroupFr = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return FRENCH_UNITS[n];
    if (n < 20) return FRENCH_TEENS[n - 10];
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (ten === 7) return `soixante-${FRENCH_TEENS[unit]}`;
    if (ten === 9) return `quatre-vingt-${FRENCH_TEENS[unit]}`;
    if (ten === 8) return unit === 0 ? 'quatre-vingts' : `quatre-vingt-${FRENCH_UNITS[unit]}`;
    const link = unit === 1 ? '-et-' : '-';
    return `${FRENCH_TENS[ten]}${unit > 0 ? link + FRENCH_UNITS[unit] : ''}`;
};

const convertHundredsFr = (n: number): string => {
    if (n > 999) return '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += hundred === 1 ? 'cent' : `${FRENCH_UNITS[hundred]} cent${rest === 0 ? 's' : ''}`;
    if (rest > 0) str += (str ? ' ' : '') + convertGroupFr(rest);
    return str;
};

const numberToWordsFr = (n: number): string => {
    if (n === 0) return 'zéro';
    let str = '';
    const millions = Math.floor(n / 1000000);
    let remainder = n % 1000000;
    if (millions > 0) str += `${convertHundredsFr(millions)} million${millions > 1 ? 's' : ''} `;
    const thousands = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    if (thousands > 0) str += thousands === 1 ? 'mille ' : `${convertHundredsFr(thousands)} mille `;
    if (remainder > 0) str += convertHundredsFr(remainder);
    return str.trim();
};

const ENGLISH_UNITS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const ENGLISH_TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const ENGLISH_TENS = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const convertGroupEn = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ENGLISH_UNITS[n];
    if (n < 20) return ENGLISH_TEENS[n - 10];
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    return `${ENGLISH_TENS[ten]}${unit > 0 ? '-' + ENGLISH_UNITS[unit] : ''}`;
};

const convertHundredsEn = (n: number): string => {
    if (n > 999) return '';
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += `${ENGLISH_UNITS[hundred]} hundred`;
    if (rest > 0) str += (str ? ' and ' : '') + convertGroupEn(rest);
    return str;
};

const numberToWordsEn = (n: number): string => {
    if (n === 0) return 'zero';
    let str = '';
    const millions = Math.floor(n / 1000000);
    let remainder = n % 1000000;
    if (millions > 0) str += `${convertHundredsEn(millions)} million `;
    const thousands = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    if (thousands > 0) str += `${convertHundredsEn(thousands)} thousand `;
    if (remainder > 0) str += convertHundredsEn(remainder);
    return str.trim();
};

// --- ARABIC NUMBER TO WORDS IMPLEMENTATION ---
const ones = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function convertHundredsAr(num: number): string {
    let result = "";
    if (num > 99) {
        result += hundreds[Math.floor(num / 100)];
        num %= 100;
        if (num > 0) result += " و ";
    }
    if (num > 0) {
        if (num < 20) {
            result += ones[num];
        } else {
            result += ones[num % 10];
            if (num % 10 > 0) result += " و ";
            result += tens[Math.floor(num / 10)];
        }
    }
    return result;
}

const numberToWordsAr = (number: number): string => {
    if (number === 0) return "صفر";
    if (number > 999999999) return String(number); // Fallback for huge numbers

    const parts = [];

    // Millions
    const millions = Math.floor(number / 1000000);
    number %= 1000000;
    if (millions > 0) {
        if (millions === 1) parts.push("مليون");
        else if (millions === 2) parts.push("مليونان");
        else if (millions >= 3 && millions <= 10) parts.push(convertHundredsAr(millions) + " ملايين");
        else parts.push(convertHundredsAr(millions) + " مليون");
    }

    // Thousands
    const thousands = Math.floor(number / 1000);
    number %= 1000;
    if (thousands > 0) {
        if (thousands === 1) parts.push("ألف");
        else if (thousands === 2) parts.push("ألفان");
        else if (thousands >= 3 && thousands <= 10) parts.push(convertHundredsAr(thousands) + " آلاف");
        else parts.push(convertHundredsAr(thousands) + " ألف");
    }

    // Units
    if (number > 0) {
        parts.push(convertHundredsAr(number));
    }

    return parts.join(" و ");
};

const getCurrencyText = (symbol: string, lang: 'fr' | 'en' | 'ar') => {
    if (symbol === 'DA' || symbol === 'DZD') {
        if (lang === 'fr') return { major: 'Dinars Algériens', minor: 'Centimes' };
        if (lang === 'ar') return { major: 'دينار جزائري', minor: 'سنتيم' };
        return { major: 'Algerian Dinars', minor: 'Centimes' };
    }
    if (symbol === '$' || symbol === 'USD') {
        if (lang === 'fr') return { major: 'Dollars', minor: 'Cents' };
        if (lang === 'ar') return { major: 'دولار', minor: 'سنت' };
        return { major: 'Dollars', minor: 'Cents' };
    }
    if (symbol === '€' || symbol === 'EUR') {
        if (lang === 'fr') return { major: 'Euros', minor: 'Centimes' };
        if (lang === 'ar') return { major: 'يورو', minor: 'سنت' };
        return { major: 'Euros', minor: 'Cents' };
    }
    return { major: symbol, minor: '' };
};

const convertTotalToWords = (amount: number, lang: 'fr' | 'en' | 'ar', symbol: string): string => {
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);
    const currency = getCurrencyText(symbol, lang);

    if (lang === 'fr') {
        let text = numberToWordsFr(integerPart);
        text = text.charAt(0).toUpperCase() + text.slice(1) + ` ${currency.major}`;
        if (decimalPart > 0) text += ` et ${numberToWordsFr(decimalPart)} ${currency.minor}`;
        return `*** ${text} ***`;
    }

    if (lang === 'en') {
        let text = numberToWordsEn(integerPart);
        text = text.charAt(0).toUpperCase() + text.slice(1) + ` ${currency.major}`;
        if (decimalPart > 0) text += ` and ${numberToWordsEn(decimalPart)} ${currency.minor}`;
        return `*** ${text} ***`;
    }

    if (lang === 'ar') {
        let text = numberToWordsAr(integerPart);
        text += ` ${currency.major}`;
        if (decimalPart > 0) text += ` و ${numberToWordsAr(decimalPart)} ${currency.minor}`;
        return `*** ${text} ***`;
    }

    return `*** ${amount.toFixed(2)} ${currency.major} ***`;
};


// --- THERMAL RECEIPT ---
export const generateThermalReceiptPDF = async (sale: Sale, settings: AppSettings) => {
    const pageWidth = 226;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: [pageWidth, 1000]
    });

    let primaryFont = "courier";

    if (settings.language === 'ar' || /[\u0600-\u06FF]/.test(settings.companyName)) {
        const arabicFont = await loadArabicFont(doc, settings);
        if (arabicFont) {
            primaryFont = arabicFont;
        }
    }

    let y = 20;
    const lineHeight = 12;

    if (settings.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            const imgW = 60;
            const imgH = (img.height / img.width) * imgW;
            const x = (pageWidth - imgW) / 2;
            doc.addImage(img, 'PNG', x, y, imgW, imgH);
            y += imgH + 10;
        } catch (e) { }
    }

    doc.setFont(primaryFont, "bold");
    doc.setFontSize(12);
    doc.text(settings.companyName.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += lineHeight + 2;

    doc.setFont(primaryFont, "normal");
    doc.setFontSize(9);

    if (settings.companyAddresses && settings.companyAddresses.length > 0) {
        const addrStr = formatAddress(settings.companyAddresses[0]);
        const lines = doc.splitTextToSize(addrStr, contentWidth);
        doc.text(lines, pageWidth / 2, y, { align: "center" });
        y += (lines.length * lineHeight);
    }

    if (settings.companyPhones && settings.companyPhones.length > 0) {
        doc.text(`Tel: ${settings.companyPhones[0]}`, pageWidth / 2, y, { align: "center" });
        y += lineHeight;
    }

    y += 5;
    const dashedLine = "-".repeat(42);
    doc.text(dashedLine, margin, y);
    y += lineHeight;

    doc.text(`Order #: ${sale.friendlyId || sale.id.slice(-8).toUpperCase()}`, margin, y);
    y += lineHeight;
    doc.text(`Date: ${formatDate(sale.date)}`, margin, y);
    y += lineHeight;
    doc.text(`Cashier: ${sale.cashierName}`, margin, y);

    y += lineHeight;
    doc.text(dashedLine, margin, y);
    y += lineHeight;

    doc.setFont(primaryFont, "bold");
    doc.text("Item", margin, y);
    doc.text("Total", pageWidth - margin, y, { align: "right" });
    y += lineHeight;
    doc.setFont(primaryFont, "normal");

    sale.items.forEach(item => {
        const itemTotal = formatCurrency((item.unitPrice * item.quantity) - item.discountValue, settings);
        const nameLines = doc.splitTextToSize(item.name, contentWidth * 0.65);
        doc.text(nameLines, margin, y);
        doc.text(`${item.quantity} x ${formatCurrency(item.unitPrice, settings)}`, margin, y + (nameLines.length * 10));
        doc.text(itemTotal, pageWidth - margin, y, { align: "right" });
        y += (nameLines.length * 10) + lineHeight;
    });

    doc.text(dashedLine, margin, y);
    y += lineHeight + 5;

    const drawRow = (label: string, value: string, bold = false) => {
        doc.setFont(primaryFont, bold ? "bold" : "normal");
        doc.text(label, margin, y);
        doc.text(value, pageWidth - margin, y, { align: "right" });
        y += lineHeight;
    };

    drawRow("Subtotal", formatCurrency(sale.subtotal, settings));
    if (sale.discount > 0) drawRow("Discount", `-${formatCurrency(sale.discount, settings)}`);
    if (sale.tax > 0) drawRow("Tax", formatCurrency(sale.tax, settings));
    y += 5;
    doc.setFontSize(16);
    drawRow("TOTAL", formatCurrency(sale.total, settings), true);
    doc.setFontSize(9);

    doc.save(`Receipt_${sale.id}.pdf`);
};

// --- A4 INVOICE GENERATOR ---
export const generateA4InvoicePDF = async (sale: Sale, settings: AppSettings, lang: 'en' | 'fr' | 'ar' = 'fr') => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.width; // 210mm
    const height = doc.internal.pageSize.height; // 297mm
    const leftMargin = 10;
    const rightMargin = 10;

    // --- FONT HANDLING ---
    let primaryFont = "helvetica";

    if (lang === 'ar') {
        // Load Arabic font
        const arabicFontName = await loadArabicFont(doc, settings);
        if (arabicFontName) {
            primaryFont = arabicFontName;
        } else {
            alert("Could not load Arabic font. Text may appear incorrect. Please check your internet connection or upload a font in Settings.");
        }
    }

    // Only apply custom user fonts if NOT in Arabic mode OR if user explicitly wants them
    // But since Arabic requires specific fonts, we prioritize the Arabic font loader if lang=ar
    if (lang !== 'ar' && settings.customFonts && settings.customFonts.length > 0) {
        settings.customFonts.forEach(font => {
            if (font.dataUrl) {
                try {
                    const base64 = font.dataUrl.split(',')[1];
                    const fileName = `${font.name}.ttf`;
                    doc.addFileToVFS(fileName, base64);
                    doc.addFont(fileName, font.name, 'normal');
                    doc.addFont(fileName, font.name, 'bold');
                    primaryFont = font.name;
                } catch (e) {
                    console.error("Font load error", e);
                }
            }
        });
    }

    doc.setFont(primaryFont);

    // Select Translation
    const L = INVOICE_LABELS[lang] || INVOICE_LABELS.fr;
    const isRTL = lang === 'ar';

    // --- RTL HELPERS ---
    const fX = (val: number) => isRTL ? width - val : val; // Flip X coordinate
    const alignStart = isRTL ? 'right' : 'left';
    const alignEnd = isRTL ? 'left' : 'right';

    // --- DETERMINING HEADER CONTENT (Supports Arabic Fields) ---
    const displayCompanyName = (isRTL && settings.companyNameAr) ? settings.companyNameAr : settings.companyName;
    const displayLegalName = (isRTL && settings.legalNameAr) ? settings.legalNameAr : settings.legalName;

    let displayAddress = "";
    if (isRTL && settings.addressAr) {
        displayAddress = settings.addressAr;
    } else if (settings.companyAddresses && settings.companyAddresses.length > 0) {
        displayAddress = formatAddress(settings.companyAddresses[0]);
    }

    let displayActivity = "";
    if (isRTL && settings.businessActivityAr) {
        displayActivity = settings.businessActivityAr;
    } else if (settings.businessActivities && settings.businessActivities.length > 0) {
        const act = settings.businessActivities[0];
        displayActivity = act.includes(' - ') ? act.split(' - ')[1] : act;
    }

    let y = 10;

    // --- HEADER SECTION ---

    // 1. Logo (Top Right in LTR, Top Left in RTL)
    if (settings.logoUrl) {
        try {
            const img = await loadImage(settings.logoUrl);
            const maxLogoW = 50;
            const maxLogoH = 25;
            const ratio = Math.min(maxLogoW / img.width, maxLogoH / img.height);
            const imgW = img.width * ratio;
            const imgH = img.height * ratio;

            // LTR: width - rightMargin - imgW
            // RTL: rightMargin (which acts as left margin physically)
            const logoX = isRTL ? rightMargin : width - rightMargin - imgW;
            doc.addImage(img, 'PNG', logoX, y, imgW, imgH);
        } catch (e) { console.warn("Logo load failed", e); }
    }

    // 2. Company Info (Top Left in LTR, Top Right in RTL)
    doc.setFontSize(22);
    doc.setFont(primaryFont, "bold");

    const infoX = fX(leftMargin);
    doc.text(displayCompanyName.toUpperCase(), infoX, y + 8, { align: alignStart });
    y += 14;

    // Legal Name
    if (displayLegalName && displayLegalName !== displayCompanyName) {
        doc.setFontSize(10);
        doc.setFont(primaryFont, "bold");
        doc.text(displayLegalName, infoX, y, { align: alignStart });
        y += 4;
    }

    // Activity
    doc.setFontSize(9);
    doc.setFont(primaryFont, "normal");
    if (displayActivity) {
        const lines = doc.splitTextToSize(displayActivity, 120);
        doc.text(lines, infoX, y, { align: alignStart });
        y += (lines.length * 3.5) + 1;
    }

    // Address
    if (displayAddress) {
        const addrLines = doc.splitTextToSize(displayAddress, 120);
        doc.text(addrLines, infoX, y, { align: alignStart });
        y += (addrLines.length * 4);
    }

    // Phone
    if (settings.companyPhones && settings.companyPhones.length > 0) {
        doc.text(`${L.tel} : ${settings.companyPhones.join(' / ')}`, infoX, y, { align: alignStart });
        y += 4;
    }

    // --- TITLE BLOCK ---
    y = Math.max(y, 45); // Ensure clearance
    y += 5;

    doc.setFontSize(18);
    doc.setFont(primaryFont, "bold");
    const docNumber = `${L.no}: ${sale.friendlyId || sale.id}`;

    // Center alignment is invariant to mirroring
    doc.text(L.title, width / 2, y, { align: "center" });
    y += 6;
    doc.setFontSize(12);
    doc.text(docNumber, width / 2, y, { align: "center" });
    y += 5;

    // --- BARCODE ---
    const barcodeBase64 = generateBarcodeBase64(sale.id);
    if (barcodeBase64) {
        doc.addImage(barcodeBase64, 'PNG', (width / 2) - 30, y, 60, 10);
        y += 15;
    } else {
        y += 5;
    }

    // --- INFO BLOCK ---
    doc.setFontSize(8);
    doc.setFont(primaryFont, "normal");
    const detailsLineHeight = 3.5;

    // LTR: Left Col = Company Bank Details. RTL: Right Col (mirrored)
    const leftColX = fX(leftMargin);
    let leftDetailsY = y;

    doc.text(`${L.account} :`, leftColX, leftDetailsY, { align: alignStart }); leftDetailsY += detailsLineHeight;
    doc.text(`${L.rib} :`, leftColX, leftDetailsY, { align: alignStart }); leftDetailsY += detailsLineHeight;
    if (settings.companyEmails[0]) {
        doc.text(`${L.email} : ${settings.companyEmails[0]}`, leftColX, leftDetailsY, { align: alignStart }); leftDetailsY += detailsLineHeight;
    }
    if (settings.companyWebsites[0]) {
        doc.text(`${L.website} : ${settings.companyWebsites[0]}`, leftColX, leftDetailsY, { align: alignStart }); leftDetailsY += detailsLineHeight;
    }

    // LTR: Right Col = Company Registration. RTL: Left Col (mirrored)
    const rightColX = fX(width - rightMargin);
    let rightDetailsY = y;

    if (settings.rcNumber) { doc.text(`${L.rc} : ${settings.rcNumber}`, rightColX, rightDetailsY, { align: alignEnd }); rightDetailsY += detailsLineHeight; }
    if (settings.artNumber) { doc.text(`${L.ai} : ${settings.artNumber}`, rightColX, rightDetailsY, { align: alignEnd }); rightDetailsY += detailsLineHeight; }
    if (settings.nifNumber) { doc.text(`${L.nif} : ${settings.nifNumber}`, rightColX, rightDetailsY, { align: alignEnd }); rightDetailsY += detailsLineHeight; }
    if (settings.nisNumber) { doc.text(`${L.nis} : ${settings.nisNumber}`, rightColX, rightDetailsY, { align: alignEnd }); rightDetailsY += detailsLineHeight; }

    y = Math.max(leftDetailsY, rightDetailsY) + 3;

    // --- CLIENT & DATE BOX ---
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, width - rightMargin, y);
    y += 4;

    const boxTopY = y;
    doc.setFontSize(10);

    // Left Block (Date & Payment) -> Mirrored to Right in RTL
    const city = settings.companyAddresses[0]?.city || "Ville";
    // Proper Locale Date
    const locale = lang === 'ar' ? 'ar-EG' : lang === 'fr' ? 'fr-FR' : 'en-US';
    const localizedDate = new Date(sale.date).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

    // Arabic Specific Date Formatting: "Date [Date] , [City]" logic handled by RTL naturally if separate
    let dateStr = "";
    if (lang === 'ar') {
        dateStr = `${L.datePrefix} ${localizedDate} ، ${city}`;
    } else {
        dateStr = `${city}, ${L.datePrefix} ${localizedDate}`;
    }

    const dateBlockX = fX(leftMargin);

    doc.setFont(primaryFont, "bold");
    doc.text(dateStr, dateBlockX, y, { align: alignStart });

    doc.setFont(primaryFont, "normal");
    // Translate payment methods
    let payMode = (sale.payments || []).map(p => {
        // @ts-ignore
        const trans = PAYMENT_METHODS_TRANS[p.method];
        return trans ? trans[lang] : p.method;
    }).join(', ');

    if (sale.debtDetails) {
        payMode += lang === 'ar' ? ' (دفع آجل)' : ' (Crédit)';
    }

    doc.text(`${L.paymentMode} : ${payMode}`, dateBlockX, y + 5, { align: alignStart });

    // Right Block (Client Info) -> Mirrored to Left in RTL
    // Logic: LTR X = width/2 + 10. RTL X = width - (width/2 + 10) = width/2 - 10
    const clientX = fX(width / 2 + 10);
    const clientContentW = (width - rightMargin) - (width / 2 + 10); // Standard width
    let clientY = y;

    doc.setFont(primaryFont, "bold");
    doc.text(L.billTo, clientX, clientY, { align: alignStart });
    clientY += 5;

    const clientName = sale.customerName || L.clientPassager;
    const nameLines = doc.splitTextToSize(clientName, clientContentW);
    doc.text(nameLines, clientX, clientY, { align: alignStart });
    clientY += (nameLines.length * 4);

    doc.setFont(primaryFont, "normal");

    // Show Address
    if (sale.customerAddress) {
        const addressLines = doc.splitTextToSize(sale.customerAddress, clientContentW);
        doc.text(addressLines, clientX, clientY, { align: alignStart });
        clientY += (addressLines.length * 4);
    }

    // Show Phone
    if (sale.customerPhone) {
        doc.text(`${L.tel}: ${sale.customerPhone}`, clientX, clientY, { align: alignStart });
        clientY += 4;
    }

    // Show Email
    if (sale.customerEmail) {
        const emailLines = doc.splitTextToSize(sale.customerEmail, clientContentW);
        doc.text(emailLines, clientX, clientY, { align: alignStart });
        clientY += (emailLines.length * 4);
    }

    y = Math.max(clientY, boxTopY + 15) + 5;

    // --- PRODUCT TABLE ---
    // Prepare Data
    let columns = [L.col_no, L.col_code, L.col_desc, L.col_qty, L.col_price, L.col_disc, L.col_total, L.col_vat];
    let rows = sale.items.map((item, index) => {
        const totalLine = (item.unitPrice * item.quantity) - item.discountValue;
        const discountPct = item.discountType === 'percentage'
            ? item.discountValue
            : (item.discountValue > 0 ? ((item.discountValue / (item.unitPrice * item.quantity)) * 100).toFixed(0) : '-');

        return [
            (index + 1).toString(),
            item.sku || (index + 1).toString(),
            item.name,
            item.quantity.toString(),
            formatCurrency(item.unitPrice, settings).replace(settings.currencySymbol, '').trim(),
            discountPct,
            formatCurrency(totalLine, settings).replace(settings.currencySymbol, '').trim(),
            "0"
        ];
    });

    // RTL Reversal for Table Columns Order (Visual)
    if (isRTL) {
        columns = columns.reverse();
        rows = rows.map(r => r.reverse());
    }

    (doc as any).autoTable({
        startY: y,
        head: [columns],
        body: rows,
        theme: 'plain',
        styles: {
            font: primaryFont,
            fontSize: 9,
            cellPadding: 1,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
            overflow: 'linebreak',
            halign: isRTL ? 'right' : 'left' // Text alignment inside cells
        },
        headStyles: {
            fillColor: [240, 240, 240],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.3
        },
        // We need to map styles to columns carefully based on RTL reversal
        // LTR: 0=No, 1=Code, 2=Desc, 3=Qty, 4=Price, 5=Disc, 6=Total, 7=VAT
        // RTL: 0=VAT, 1=Total, 2=Disc, 3=Price, 4=Qty, 5=Desc, 6=Code, 7=No
        columnStyles: isRTL ? {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'right', cellWidth: 25 }, // Total
            2: { halign: 'center', cellWidth: 15 }, // Disc
            3: { halign: 'right', cellWidth: 25 }, // Price
            4: { halign: 'center', cellWidth: 15 }, // Qty
            5: { halign: 'right' }, // Desc
            6: { halign: 'center', cellWidth: 25 }, // Code
            7: { halign: 'center', cellWidth: 10 }  // No
        } : {
            0: { halign: 'center', cellWidth: 10 },
            1: { halign: 'center', cellWidth: 25 },
            2: { halign: 'left' },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'center', cellWidth: 15 },
            6: { halign: 'right', cellWidth: 25 },
            7: { halign: 'center', cellWidth: 10 }
        },
        margin: { left: leftMargin, right: rightMargin },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    if (finalY > height - 60) {
        doc.addPage();
        finalY = 20;
    }

    // 1. Amount in Words & Totals Block
    let leftBlockY = finalY;
    const footerLeftX = fX(leftMargin); // Mirrored

    // Word Block (Left in LTR, Right in RTL)
    doc.setFontSize(10);
    doc.setFont(primaryFont, "bold");
    const nbUV = sale.items.reduce((acc, i) => acc + i.quantity, 0);
    doc.text(`${L.total_units} : ${nbUV.toFixed(2)}`, footerLeftX, leftBlockY, { align: alignStart });
    leftBlockY += 6;

    doc.setFont(primaryFont, "normal");
    doc.text(L.stopped_at, footerLeftX, leftBlockY, { align: alignStart });
    leftBlockY += 6;

    doc.setFont(primaryFont, "bold");
    const amountWords = convertTotalToWords(sale.total, lang, settings.currencySymbol);
    const amountWordsLines = doc.splitTextToSize(amountWords, 100);
    doc.text(amountWordsLines, footerLeftX, leftBlockY, { align: alignStart });
    leftBlockY += (amountWordsLines.length * 5);

    // Totals Table Block (Right in LTR, Left in RTL)
    let rightBlockY = finalY;
    const tableW = 80;
    // LTR Box starts at: width - rightMargin - tableW
    // RTL Box starts at: leftMargin
    const boxStartX = isRTL ? leftMargin : width - rightMargin - tableW;

    const rowH = 7;

    const drawTotalRow = (label: string, value: string, isTotal: boolean = false) => {
        doc.setLineWidth(isTotal ? 0.4 : 0.1);
        doc.rect(boxStartX, rightBlockY, tableW, rowH);

        // Divider line. LTR: x + 40. RTL: x + 40.
        doc.line(boxStartX + 40, rightBlockY, boxStartX + 40, rightBlockY + rowH);

        doc.setFont(primaryFont, isTotal ? "bold" : "normal");
        doc.setFontSize(isTotal ? 11 : 10);

        const textY = rightBlockY + (rowH / 2) + 1.5;

        // LTR: Label on Left, Value on Right
        // RTL: Label on Right, Value on Left (inside the box sections)
        if (isRTL) {
            // Label in right half
            doc.text(label, boxStartX + tableW - 2, textY, { align: 'right' });
            // Value in left half
            doc.text(value, boxStartX + 38, textY, { align: 'right' });
        } else {
            // Label in left half
            doc.text(label, boxStartX + 2, textY, { align: 'left' });
            // Value in right half
            doc.text(value, boxStartX + tableW - 2, textY, { align: 'right' });
        }

        rightBlockY += rowH;
    };

    // Updated Translation for Paid/Rest
    const paidLabel = lang === 'ar' ? 'مدفوع' : (lang === 'en' ? 'PAID' : 'VERSÉ');
    const restLabel = lang === 'ar' ? 'باقي' : (lang === 'en' ? 'DUE' : 'RESTE');

    const paidAmount = sale.debtDetails ? sale.debtDetails.paidAmount : sale.total;
    const restAmount = sale.debtDetails ? sale.debtDetails.remainingAmount : 0;

    drawTotalRow(L.total_ht, formatCurrency(sale.subtotal, settings).replace(settings.currencySymbol, '').trim(), true);
    drawTotalRow(L.vat, formatCurrency(sale.tax, settings).replace(settings.currencySymbol, '').trim());
    drawTotalRow(L.stamp, "0.00");
    drawTotalRow(L.net_to_pay, formatCurrency(sale.total, settings).replace(settings.currencySymbol, '').trim(), true);

    drawTotalRow(paidLabel, formatCurrency(paidAmount, settings).replace(settings.currencySymbol, '').trim());
    if (restAmount > 0) {
        drawTotalRow(restLabel, formatCurrency(restAmount, settings).replace(settings.currencySymbol, '').trim(), true);
    }

    // 2. Signatures
    let sigY = Math.max(leftBlockY, rightBlockY) + 15;

    // Seller Signature (Right in LTR, Left in RTL)
    const signTitle = (sale.cashierName || '').toLowerCase().includes('admin') ? L.admin : L.seller;

    doc.setFont(primaryFont, "bold");
    doc.setFontSize(10);

    // Block 1 (Seller) - LTR Right, RTL Left
    const block1X = isRTL ? leftMargin + 10 : width - rightMargin - 50;
    doc.text(signTitle, block1X + 25, sigY - 10, { align: "center" });
    doc.setFont(primaryFont, "normal");
    doc.text(sale.cashierName || '', block1X + 25, sigY - 5, { align: "center" });
    doc.setFont(primaryFont, "bold");
    doc.text(L.sig_seller, block1X + 25, sigY, { align: "center" });

    // Block 2 (Client) - LTR Left, RTL Right
    const block2X = isRTL ? width - rightMargin - 50 : leftMargin + 10;
    doc.text(L.sig_client, block2X + 25, sigY, { align: "center" });

    // 3. ABSOLUTE BOTTOM: Tax Summary & Date
    const bottomY = height - 25;
    const taxTableW = 70;
    // LTR: Right side. RTL: Left side.
    const taxBoxX = isRTL ? leftMargin : width - rightMargin - taxTableW;

    // Line ABOVE Total row
    doc.setLineWidth(0.3);
    doc.line(taxBoxX, bottomY, taxBoxX + taxTableW, bottomY);

    doc.setFontSize(9);
    doc.setFont(primaryFont, "bold");

    // Headers
    if (isRTL) {
        doc.text(L.vat, taxBoxX + taxTableW, bottomY - 9, { align: "right" });
        doc.text(L.tax_base, taxBoxX + 35, bottomY - 9, { align: "right" });
        doc.text(L.tax_amount, taxBoxX, bottomY - 9, { align: "left" });
    } else {
        doc.text(L.vat, taxBoxX, bottomY - 9);
        doc.text(L.tax_base, taxBoxX + 35, bottomY - 9, { align: "right" });
        doc.text(L.tax_amount, taxBoxX + taxTableW, bottomY - 9, { align: "right" });
    }

    doc.setLineWidth(0.1);
    doc.line(taxBoxX, bottomY - 7, taxBoxX + taxTableW, bottomY - 7);

    // Row 1 (Values)
    const valBase = formatCurrency(sale.subtotal, settings).replace(settings.currencySymbol, '').trim();
    const valTax = formatCurrency(sale.tax, settings).replace(settings.currencySymbol, '').trim();

    doc.setFont(primaryFont, "normal");

    if (isRTL) {
        doc.text(L.vat_0, taxBoxX + taxTableW, bottomY - 3, { align: "right" });
        doc.text(valBase, taxBoxX + 35, bottomY - 3, { align: "right" });
        doc.text(valTax, taxBoxX, bottomY - 3, { align: "left" });
    } else {
        doc.text(L.vat_0, taxBoxX, bottomY - 3);
        doc.text(valBase, taxBoxX + 35, bottomY - 3, { align: "right" });
        doc.text(valTax, taxBoxX + taxTableW, bottomY - 3, { align: "right" });
    }

    // Row 2 (Total) - Below line
    doc.setFont(primaryFont, "bold");

    if (isRTL) {
        doc.text(L.total, taxBoxX + taxTableW, bottomY + 4.5, { align: "right" });
        doc.text(valBase, taxBoxX + 35, bottomY + 4.5, { align: "right" });
        doc.text(valTax, taxBoxX, bottomY + 4.5, { align: "left" });
    } else {
        doc.text(L.total, taxBoxX, bottomY + 4.5);
        doc.text(valBase, taxBoxX + 35, bottomY + 4.5, { align: "right" });
        doc.text(valTax, taxBoxX + taxTableW, bottomY + 4.5, { align: "right" });
    }

    // Date (Opposite side of Tax Table)
    // LTR: Date on Left. RTL: Date on Right.
    // Use alignStart (LTR='left', RTL='right') at the respective margin.
    const dateX = isRTL ? width - rightMargin : leftMargin;
    doc.setFont(primaryFont, "normal");
    doc.setFontSize(9);
    doc.text(localizedDate, dateX, bottomY + 10, { align: alignStart });

    // Page Numbering
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        // LTR Left, RTL Right
        const pageX = fX(leftMargin);
        doc.text(`${L.page} ${i} / ${pageCount}`, pageX, height - 10, { align: alignStart });
    }

    doc.save(`Invoice_${sale.id}.pdf`);
};

export const getWhatsAppLink = (sale: Sale, settings: AppSettings): string => {
    const message = `Receipt from ${settings.companyName}\nOrder #${sale.id.slice(-8)}\nDate: ${new Date(sale.date).toLocaleDateString()}\nTotal: ${sale.total.toFixed(2)} ${settings.currencySymbol}`;
    const encodedMessage = encodeURIComponent(message);

    if (sale.customerPhone) {
        const cleanPhone = sale.customerPhone.replace(/[^0-9+]/g, '');
        return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    }
    return `https://wa.me/?text=${encodedMessage}`;
};

export const getEmailLink = (sale: Sale, settings: AppSettings): string => {
    const subject = encodeURIComponent(`Receipt from ${settings.companyName} - Order #${sale.id.slice(-8)}`);
    const body = encodeURIComponent(`Thank you for your purchase!\n\nOrder #${sale.id}\nDate: ${new Date(sale.date).toLocaleDateString()}\nTotal: ${sale.total.toFixed(2)} ${settings.currencySymbol}\n\nBest regards,\n${settings.companyName}`);

    return `mailto:${sale.customerEmail || ''}?subject=${subject}&body=${body}`;
};
