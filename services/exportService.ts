
import { Product } from '../constants/inventoryFields';
import { AppSettings, ColorScheme } from '../constants/defaultSettings';
import { getImageBlobById } from './imageService';
import { ExportOptions } from '../components/Inventory/ExportConfigModal';

// Loaded via CDN in index.html
const jsPDF = (window as any).jspdf.jsPDF;
const XLSX = (window as any).XLSX;
const ExcelJS = (window as any).ExcelJS;

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const getImageDimensions = (base64: string): Promise<{ w: number, h: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = (e) => resolve({ w: 100, h: 100 }); // Fallback
        img.src = base64;
    });
};

/**
 * Image Processing Helper (Invert Colors, Remove Background)
 */
const processImageForPDF = (base64: string, invert: boolean, removeBg: boolean): Promise<string> => {
    return new Promise((resolve) => {
        if (!invert && !removeBg) return resolve(base64);

        const img = new Image();
        img.crossOrigin = "Anonymous"; // Prevent tainted canvas issues
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(base64);

            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                // alpha = data[i + 3]

                if (invert) {
                    data[i] = 255 - r;
                    data[i + 1] = 255 - g;
                    data[i + 2] = 255 - b;
                }

                if (removeBg) {
                    // Aggressive Magic Wand:
                    // If pixel is brighter than 215 (out of 255) in all channels, consider it white-ish and remove it.
                    // This handles compression artifacts better than strict 255 check.
                    if (r > 215 && g > 215 && b > 215) {
                        data[i + 3] = 0; // Set Alpha to 0
                    }
                }
            }

            ctx.putImageData(imgData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
};

/**
 * Helper to safely get string value for PDF (prevents toUpperCase on numbers)
 */
const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
}

/**
 * Helper to flatten product data for CSV export
 */
const flattenDataForCSV = (products: Product[], options: ExportOptions, settings: AppSettings) => {
    return products.map(p => {
        const row: any = {};
        const fields = options.selectedFields || [];

        fields.forEach(key => {
            if (key === 'images') {
                row['Image URL'] = p.images?.[0]?.url || '';
                return;
            }

            // Find definition
            const def = settings.productFields.find(f => f.key === key);
            const label = def ? def.label : key;

            // Handle Values
            if (key === 'status') {
                if (p.quantity > p.minStock) row[label] = 'In Stock';
                else if (p.quantity > 0) row[label] = 'Low Stock';
                else row[label] = 'Out of Stock';
            }
            else if (key === 'warranty') {
                row[label] = p.warranty?.enabled ? `${p.warranty.days} days` : 'No';
            } 
            else if (def && !def.isCore) {
                // Custom Field
                const val = p.customFields?.[key];
                row[label] = safeString(val);
            } 
            else {
                // Core Field
                const val = (p as any)[key];
                row[label] = safeString(val);
            }
        });

        return row;
    });
};

/**
 * Generate CSV (Uses SheetJS/XLSX lib for simple text dump)
 */
const exportToCSV = (products: Product[], options: ExportOptions, settings: AppSettings) => {
    const data = flattenDataForCSV(products, options, settings);
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${options.title || 'Export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generate XLSX with ExcelJS to support embedded images
 */
const exportToXLSX = async (products: Product[], options: ExportOptions, settings: AppSettings) => {
    // 1. Setup Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory');

    // 2. Define Columns based on selectedFields
    const fields = options.selectedFields || [];
    const columns = [];
    
    // Track where images should go
    let imageColIndex = -1;

    fields.forEach((key, index) => {
        if (key === 'images') {
            imageColIndex = index;
            columns.push({ header: 'Image', key: 'image', width: 20 }); // Wider for image
        } else {
            const def = settings.productFields.find(f => f.key === key);
            const label = def ? def.label : key;
            const width = ['name', 'description', 'id'].includes(key) ? 30 : 15;
            columns.push({ header: label, key: key, width });
        }
    });

    worksheet.columns = columns;

    // 3. Add Rows and Process Images
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const rowValues: any = {};

        fields.forEach(key => {
            if (key === 'images') {
                rowValues['image'] = ''; // Placeholder, will fill with image later
                return;
            }

            if (key === 'status') {
                if (p.quantity > p.minStock) rowValues[key] = 'In Stock';
                else if (p.quantity > 0) rowValues[key] = 'Low Stock';
                else rowValues[key] = 'Out of Stock';
            }
            else if (key === 'warranty') {
                rowValues[key] = p.warranty?.enabled ? `${p.warranty.days} days` : 'No';
            }
            else if (key === 'price1' || key === 'price2' || key === 'costPrice') {
                 // Format with currency symbol in Excel? Usually kept as number for calculation, but user might want string.
                 // We'll keep as number for Excel utility.
                 rowValues[key] = (p as any)[key];
            }
            else {
                // Generic access
                const val = (p as any)[key] ?? p.customFields?.[key];
                rowValues[key] = safeString(val);
            }
        });

        const row = worksheet.addRow(rowValues);

        // 4. Embed Image if applicable
        if (imageColIndex !== -1 && p.images && p.images.length > 0) {
            try {
                // Get the blob from IndexedDB
                const blob = await getImageBlobById(p.images[0].id);
                if (blob) {
                    const buffer = await blob.arrayBuffer();
                    const extension = blob.type.split('/')[1] || 'png';
                    
                    const imageId = workbook.addImage({
                        buffer: buffer,
                        extension: extension as 'png' | 'jpeg' | 'gif',
                    });

                    // Set row height to accommodate image
                    row.height = 80;

                    // Add image to worksheet at current row, specific column
                    worksheet.addImage(imageId, {
                        tl: { col: imageColIndex, row: row.number - 1 }, // Top-left
                        br: { col: imageColIndex + 1, row: row.number }, // Bottom-right
                        editAs: 'oneCell'
                    });
                }
            } catch (e) {
                console.error("Failed to add image to Excel for product", p.name, e);
            }
        } else {
             // If image column exists but no image, standard height
             row.height = 20;
        }
    }

    // 5. Styling Header
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).height = 25;

    // 6. Write File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${options.title || 'Export'}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


/**
 * Main Export Function handling multiple themes and formats
 */
export async function generateCustomCatalog(
    products: Product[], 
    settings: AppSettings, 
    options: ExportOptions,
    colors?: ColorScheme // Inject current theme colors
) {
    // Fallback to light colors if not provided (though InventoryPanel passes them)
    const activeColors = colors || settings.lightColors;

    if (products.length === 0) {
        alert("No products to export.");
        return;
    }

    // --- HANDLE DATA EXPORT FORMATS ---
    if (options.format === 'csv') {
        exportToCSV(products, options, settings);
        return;
    }
    if (options.format === 'xlsx') {
        await exportToXLSX(products, options, settings);
        return;
    }

    // --- HANDLE PDF EXPORT (Existing Logic) ---
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // --- FONT SETUP ---
    // Register all custom fonts for ALL styles to prevent lookup warnings
    // This "flattens" custom fonts so they work even if you request bold/italic
    if (settings.customFonts && settings.customFonts.length > 0) {
        settings.customFonts.forEach(font => {
            if (font.dataUrl) {
                try {
                    const base64 = font.dataUrl.split(',')[1];
                    if (base64) {
                        const fileName = `${font.name}.ttf`;
                        doc.addFileToVFS(fileName, base64);
                        // Register for all standard variants
                        doc.addFont(fileName, font.name, 'normal');
                        doc.addFont(fileName, font.name, 'bold');
                        doc.addFont(fileName, font.name, 'italic');
                        doc.addFont(fileName, font.name, 'bolditalic');
                    }
                } catch (e) {
                    console.error("Failed to register custom font", font.name, e);
                }
            }
        });
    }

    // Helper to resolve font name
    const getFontName = (fontName: string): string => {
        if (!fontName) return 'helvetica';
        // Check if it's a known custom font
        if (settings.customFonts.some(f => f.name === fontName)) {
            return fontName;
        }
        // Fallback mapping
        const lower = fontName.toLowerCase();
        if (lower.includes('courier') || lower.includes('mono')) return 'courier';
        if (lower.includes('times') || lower.includes('serif')) return 'times';
        return 'helvetica';
    };

    const titleFont = getFontName(settings.secondaryFont);
    const bodyFont = getFontName(settings.primaryFont);
    const priceFont = getFontName(options.priceFont || settings.primaryFont); 
    const isRightSideCurrency = settings.currencySymbol === 'DA' || settings.currencySymbol === 'DZD';

    // Helper to format price based on selected field
    const formatPrice = (p: Product) => {
        // Use the selected price field from options, default to price1
        const fieldKey = options.priceField || 'price1';
        const rawPrice = (p as any)[fieldKey];
        const priceNum = typeof rawPrice === 'number' ? rawPrice : 0;
        
        const priceStr = priceNum.toFixed(2);
        return isRightSideCurrency ? `${priceStr} ${settings.currencySymbol}` : `${settings.currencySymbol}${priceStr}`;
    };

    // --- BACKGROUND DRAWING ENGINES ---
    
    // 1. Gaming Hex (Original)
    const drawGamingHex = (doc: any, width: number, height: number, color: string) => {
        doc.setFillColor("#050505");
        doc.rect(0, 0, width, height, 'F');
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(1);
        const gridSize = 40;
        for (let x = 0; x < width; x += gridSize) doc.line(x, 0, x, height);
        doc.setDrawColor(20, 20, 20);
        for (let y = 0; y < height; y += gridSize) {
            doc.line(0, y, width, y);
            doc.line(0, y, width, y + width); 
        }
        // Accents
        doc.setDrawColor(color);
        doc.setLineWidth(2);
        doc.line(0, 100, 150, 100);
        doc.line(150, 100, 200, 150);
        doc.line(width, height - 100, width - 150, height - 100);
        
        // Corners
        doc.setLineWidth(3);
        doc.line(20, 50, 20, 20);
        doc.line(20, 20, 50, 20);
        doc.line(width - 20, height - 50, width - 20, height - 20);
        doc.line(width - 20, height - 20, width - 50, height - 20);
    };

    // 2. Cyber Circuit (New)
    const drawCyberCircuit = (doc: any, width: number, height: number, color: string) => {
        doc.setFillColor("#080808");
        doc.rect(0, 0, width, height, 'F');
        
        doc.setDrawColor(color);
        doc.setLineWidth(1.5);
        
        // Circuit traces
        const trace = (x1: number, y1: number, x2: number, y2: number) => {
            doc.line(x1, y1, x2, y2);
            doc.circle(x2, y2, 3, 'F');
        };
        
        doc.setFillColor(color);
        // Top Left Traces
        trace(50, 0, 50, 100);
        trace(50, 100, 100, 100);
        trace(100, 100, 100, 150);
        
        // Bottom Right Traces
        trace(width - 50, height, width - 50, height - 100);
        trace(width - 50, height - 100, width - 100, height - 100);
        
        // Center Box
        doc.setDrawColor(40, 40, 40);
        doc.rect(50, 200, width - 100, height - 400, 'S');
    };

    // 3. Abstract Gradient (Simulated)
    const drawAbstractGradient = (doc: any, width: number, height: number, color: string) => {
        // PDF.js gradient support is limited, we simulate with lines
        doc.setFillColor("#111");
        doc.rect(0, 0, width, height, 'F');
        
        doc.setLineWidth(20);
        for(let i = 0; i < height; i+=10) {
            // Opacity simulation by changing grey value
            const val = Math.floor((i / height) * 40);
            doc.setDrawColor(val, val, val);
            doc.line(0, i, width, i);
        }
        
        // Colored Overlay Curve
        doc.setDrawColor(color);
        doc.setLineWidth(5);
        // Bezier curve sim
        doc.line(0, height/2, width/2, height/2 - 100);
        doc.line(width/2, height/2 - 100, width, height/2);
    };

    // --- DRAW TITLE PAGE ---
    const drawTitlePage = async () => {
        const isDark = options.theme !== 'corporate_clean';
        const bgColor = isDark ? "#0f0f0f" : "#ffffff";
        const textColor = isDark ? "#ffffff" : "#111827";
        const accentColor = activeColors.primary; // Use injected color

        // Background
        if (isDark && options.theme === 'poster_showcase') {
             switch (options.titleBackground) {
                 case 'gaming_hex': drawGamingHex(doc, pageWidth, pageHeight, accentColor); break;
                 case 'cyber_circuit': drawCyberCircuit(doc, pageWidth, pageHeight, accentColor); break;
                 case 'abstract_gradient': drawAbstractGradient(doc, pageWidth, pageHeight, accentColor); break;
                 default: 
                    doc.setFillColor("#050505");
                    doc.rect(0, 0, pageWidth, pageHeight, 'F');
             }
        } else {
            doc.setFillColor(bgColor);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }

        // --- Calculate Layout for Perfect Center ---
        
        // 1. Calculate Logo Height
        let finalLogoW = 0;
        let finalLogoH = 0;
        let processedLogo = null;
        
        if (settings.logoUrl) {
            try {
                // Logo Invert is controlled by global setting
                processedLogo = await processImageForPDF(settings.logoUrl, options.invertLogo, false);
                const logoDims = await getImageDimensions(processedLogo);
                const maxLogoW = 350; 
                const maxLogoH = 220;
                const scale = Math.min(maxLogoW / logoDims.w, maxLogoH / logoDims.h);
                finalLogoW = logoDims.w * scale;
                finalLogoH = logoDims.h * scale;
            } catch (e) {}
        }

        // 2. Define Font Sizes & Gaps
        const titleFontSize = 48;
        const subTitleFontSize = 18;
        const logoGap = 50; // Gap between Logo and Title
        const titleGap = 30; // Gap between Title and Subtitle

        // 3. Calculate Total Block Height
        let totalBlockHeight = titleFontSize + subTitleFontSize + titleGap;
        if (finalLogoH > 0) {
            totalBlockHeight += finalLogoH + logoGap;
        }

        // 4. Calculate Starting Y Position
        let currentY = (pageHeight - totalBlockHeight) / 2;

        // --- Render Elements ---

        // Logo
        if (processedLogo && finalLogoH > 0) {
            const logoX = (pageWidth - finalLogoW) / 2;
            doc.addImage(processedLogo, 'PNG', logoX, currentY, finalLogoW, finalLogoH);
            currentY += finalLogoH + logoGap;
        }

        // Title
        doc.setFont(titleFont, 'bold');
        doc.setFontSize(titleFontSize); 
        doc.setTextColor(textColor);
        // Add a slight offset for text baseline
        currentY += titleFontSize; 
        const safeTitle = safeString(options.title).toUpperCase();
        doc.text(safeTitle, pageWidth / 2, currentY, { align: 'center' });

        // Subtitle
        currentY += titleGap;
        doc.setFont(bodyFont, 'normal');
        doc.setFontSize(subTitleFontSize);
        doc.setTextColor(isDark ? "#a1a1aa" : "#4b5563");
        const safeSubtitle = safeString(options.subtitle);
        doc.text(safeSubtitle, pageWidth / 2, currentY, { align: 'center', charSpace: 3 });

        // Absolute Footer
        doc.setFontSize(10);
        doc.setTextColor(accentColor);
        doc.text(settings.companyName.toUpperCase(), pageWidth / 2, pageHeight - 40, { align: 'center' });
        
        doc.addPage();
    };

    /**
     * Engine to draw the Sword/Rune background behind product images
     */
    const drawRuneBackdrop = (doc: any, x: number, y: number, w: number, h: number) => {
        const bladeW = w * 0.3;
        const bladeX = x + (w - bladeW) / 2;
        doc.setFillColor(15, 15, 15); 
        doc.rect(bladeX, y, bladeW, h, 'F');
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(1);
        doc.line(bladeX, y, bladeX, y + h);
        doc.line(bladeX + bladeW, y, bladeX + bladeW, y + h);
        doc.setDrawColor(25, 25, 25);
        doc.setLineWidth(0.5);
        for(let i = y; i < y + h; i += 5) {
             const offset = Math.sin(i) * 5;
             doc.line(bladeX + 5, i, bladeX + bladeW - 5, i + offset);
        }
        // Runes
        const runeX = x + w / 2;
        let runeY = y + 40;
        const bottomLimit = y + h - 15; // Ensure runes don't touch the bottom border/footer

        doc.setDrawColor(80, 80, 80); 
        doc.setLineWidth(1.5);
        
        let i = 0;
        // Loop until we run out of vertical space or reach a reasonable limit
        while(runeY < bottomLimit && i < 10) {
            if (i % 2 === 0) {
                doc.line(runeX - 8, runeY, runeX + 8, runeY);
                doc.line(runeX, runeY - 8, runeX, runeY + 8);
                doc.rect(runeX - 5, runeY - 5, 10, 10, 'S');
            } else {
                 doc.line(runeX - 8, runeY - 8, runeX + 8, runeY + 8);
                 doc.line(runeX + 8, runeY - 8, runeX - 8, runeY + 8);
                 doc.circle(runeX, runeY, 6, 'S');
            }
            runeY += 40;
            i++;
        }
    };

    // Helper to check if a specific product should have its background removed
    const shouldRemoveBg = (productId: string) => {
        if (options.bgRemovalMode === 'all') return true;
        if (options.bgRemovalMode === 'custom' && options.bgRemovalCustomIds.includes(productId)) return true;
        return false;
    }

    // --- RENDERER: POSTER SHOWCASE ---
    const renderPosterTheme = async () => {
        doc.setFillColor("#0f0f0f"); // Deep black
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        
        let xOffset = 20;
        let yOffset = 20;
        
        const cols = options.columns; // Should be 2 ideally
        const rows = cols === 1 ? 2 : 2; 
        const gap = 20;
        const cardW = (pageWidth - (xOffset * 2) - (gap * (cols - 1))) / cols;
        const cardH = (pageHeight - (yOffset * 2) - (gap * (rows - 1))) / rows;

        let col = 0;
        let row = 0;

        for (let i = 0; i < products.length; i++) {
            const p = products[i];
            const x = xOffset + (col * (cardW + gap));
            const y = yOffset + (row * (cardH + gap));
            
            drawReferenceFrame(doc, x, y, cardW, cardH, activeColors.primary);
            
            const textZoneY = y + 25;
            const textZoneH = cardH * 0.40;
            const imgZoneY = y + textZoneH + 20;
            const imgZoneH = cardH * 0.45;

            // Pill (Category)
            doc.setFillColor("#1a1a1a");
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(1);
            const pillW = Math.min(cardW * 0.6, 200);
            const pillH = 18;
            const pillX = x + (cardW - pillW) / 2;
            doc.roundedRect(pillX, textZoneY, pillW, pillH, 9, 9, 'S');
            doc.setFont(titleFont, "bold");
            doc.setFontSize(8);
            doc.setTextColor(255, 255, 255);
            const safeCategory = safeString(p.category || 'INVENTORY').toUpperCase();
            doc.text(safeCategory, pillX + pillW/2, textZoneY + 12, { align: 'center', charSpace: 1.5 });

            // Title
            let cursorY = textZoneY + 35;
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            const safeName = safeString(p.name).toUpperCase();
            const splitTitle = doc.splitTextToSize(safeName, cardW - 40);
            doc.text(splitTitle, x + cardW/2, cursorY, { align: 'center' });
            cursorY += (splitTitle.length * 15) + 5;

            // Brand / SKU
            if (options.showSku) {
                doc.setFont(bodyFont, "normal");
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                const brand = safeString(p.brand);
                const sku = safeString(p.sku);
                doc.text(`${brand} // ${sku}`, x + cardW/2, cursorY, { align: 'center' });
                cursorY += 15;
            }

            if (options.showDescription) {
                doc.setFont(bodyFont, "italic");
                doc.setFontSize(9);
                doc.setTextColor(200, 200, 200);
                const descText = `"${p.description || 'No description available.'}"`;
                const splitDesc = doc.splitTextToSize(descText, cardW - 50);
                const maxLines = 4;
                const finalDesc = splitDesc.length > maxLines ? splitDesc.slice(0, maxLines).concat(['...']) : splitDesc;
                doc.text(finalDesc, x + cardW/2, cursorY, { align: 'center' });
            }

            // Image Zone
            drawRuneBackdrop(doc, x, imgZoneY, cardW, imgZoneH);

            if (options.showImages && p.images && p.images.length > 0) {
                try {
                    const blob = await getImageBlobById(p.images[0].id);
                    if (blob) {
                        const base64 = await blobToBase64(blob);
                        // Determine if we need to remove BG for this specific product
                        const removeBg = shouldRemoveBg(p.id);
                        const processedBase64 = await processImageForPDF(base64, false, removeBg);
                        
                        const dims = await getImageDimensions(processedBase64);
                        const maxW = cardW - 40;
                        const maxH = imgZoneH;
                        const scale = Math.min(maxW / dims.w, maxH / dims.h);
                        const finalW = dims.w * scale;
                        const finalH = dims.h * scale;
                        const imgX = x + (cardW - finalW) / 2;
                        const imgY = imgZoneY + (imgZoneH - finalH) / 2;

                        doc.addImage(processedBase64, 'PNG', imgX, imgY, finalW, finalH, undefined, 'FAST');
                    }
                } catch (e) {}
            }

            // Footer
            const footerY = y + cardH - 25;
            doc.setFillColor(30, 30, 30);
            doc.rect(x + 20, footerY - 5, cardW - 40, 2, 'F');

            if (options.showPrice) {
                const priceStr = formatPrice(p);
                doc.setFont(priceFont, "bold");
                
                // Dynamic Font Sizing for long prices
                // Base size 14, scale down if price string is long or card is narrow
                let dynamicPriceSize = 14;
                const approxCharWidth = 8; 
                const estimatedWidth = priceStr.length * approxCharWidth;
                if (estimatedWidth > (cardW * 0.4)) {
                    dynamicPriceSize = 11;
                }
                
                doc.setFontSize(dynamicPriceSize);
                doc.setTextColor(activeColors.primary);
                
                // Calculate width to ensure no overlap
                const priceWidth = doc.getTextWidth(priceStr);
                const priceX = x + cardW - 30; // Right aligned anchor
                doc.text(priceStr, priceX, footerY + 15, { align: 'right' });
                
                // Company Name - Left Aligned
                doc.setFont(bodyFont, "bold");
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                
                const companyName = settings.companyName.toUpperCase();
                // Check for collision: Company Name X + Width vs Price X - Width - Padding
                const companyX = x + 30;
                const availableWidth = (priceX - priceWidth - 20) - companyX;
                
                // Truncate if needed
                let finalCompanyText = companyName;
                if (doc.getTextWidth(finalCompanyText) > availableWidth) {
                   // Simple char approximation for truncation
                   const maxChars = Math.floor(availableWidth / 5);
                   if (maxChars > 3) finalCompanyText = companyName.substring(0, maxChars) + '...';
                   else finalCompanyText = ''; // Too small
                }
                
                if (finalCompanyText) {
                    doc.text(finalCompanyText, companyX, footerY + 15, { align: 'left' });
                }
            } else {
                 // No price, just company name centered or left
                doc.setFont(bodyFont, "bold");
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(settings.companyName.toUpperCase(), x + 30, footerY + 15, { align: 'left' });
            }


            // Grid Logic
            col++;
            if (col >= cols) {
                col = 0;
                row++;
                if (row >= rows) {
                    if (i < products.length - 1) {
                        doc.addPage();
                        doc.setFillColor("#0f0f0f");
                        doc.rect(0, 0, pageWidth, pageHeight, 'F');
                        col = 0; row = 0;
                    }
                }
            }
        }
    };

    // --- RENDERER: CYBERPUNK LIST ---
    const renderListTheme = async () => {
        doc.setFillColor("#050505");
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        let y = 40;
        
        products.forEach((p, i) => {
            if (y > pageHeight - 80) {
                doc.addPage();
                doc.setFillColor("#050505");
                doc.rect(0, 0, pageWidth, pageHeight, 'F');
                y = 40;
            }
            doc.setFillColor("#121212");
            doc.setDrawColor(activeColors.primary);
            doc.setLineWidth(0.5);
            doc.roundedRect(20, y, pageWidth - 40, 50, 2, 2, 'FD');

            // Price Column Calculation
            let priceWidth = 0;
            if (options.showPrice) {
                const priceStr = formatPrice(p);
                doc.setFont(priceFont, 'bold');
                doc.setFontSize(12);
                priceWidth = doc.getTextWidth(priceStr);
                
                doc.setTextColor(activeColors.primary);
                doc.text(priceStr, pageWidth - 40, y + 30, { align: 'right' });
            }

            // Name Column (Restricted Width)
            doc.setFont(titleFont, 'bold');
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255);
            
            // Available width = Total Width - Padding - Price Width - Buffer
            const availableNameWidth = (pageWidth - 80) - priceWidth - 20;
            let name = safeString(p.name);
            // Truncate logic
            if (doc.getTextWidth(name) > availableNameWidth) {
                 // Basic truncation approximation, splitting could be better but sufficient for list
                 const ratio = availableNameWidth / doc.getTextWidth(name);
                 const newLen = Math.floor(name.length * ratio) - 3;
                 name = name.substring(0, Math.max(0, newLen)) + '...';
            }
            doc.text(name, 40, y + 20);

            doc.setFont(bodyFont, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(150, 150, 150);
            doc.text(`${safeString(p.sku)} | ${safeString(p.brand)}`, 40, y + 35);

            y += 60;
        });
    };

    // --- RENDERER: CORPORATE CLEAN ---
    const renderCorporateTheme = async () => {
        doc.setFillColor("#ffffff");
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        let y = 40;
        
        // Header Row
        doc.setFillColor(240, 240, 240);
        doc.rect(20, y, pageWidth - 40, 25, 'F');
        doc.setFont(bodyFont, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0,0,0);
        
        const col1X = 30;
        const col2X = pageWidth - 160; // SKU starts here
        const col3X = pageWidth - 30;  // Price aligns right here
        
        doc.text("PRODUCT", col1X, y + 17);
        doc.text("SKU", col2X, y + 17);
        doc.text("PRICE", col3X, y + 17, { align: 'right' });

        y += 25;
        products.forEach((p, i) => {
             if (y > pageHeight - 50) {
                doc.addPage();
                y = 40;
            }
            if (i % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(20, y, pageWidth - 40, 25, 'F');
            }
            doc.setFont(bodyFont, 'normal');
            doc.setTextColor(50, 50, 50);
            
            // Name Truncation
            let name = safeString(p.name);
            const maxNameWidth = col2X - col1X - 10;
            if (doc.getTextWidth(name) > maxNameWidth) {
                 const ratio = maxNameWidth / doc.getTextWidth(name);
                 name = name.substring(0, Math.floor(name.length * ratio) - 3) + '...';
            }
            doc.text(name, col1X, y + 17);
            
            // SKU
            doc.text(safeString(p.sku), col2X, y + 17);
            
            // Price
            if (options.showPrice) {
                doc.setFont(priceFont, 'normal');
                doc.text(formatPrice(p), col3X, y + 17, { align: 'right' });
            }
            y += 25;
        });
    };

    // Frame Helper
    const drawReferenceFrame = (doc: any, x: number, y: number, w: number, h: number, color: string) => {
        const radius = 15;
        const cutoutSize = 30;
        doc.setDrawColor(200, 200, 200); 
        doc.setLineWidth(1.5);
        const path = [
            { op: 'm', c: [x + cutoutSize, y] }, 
            { op: 'l', c: [x + w - radius, y] }, 
            { op: 'c', c: [x + w, y, x + w, y, x + w, y + radius] }, 
            { op: 'l', c: [x + w, y + 80] }, 
            { op: 'l', c: [x + w - 10, y + 90] },
            { op: 'l', c: [x + w - 10, y + 150] },
            { op: 'l', c: [x + w, y + 160] },
            { op: 'l', c: [x + w, y + h - radius] },
            { op: 'c', c: [x + w, y + h, x + w, y + h, x + w - radius, y + h] }, 
            { op: 'l', c: [x + cutoutSize, y + h] }, 
            { op: 'l', c: [x + 20, y + h - 10] },
            { op: 'l', c: [x, y + h - 30] },
            { op: 'l', c: [x, y + cutoutSize] },
            { op: 'l', c: [x + cutoutSize, y] }, 
        ];
        doc.path(path);
        doc.setLineWidth(1);
        doc.line(x + w - 5, y + 100, x + w - 5, y + 140);
        doc.setFillColor(color);
        doc.rect(x - 4, y + 60, 4, 40, 'F');
        doc.setDrawColor(color);
        doc.circle(x + w - 20, y + 20, 4, 'S');
    };

    // --- EXECUTION ---
    await drawTitlePage();

    if (options.theme === 'poster_showcase') {
        await renderPosterTheme();
    } else if (options.theme === 'cyberpunk_list') {
        await renderListTheme();
    } else if (options.theme === 'corporate_clean') {
        await renderCorporateTheme();
    } else {
        await renderPosterTheme();
    }

    doc.save(`${settings.companyName}_CATALOG.pdf`);
}
