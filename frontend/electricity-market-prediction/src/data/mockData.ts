import type { Area, HjksOutage } from '@/types';
import { ChartDataPoint } from '@/utils/chartUtils';

// Mock areas data
export const mockAreas: Area[] = [
    { id: 1, name: 'hokkaido', name_ch: '北海道', name_jp: '北海道' },
    { id: 2, name: 'tohoku', name_ch: '東北', name_jp: '東北' },
    { id: 3, name: 'tokyo', name_ch: '東京', name_jp: '東京' },
    { id: 4, name: 'chubu', name_ch: '中部', name_jp: '中部' },
    { id: 5, name: 'hokuriku', name_ch: '北陸', name_jp: '北陸' },
    { id: 6, name: 'kansai', name_ch: '關西', name_jp: '関西' },
    { id: 7, name: 'chugoku', name_ch: '中國', name_jp: '中国' },
    { id: 8, name: 'shikoku', name_ch: '四國', name_jp: '四国' },
    { id: 9, name: 'kyushu', name_ch: '九州', name_jp: '九州' },
];

// Generate mock price data for a given day
function generateMockPriceData(areaName: string, seed: number): ChartDataPoint[] {
    const data: ChartDataPoint[] = [];
    const basePrice = 8 + (seed % 5);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Generate 48 time slots (30 min each)
    for (let i = 0; i < 48; i++) {
        const hour = Math.floor(i / 2);
        const minute = (i % 2) * 30;
        const timestamp = new Date(today);
        timestamp.setHours(hour, minute, 0, 0);

        // Skip future times
        if (timestamp > now) continue;

        // Add some variation based on time of day
        let priceModifier = 0;
        if (hour >= 8 && hour <= 10) priceModifier = 4; // Morning peak
        if (hour >= 17 && hour <= 20) priceModifier = 6; // Evening peak
        if (hour >= 23 || hour <= 5) priceModifier = -2; // Night low

        const randomVariation = (Math.sin(seed * i * 0.3) + Math.cos(seed * i * 0.2)) * 2;
        const price = Math.max(3, basePrice + priceModifier + randomVariation);

        const dateStr = today.toISOString().slice(0, 10);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        data.push({
            dateTime: `${dateStr} ${timeStr}`,
            timestamp: timestamp.getTime(),
            actualPrice: parseFloat(price.toFixed(2)),
            modelPredictions: [],
            isPrediction: false,
            date: dateStr,
            time: timeStr,
        });
    }

    return data;
}

// Generate mock chart data for all areas
export function generateMockChartData(): Record<string, ChartDataPoint[]> {
    const result: Record<string, ChartDataPoint[]> = {};
    mockAreas.forEach((area, idx) => {
        result[area.name] = generateMockPriceData(area.name, idx + 1);
    });
    return result;
}

// Mock outage data
export const mockOutages: HjksOutage[] = [
    {
        id: 1,
        area: '中部',
        company: '中部電力',
        plantcd: 'P001',
        name: '碧南火力',
        format: '火力',
        unitcd: 'U3',
        unit_name: '3号機',
        max_capacity: 700,
        stop_category: '計画停止',
        stop_type: '定期点検',
        start_datetime: new Date(Date.now() - 86400000 * 2).toISOString(),
        outlook: '作業中',
        end_datetime: new Date(Date.now() + 86400000 * 5).toISOString(),
        factor: '定期点検',
        upddt: new Date().toISOString(),
        down_capacity: 700,
    },
    {
        id: 2,
        area: '北陸',
        company: '北陸電力',
        plantcd: 'P002',
        name: '敦賀',
        format: '原子力',
        unitcd: 'U2',
        unit_name: '2号機',
        max_capacity: 500,
        stop_category: '計画停止',
        stop_type: '定期検査',
        start_datetime: new Date(Date.now() - 86400000 * 10).toISOString(),
        outlook: '作業中',
        end_datetime: new Date(Date.now() + 86400000 * 30).toISOString(),
        factor: '定期検査',
        upddt: new Date().toISOString(),
        down_capacity: 500,
    },
    {
        id: 3,
        area: '関西',
        company: '関西電力',
        plantcd: 'P003',
        name: '姫路第一',
        format: '火力',
        unitcd: 'U1',
        unit_name: '1号機',
        max_capacity: 320,
        stop_category: '計画停止',
        stop_type: '補修工事',
        start_datetime: new Date(Date.now() - 86400000 * 1).toISOString(),
        outlook: '作業中',
        end_datetime: new Date(Date.now() + 86400000 * 3).toISOString(),
        factor: 'ボイラー補修',
        upddt: new Date().toISOString(),
        down_capacity: 320,
    },
];

// Get mock data date string
export function getMockDataDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}
