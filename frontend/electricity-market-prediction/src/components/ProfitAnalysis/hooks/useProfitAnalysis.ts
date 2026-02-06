import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChartDataPoint, hashString, generateColor } from '@/utils/chartUtils';
import { useTheme } from '@/app/ThemeProvider';

interface UseProfitAnalysisProps {
    chartData: ChartDataPoint[];
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    topBottomPairs: number;
}

export const useProfitAnalysis = ({
    chartData,
    selectedModels,
    topBottomPairs
}: UseProfitAnalysisProps) => {
    const { darkMode } = useTheme();

    // 顏色設定
    const colors = useMemo(() => ({
        grid: darkMode ? '#333' : '#e6e6e6',
        background: darkMode ? '#1a1a1a' : '#ffffff',
        text: darkMode ? '#d9d9d9' : '#000000',
        subText: darkMode ? '#a6a6a6' : '#595959',
        tooltipBg: darkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        tooltipBorder: darkMode ? '#444' : '#d9d9d9',
        actual: darkMode ? '#ff4d4f' : '#cf1322',
    }), [darkMode]);

    // 為每個模型分配顏色 - Optimized to maximize color distinction
    const modelColorMap = useMemo(() => {
        const colorMap: Record<string, string> = {};
        const usedColors: string[] = [];
        
        // First pass: assign colors to models that already have colors
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            if (model.color) {
                colorMap[modelKey] = model.color;
                usedColors.push(model.color);
            }
        });
        
        // Second pass: assign distinct colors to models without colors
        selectedModels.forEach((model) => {
            const modelKey = `${model.id}|${model.name}`;
            if (!colorMap[modelKey]) {
                const assignedColor = generateColor(hashString(modelKey), usedColors);
                colorMap[modelKey] = assignedColor;
                usedColors.push(assignedColor);
            }
        });
        
        return colorMap;
    }, [selectedModels]);

    // 按日期分組數據
    const dataByDate = useMemo(() => {
        const groupedData: Record<string, ChartDataPoint[]> = {};

        chartData.forEach((point: ChartDataPoint) => {
            const [datePart] = point.dateTime.split(' ');
            if (!groupedData[datePart]) {
                groupedData[datePart] = [];
            }
            groupedData[datePart].push(point);
        });

        return groupedData;
    }, [chartData]);

    // 計算每日收益
    const dailyProfits = useMemo(() => {
        const result: {
            date: string;
            formattedDate: string;
            actualProfit: number | null;
            [key: string]: any;
        }[] = [];

        Object.entries(dataByDate).forEach(([date, points]) => {
            // 確保有 48 個點，否則可能數據不全
            if (points.length < 48) return;

            // 1. 計算實際收益
            // 找出實際價格
            const actualPrices = points.map((p: ChartDataPoint) => ({
                price: p.actualPrice,
                time: p.time,
                dateTime: p.dateTime
            })).filter(p => p.price !== null) as { price: number, time: string, dateTime: string }[];

            let actualProfit: number | null = null;

            if (actualPrices.length === 48) { // 只有當所有實際價格都存在時才計算（或者根據需求放寬）
                // 排序實際價格
                const sortedActual = [...actualPrices].sort((a, b) => b.price - a.price);

                // 取前 N 個最高價和後 N 個最低價
                const topN = sortedActual.slice(0, topBottomPairs);
                const bottomN = sortedActual.slice(-topBottomPairs); // 負數索引取最後 N 個

                const sumTop = topN.reduce((sum, p) => sum + p.price, 0);
                const sumBottom = bottomN.reduce((sum, p) => sum + p.price, 0);

                actualProfit = sumTop - sumBottom;
            }

            const dailyResult: any = {
                date,
                formattedDate: format(parseISO(date), 'MM/dd'),
                actualProfit
            };

            // 2. 計算各模型的收益
            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;

                // 找出該模型的預測
                const predictions = points.map((p: ChartDataPoint) => {
                    const pred = p.modelPredictions.find(
                        mp => `${mp.modelId}|${mp.modelName}` === modelKey
                    );
                    return {
                        predictedPrice: pred?.predictedPrice ?? null,
                        actualPrice: p.actualPrice, // 我們需要對應時間點的實際價格來計算收益
                        time: p.time
                    };
                }).filter(p => p.predictedPrice !== null); // 只考慮有預測值的點

                if (predictions.length < 48) { // 假設需要完整的預測
                    dailyResult[`${modelKey}_profit`] = null;
                    return;
                }

                // 根據預測價格排序找出最高和最低的時段
                const sortedPredictions = [...predictions].sort((a, b) => (b.predictedPrice as number) - (a.predictedPrice as number));

                const modelTopN = sortedPredictions.slice(0, topBottomPairs);
                const modelBottomN = sortedPredictions.slice(-topBottomPairs);

                // 使用這些時段的 *實際價格* 來計算收益
                // 如果實際價格缺失，則無法計算（或視為0，這裡假設無法計算）
                let valid = true;
                let sumTopActual = 0;
                let sumBottomActual = 0;

                for (const p of modelTopN) {
                    if (p.actualPrice === null) { valid = false; break; }
                    sumTopActual += (p.actualPrice as number);
                }
                for (const p of modelBottomN) {
                    if (p.actualPrice === null) { valid = false; break; }
                    sumBottomActual += (p.actualPrice as number);
                }

                if (valid) {
                    dailyResult[`${modelKey}_profit`] = sumTopActual - sumBottomActual;
                } else {
                    dailyResult[`${modelKey}_profit`] = null;
                }
            });

            result.push(dailyResult);
        });

        return result.sort((a, b) => a.date.localeCompare(b.date));
    }, [dataByDate, selectedModels, topBottomPairs]);

    // 計算累計收益，同時合併每日數據
    const combinedData = useMemo(() => {
        const result: any[] = [];
        let cumulativeActual = 0;
        const cumulativeModel: Record<string, number> = {};

        selectedModels.forEach(model => {
            cumulativeModel[`${model.id}|${model.name}`] = 0;
        });

        dailyProfits.forEach((day: any) => {
            const item: any = { ...day }; // 複製每日數據 (date, formattedDate, actualProfit, [model]_profit)

            // 累計 Actual
            if (day.actualProfit !== null) {
                cumulativeActual += day.actualProfit;
            }
            item.cumulativeActual = cumulativeActual;

            // 累計 Model
            selectedModels.forEach(model => {
                const modelKey = `${model.id}|${model.name}`;
                const profit = day[`${modelKey}_profit`];
                if (profit !== null && profit !== undefined) {
                    cumulativeModel[modelKey] += profit;
                }
                item[`${modelKey}_cumulative`] = cumulativeModel[modelKey];
            });

            result.push(item);
        });

        return result;
    }, [dailyProfits, selectedModels]);

    // 總收益摘要
    const totalProfits = useMemo(() => {
        if (combinedData.length === 0) return {};
        const lastDay = combinedData[combinedData.length - 1];
        return lastDay;
    }, [combinedData]);

    return {
        colors,
        modelColorMap,
        dailyProfits,
        combinedData,
        totalProfits
    };
};
