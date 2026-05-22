import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Product } from "../constants/inventoryFields";
import { getSettings } from "./settingsService";

// Access API Key from settings (User) or environment (Dev/Build)
// User settings MUST take precedence to allow runtime configuration.
const getApiKey = () => getSettings().geminiApiKey || process.env.API_KEY;

/**
 * Helper to convert a File object to a Base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the Data URL prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

/**
 * Wrapper for AI calls to handle quotas.
 */
async function callWithQuotaCheck<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        console.error("AI Call Error:", error);
        const msg = error?.message || error?.toString() || '';
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
            throw new Error("QUOTA_EXCEEDED");
        }
        throw error;
    }
}

/**
 * Generates a simple sales description.
 */
export const generateDescription = async (productName: string, category: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });

    return callWithQuotaCheck(async () => {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-latest",
            contents: `Write a compelling, professional sales description (approx 40-50 words) for a product named "${productName}" in the category "${category}". Focus on features and benefits.`
        });
        return response.text || "";
    });
};

/**
 * Generates technical details.
 */
export const generateTechnicalDescription = async (productName: string): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    return callWithQuotaCheck(async () => {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-latest",
            contents: `Generate a product description for "${productName}".
            Format it exactly like this example (title line followed by bullet points):
            
            [Full Product Title with key specs]
            - [Key Feature 1]
            - [Key Feature 2]
            - [Technical Spec 1]
            - [Technical Spec 2]
            - [Design Feature]
    
            Keep it technical, concise, and professional. Do not add intro/outro text.`
        });
        return response.text || "";
    });
};

/**
 * Analyzes product details.
 */
export const analyzeProductDetails = async (productName: string): Promise<{
    brand: string,
    category: string,
    sku: string,
    socket?: string,
    memory_type?: string,
    wattage?: number
}> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    return callWithQuotaCheck(async () => {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-latest",
            contents: `Analyze the product name "${productName}". 
            1. Identify the Brand.
            2. Identify the general Category.
            3. Generate a realistic, short SKU.
            4. If PC component, extract specs (Socket, Memory Type, Wattage).
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        brand: { type: Type.STRING },
                        category: { type: Type.STRING },
                        sku: { type: Type.STRING },
                        socket: { type: Type.STRING },
                        memory_type: { type: Type.STRING },
                        wattage: { type: Type.NUMBER }
                    }
                }
            }
        });
        const text = response.text || "{}";
        return JSON.parse(text);
    });
};

/**
 * Analyze and describe.
 */
export const analyzeAndDescribeProduct = async (productName: string): Promise<any> => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });

    return callWithQuotaCheck(async () => {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-latest",
            contents: `Analyze "${productName}". Identify Brand, Category, SKU, PC Specs. Write a technical, bullet-point description. Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        brand: { type: Type.STRING },
                        category: { type: Type.STRING },
                        sku: { type: Type.STRING },
                        description: { type: Type.STRING },
                        socket: { type: Type.STRING },
                        memory_type: { type: Type.STRING },
                        wattage: { type: Type.NUMBER }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    });
};

/**
 * Scans an invoice image or PDF and extracts product data using Gemini Vision.
 */
export const scanInvoice = async (file: File): Promise<Partial<Product>[]> => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API Key is missing. Please configure your API_KEY to use AI features.");
    }

    const base64Data = await fileToBase64(file);
    const mimeType = file.type;
    const ai = new GoogleGenAI({ apiKey });

    return callWithQuotaCheck(async () => {
        try {
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-3-flash-latest",
                contents: [
                    { inlineData: { mimeType: mimeType, data: base64Data } },
                    { text: "Analyze this invoice image. Extract all product line items into a structured list. For each item, provide a confidence score (0-100) indicating how certain you are about the extracted data." }
                ],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                sku: { type: Type.STRING },
                                brand: { type: Type.STRING },
                                category: { type: Type.STRING },
                                quantity: { type: Type.NUMBER },
                                costPrice: { type: Type.NUMBER },
                                description: { type: Type.STRING },
                                confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
                            },
                            required: ["name", "quantity", "costPrice", "confidence"]
                        }
                    }
                }
            });

            const text = response.text;
            if (!text) throw new Error("AI returned empty response.");

            const rawItems = JSON.parse(text);

            return rawItems.map((item: any) => ({
                name: item.name || "Unnamed Product",
                sku: item.sku || "",
                brand: item.brand || "Generic",
                category: item.category || "Uncategorized",
                quantity: Number(item.quantity) || 0,
                costPrice: Number(item.costPrice) || 0,
                price1: item.costPrice ? Number((item.costPrice * 1.3).toFixed(2)) : 0,
                description: item.description || "",
                minStock: 5,
                images: [],
                customFields: {
                    aiConfidence: Number(item.confidence) || 100
                },
                warranty: { enabled: false, days: 0 }
            }));

        } catch (error) {
            console.error("Invoice scan error:", error);
            throw error;
        }
    });
};

/**
 * Pix Assistant Chat
 * Removed as per user request
 */
