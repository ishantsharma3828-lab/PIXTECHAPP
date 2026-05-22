
import { Product } from '../constants/inventoryFields';

export interface Filters {
  searchQuery: string;
  category: string;
  brand: string;
  stockStatus: 'all' | 'inStock' | 'lowStock' | 'outOfStock';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  priceRange: {
    min: number;
    max: number;
  };
}

export const applyFilters = (allProducts: Product[], filters: Filters): Product[] => {
  let results: Product[];

  // 1. Apply the omni-search to the master list if a query exists
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    results = allProducts.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query) ||
      (p.brand || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    );
  } else {
    // If no search query, start with the full list
    results = [...allProducts];
  }

  // 2. Chain the rest of the filters onto the results
  
  // Category Filter
  if (filters.category && filters.category !== 'all') {
    results = results.filter(p => p.category === filters.category);
  }

  // Brand Filter
  if (filters.brand && filters.brand !== 'all') {
    results = results.filter(p => p.brand === filters.brand);
  }

  // Stock Status Filter
  if (filters.stockStatus !== 'all') {
    results = results.filter(p => {
      if (filters.stockStatus === 'inStock') return p.quantity > p.minStock;
      if (filters.stockStatus === 'lowStock') return p.quantity <= p.minStock && p.quantity > 0;
      if (filters.stockStatus === 'outOfStock') return p.quantity === 0;
      return true;
    });
  }

  // Date Range Filter
  if (filters.dateRange.startDate && filters.dateRange.endDate) {
    const start = new Date(filters.dateRange.startDate).getTime();
    const end = new Date(filters.dateRange.endDate).getTime();
    results = results.filter(p => {
      const createdAt = new Date(p.createdAt).getTime();
      return createdAt >= start && createdAt <= end;
    });
  }

  // Price Range Filter
  if (filters.priceRange.max > filters.priceRange.min) {
      // FIX: Replaced 'sellingPrice' with 'price1' to match the Product type.
      results = results.filter(p => 
          p.price1 >= filters.priceRange.min && p.price1 <= filters.priceRange.max
      );
  }

  return results;
};
