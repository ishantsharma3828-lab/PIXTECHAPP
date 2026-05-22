
export type ReportCategory = 'sales' | 'inventory' | 'financial' | 'operations' | 'hr';

export interface ReportDefinition {
    id: string;
    title: string;
    category: ReportCategory;
    description: string;
}

export interface KPI {
    label: string;
    value: string | number;
    trend?: number; // percentage change
    trendLabel?: string; // e.g. "vs yesterday"
    alert?: boolean; // Red color
    color?: string; // Icon/Badge color
}

export interface ChartPoint {
    label: string; // X-axis (Date or Category)
    value: number; // Y-axis (Primary)
    value2?: number; // Y-axis (Secondary, e.g. Profit)
}

export interface ReportData {
    title: string;
    summary: { label: string; value: string }[];
    chartData: ChartPoint[];
    tableHeaders: string[];
    tableRows: (string | number)[][];
}

export interface DateRange {
    start: string;
    end: string;
    label: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
}
