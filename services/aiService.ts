import { Product } from "../constants/inventoryFields";

export const generateDescription = async (productName: string, category: string): Promise<string> => {
    return "";
};

export const generateTechnicalDescription = async (productName: string): Promise<string> => {
    return "";
};

export const analyzeProductDetails = async (productName: string): Promise<{
    brand: string,
    category: string,
    sku: string,
    socket?: string,
    memory_type?: string,
    wattage?: number
}> => {
    return {
        brand: "Generic",
        category: "Uncategorized",
        sku: "GEN-001"
    };
};

export const analyzeAndDescribeProduct = async (productName: string): Promise<any> => {
    return {};
};

export const scanInvoice = async (file: File): Promise<Partial<Product>[]> => {
    throw new Error("AI features have been disabled.");
};

/**
 * Pix Assistant Chat
 * Removed as per user request
 */
