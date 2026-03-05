
import React, { useState, useTransition } from 'react';
import {
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    ListItemIcon,
    Checkbox,
    Typography,
    Collapse,
    Paper,
    Box,
    alpha,
    Alert,
    Tooltip,
    Chip
} from '@mui/material';
import {
    ExpandMore, ExpandLess,
    Balance, SwapHoriz, Cloud, Map, ShowChart, BarChart, Percent,
    StackedLineChart,
    InfoOutlined,
    BatteryChargingFull
} from '@mui/icons-material';
import { useMarketDataContext } from '@/context/MarketDataContext';
import { usePriceChart } from '@/components/price-chart/context/PriceChartContext';
import { occtoFields, occtoStackedFields, weatherFields, INTERCONNECTION_FIELDS, BATTERY_FIELDS, BID_PLAN_BASE_FIELDS } from '@/components/price-chart/constants';
import { SectionHeader, SubHeader, SOURCE_COLORS } from '@/components/selectors/shared';

const DataSourceInfo: React.FC<{ title: string }> = ({ title }) => (
    <Tooltip title={title} placement="top" arrow enterDelay={300}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <InfoOutlined sx={{ fontSize: '1rem', color: 'text.secondary', ml: 0.5, verticalAlign: 'middle', cursor: 'help' }} />
        </Box>
    </Tooltip>
);

interface DataSourceSelectorProps {
    expanded: boolean;
    onToggle: () => void;
    step?: number;
    description?: string;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
    expanded,
    onToggle,
    step = 3,
    description = '勾選要在主圖上顯示的資料',
}) => {
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
        weather: false,
        occto: true,
    });
    const [, startTransition] = useTransition();

    const {
        focusedDataSource,
        setFocusedDataSource,
        showImbalance, setShowImbalance,
        showImbalanceQuantity, setShowImbalanceQuantity,
        showImbalanceSurplusRate, setShowImbalanceSurplusRate,
        showImbalanceDeficitRate, setShowImbalanceDeficitRate,
        showIntraday, setShowIntraday,
        showIntradayAverage, setShowIntradayAverage,
        showWeather, setShowWeather,
        showWeatherActual, setShowWeatherActual,
        showWeatherForecast, setShowWeatherForecast,
        showOcctoArea, setShowOcctoArea,
        showActualPrice, setShowActualPrice,
        dataFetchWarnings,
        imbalanceData,
        intradayData,
        interconnectionData,
        batteryData,
        bidPlansData,
        weatherActual,
        weatherForecast,
        occtoAreaData,
    } = useMarketDataContext();

    // Data availability checks
    const hasImbalanceData = imbalanceData && imbalanceData.length > 0;
    const hasIntradayData = intradayData && intradayData.length > 0;
    const hasInterconnectionData = interconnectionData && interconnectionData.length > 0;
    const hasBatteryData = batteryData && batteryData.length > 0;
    const hasWeatherActualData = weatherActual && weatherActual.length > 0;
    const hasWeatherForecastData = weatherForecast && weatherForecast.length > 0;
    const hasWeatherData = hasWeatherActualData || hasWeatherForecastData;
    const hasOcctoData = occtoAreaData && occtoAreaData.length > 0;
    const hasBidPlansData = bidPlansData && bidPlansData.length > 0;

    // Context getters with fallbacks
    let selectedOcctoFields: Set<string> = new Set(['area_demand']);
    let setSelectedOcctoFields: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let selectedInterconnectionFields: Set<string> = new Set(['flow_diff']);
    let setSelectedInterconnectionFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void = () => { };
    let selectedBatteryFields: Set<string> = new Set(['spot_value']);
    let setSelectedBatteryFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void = () => { };
    let selectedBidPlanFields: Set<string> = new Set(['buy_price']); // 存储去掉 'bid_' 前缀的字段名
    let setSelectedBidPlanFields: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void = () => { };
    let availableBidPlanCategories: string[] = [];
    let selectedBidPlanCategories: Set<string> = new Set(['spot']); // 预设选择现货市场
    let setSelectedBidPlanCategories: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void = () => { };
    let availableSiteIds: string[] = [];
    let selectedSiteIds: Set<string> = new Set();
    let setSelectedSiteIds: (val: Set<string> | ((prev: Set<string>) => Set<string>)) => void = () => { };
    let selectedWeatherFieldsActual: Set<string> = new Set(['temperature']);
    let setSelectedWeatherFieldsActual: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let selectedWeatherFieldsForecast: Set<string> = new Set(['temperature']);
    let setSelectedWeatherFieldsForecast: (fn: (prev: Set<string>) => Set<string>) => void = () => { };
    let occtoChartType: 'stacked' | 'area' = 'stacked';
    let setOcctoChartType: (val: 'stacked' | 'area') => void = () => { };

    try {
        const chartContext = usePriceChart();
        selectedOcctoFields = chartContext.selectedOcctoFields;
        setSelectedOcctoFields = chartContext.setSelectedOcctoFields;
        selectedInterconnectionFields = chartContext.selectedInterconnectionFields;
        setSelectedInterconnectionFields = chartContext.setSelectedInterconnectionFields;
        selectedBatteryFields = chartContext.selectedBatteryFields;
        setSelectedBatteryFields = chartContext.setSelectedBatteryFields;
        selectedBidPlanFields = (chartContext as any).selectedBidPlanFields ?? new Set(['bid_buy_price']);
        setSelectedBidPlanFields = (chartContext as any).setSelectedBidPlanFields ?? (() => { });
        availableBidPlanCategories = (chartContext as any).availableBidPlanCategories ?? [];
        selectedBidPlanCategories = (chartContext as any).selectedBidPlanCategories ?? new Set(['spot']);
        setSelectedBidPlanCategories = (chartContext as any).setSelectedBidPlanCategories ?? (() => { });
        availableSiteIds = (chartContext as any).availableSiteIds ?? [];
        selectedSiteIds = (chartContext as any).selectedSiteIds ?? new Set();
        setSelectedSiteIds = (chartContext as any).setSelectedSiteIds ?? (() => { });
        selectedWeatherFieldsActual = (chartContext as any).selectedWeatherFieldsActual ?? new Set(['temperature']);
        setSelectedWeatherFieldsActual = (chartContext as any).setSelectedWeatherFieldsActual ?? (() => { });
        selectedWeatherFieldsForecast = (chartContext as any).selectedWeatherFieldsForecast ?? new Set(['temperature']);
        setSelectedWeatherFieldsForecast = (chartContext as any).setSelectedWeatherFieldsForecast ?? (() => { });
        occtoChartType = chartContext.occtoChartType;
        setOcctoChartType = chartContext.setOcctoChartType;
    } catch { }

    const toggleOcctoField = (field: string) => {
        startTransition(() => {
            setSelectedOcctoFields((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(field)) newSet.delete(field);
                else newSet.add(field);
                if (newSet.size === 0) newSet.add('area_demand');
                return newSet;
            });
        });
    };

    const toggleWeatherFieldActual = (field: string) => {
        startTransition(() => {
            setSelectedWeatherFieldsActual((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(field)) newSet.delete(field);
                else newSet.add(field);
                if (newSet.size === 0) newSet.add('temperature');
                return newSet;
            });
        });
    };

    const toggleWeatherFieldForecast = (field: string) => {
        startTransition(() => {
            setSelectedWeatherFieldsForecast((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(field)) newSet.delete(field);
                else newSet.add(field);
                if (newSet.size === 0) newSet.add('temperature');
                return newSet;
            });
        });
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 0,
                backgroundColor: 'transparent',
                flexShrink: 0,
            }}
        >
            <SectionHeader
                onClick={onToggle}
                expanded={expanded}
                step={step}
                description={description}
            >
                圖表疊加資料
            </SectionHeader>

            {/* Collapsed summary: list selected data sources */}
            {!expanded && (() => {
                const selected: string[] = [];
                if (showActualPrice) selected.push('現貨實際價格');
                if (showImbalanceQuantity || showImbalanceSurplusRate || showImbalanceDeficitRate) selected.push('不平衡市場');
                if (showIntraday || showIntradayAverage) selected.push('日前市場');
                if (selectedInterconnectionFields.size > 0) selected.push('互連');
                if (selectedBatteryFields.size > 0) selected.push('電池');
                if (showWeather) selected.push('天氣');
                if (showOcctoArea) selected.push('OCCTO 區域');
                return (
                    <Box sx={{ px: 2, py: 1, borderLeft: '3px solid var(--primary)', ml: 0.5, bgcolor: 'var(--hover-bg)' }}>
                        <Typography variant="caption" color="text.secondary">已選：</Typography>
                        <Typography component="span" variant="caption" sx={{ fontWeight: 500 }}>
                            {selected.length > 0 ? selected.join('、') : '—'}
                        </Typography>
                    </Box>
                );
            })()}

            <Collapse in={expanded}>
                <Box
                    sx={{
                        borderLeft: '3px solid color-mix(in srgb, var(--primary), transparent 40%)',
                        bgcolor: 'var(--card-bg)',
                        borderRadius: '0 8px 8px 0',
                        py: 0.5,
                        pl: 1.5,
                        pr: 1,
                        pb: 0.5,
                    }}
                >
                    {dataFetchWarnings != null && dataFetchWarnings.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 1, py: 0.5, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                            部分資料無法載入：{dataFetchWarnings.join('、')}
                        </Alert>
                    )}
                    <List dense sx={{ p: 0 }}>

                        <SubHeader label="市場價格" />

                        {/* Actual Price Toggle */}
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => setShowActualPrice(!showActualPrice)}
                                sx={{
                                    borderLeft: showActualPrice ? `4px solid #ef5350` : '4px solid transparent',
                                    backgroundColor: showActualPrice ? alpha('#ef5350', 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha('#ef5350', 0.15) }
                                }}
                            >
                                <Checkbox
                                    checked={showActualPrice}
                                    size="small"
                                    sx={{ color: '#ef5350', '&.Mui-checked': { color: '#ef5350' } }}
                                    onChange={(e) => { e.stopPropagation(); setShowActualPrice(e.target.checked); }}
                                    onClick={e => e.stopPropagation()}
                                />
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <ShowChart sx={{ fontSize: '1.1rem', color: showActualPrice ? '#ef5350' : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="現貨實際價格" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="JEPX 現貨市場實際成交價格（每 30 分鐘），依所選區域顯示。" />
                            </ListItemButton>
                        </ListItem>

                        {/* 日前市場 - 子項：即時 K 線、平均價格線（與不平衡市場同結構） */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => setFocusedDataSource(focusedDataSource === 'intraday' ? null : 'intraday')}
                                sx={{
                                    borderLeft: focusedDataSource === 'intraday' ? `4px solid ${SOURCE_COLORS.intraday}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'intraday' ? alpha(SOURCE_COLORS.intraday, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.intraday, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <SwapHoriz sx={{ fontSize: '1.1rem', color: (showIntraday || showIntradayAverage) ? SOURCE_COLORS.intraday : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="日前市場" secondary={!hasIntradayData ? '無資料' : undefined} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="JEPX 日前市場的 K 線（開高低收）與平均價，可分別勾選疊加於圖表。" />
                                {focusedDataSource === 'intraday' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={focusedDataSource === 'intraday'} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.intraday, 0.03) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={showIntraday}
                                            onChange={(e) => setShowIntraday(e.target.checked)}
                                            sx={{ p: 0.5, mr: 1, color: SOURCE_COLORS.intraday, '&.Mui-checked': { color: SOURCE_COLORS.intraday } }}
                                        />
                                        <Typography variant="caption">即時 K 線（開高低收）</Typography>
                                        <DataSourceInfo title="日前市場每 30 分鐘的 K 線（開盤、最高、最低、收盤價）。" />
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={showIntradayAverage}
                                            onChange={(e) => setShowIntradayAverage(e.target.checked)}
                                            sx={{ p: 0.5, mr: 1, color: '#ffa726', '&.Mui-checked': { color: '#ffa726' } }}
                                        />
                                        <Typography variant="caption">平均價格線</Typography>
                                        <DataSourceInfo title="日前市場該時段平均成交價的折線。" />
                                    </Box>
                                </Box>
                            </Collapse>
                        </ListItem>

                        <SubHeader label="不平衡市場" />

                        {/* Imbalance section: 不平衡量、剩餘單價、不足單價（與圖表同色） */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => setFocusedDataSource(focusedDataSource === 'imbalance' ? null : 'imbalance')}
                                sx={{
                                    borderLeft: focusedDataSource === 'imbalance' ? `4px solid ${SOURCE_COLORS.imbalance}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'imbalance' ? alpha(SOURCE_COLORS.imbalance, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.imbalance, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Balance sx={{ fontSize: '1.1rem', color: (showImbalanceQuantity || showImbalanceSurplusRate || showImbalanceDeficitRate) ? SOURCE_COLORS.imbalance : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="不平衡市場" secondary={!hasImbalanceData ? '無資料' : undefined} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="電力系統不平衡量與不平衡單價（剩餘／不足），可分別勾選數量、剩餘單價、不足單價疊加於圖表。" />
                                {focusedDataSource === 'imbalance' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={focusedDataSource === 'imbalance'} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.imbalance, 0.03) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={showImbalanceQuantity}
                                            onChange={(e) => setShowImbalanceQuantity(e.target.checked)}
                                            sx={{ p: 0.5, mr: 1, color: SOURCE_COLORS.imbalance, '&.Mui-checked': { color: SOURCE_COLORS.imbalance } }}
                                        />
                                        <Typography variant="caption">不平衡量 (Quantity)</Typography>
                                        <DataSourceInfo title="每 30 分鐘的不平衡電量（kWh），顯示於副軸。" />
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={showImbalanceSurplusRate}
                                            onChange={(e) => setShowImbalanceSurplusRate(e.target.checked)}
                                            sx={{ p: 0.5, mr: 1, color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }}
                                        />
                                        <Typography variant="caption">剩餘單價 (Surplus Rate)</Typography>
                                        <DataSourceInfo title="電力剩餘時的不平衡單價（円/kWh），疊加於主圖右軸。" />
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            size="small"
                                            checked={showImbalanceDeficitRate}
                                            onChange={(e) => setShowImbalanceDeficitRate(e.target.checked)}
                                            sx={{ p: 0.5, mr: 1, color: '#e65100', '&.Mui-checked': { color: '#e65100' } }}
                                        />
                                        <Typography variant="caption">不足單價 (Deficit Rate)</Typography>
                                        <DataSourceInfo title="電力不足時的不平衡單價（円/kWh），疊加於主圖右軸。" />
                                    </Box>
                                </Box>
                            </Collapse>
                        </ListItem>

                        <SubHeader label="互連" />

                        {/* Interconnection section: 可展開，多欄位預留 */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => setFocusedDataSource(focusedDataSource === 'interconnection' ? null : 'interconnection')}
                                sx={{
                                    borderLeft: focusedDataSource === 'interconnection' ? `4px solid ${SOURCE_COLORS.interconnection}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'interconnection' ? alpha(SOURCE_COLORS.interconnection, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.interconnection, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <SwapHoriz sx={{ fontSize: '1.1rem', color: selectedInterconnectionFields.size > 0 ? SOURCE_COLORS.interconnection : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="互連" secondary={!hasInterconnectionData ? '無資料' : undefined} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="區域間互連線的計畫流量、實際流量、可用容量、餘裕等欄位，可勾選要疊加於圖表的項目。" />
                                {focusedDataSource === 'interconnection' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={focusedDataSource === 'interconnection'} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.interconnection, 0.03) }}>
                                    {INTERCONNECTION_FIELDS.map((f) => (
                                        <Box key={f.key} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Checkbox
                                                size="small"
                                                checked={selectedInterconnectionFields.has(f.key)}
                                                onChange={() => {
                                                    startTransition(() => {
                                                        setSelectedInterconnectionFields((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(f.key)) next.delete(f.key);
                                                            else next.add(f.key);
                                                            return next;
                                                        });
                                                    });
                                                }}
                                                sx={{ p: 0.5, mr: 1, color: f.color, '&.Mui-checked': { color: f.color } }}
                                            />
                                            <Typography variant="caption" sx={{ color: f.color }}>{f.label}</Typography>
                                            <DataSourceInfo title={`${f.label}，單位 MW，顯示於互連副軸。`} />
                                        </Box>
                                    ))}
                                </Box>
                            </Collapse>
                        </ListItem>

                        <SubHeader label="電池" />

                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => setFocusedDataSource(focusedDataSource === 'battery' ? null : 'battery')}
                                sx={{
                                    borderLeft: focusedDataSource === 'battery' ? `4px solid ${SOURCE_COLORS.battery}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'battery' ? alpha(SOURCE_COLORS.battery, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.battery, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <BatteryChargingFull sx={{ fontSize: '1.1rem', color: selectedBatteryFields.size > 0 ? SOURCE_COLORS.battery : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="電池" secondary={!hasBatteryData ? '無資料' : undefined} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="電池現貨/日前/一次調整力、SOC 等，負=充電、正=放電，可勾選疊加於圖表。" />
                                {focusedDataSource === 'battery' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={focusedDataSource === 'battery'} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.battery, 0.03) }}>
                                    {BATTERY_FIELDS.map((f) => (
                                        <Box key={f.key} sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Checkbox
                                                size="small"
                                                checked={selectedBatteryFields.has(f.key)}
                                                onChange={() => {
                                                    startTransition(() => {
                                                        setSelectedBatteryFields((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(f.key)) next.delete(f.key);
                                                            else next.add(f.key);
                                                            return next;
                                                        });
                                                    });
                                                }}
                                                sx={{ p: 0.5, mr: 1, color: f.color, '&.Mui-checked': { color: f.color } }}
                                            />
                                            <Typography variant="caption" sx={{ color: f.color }}>{f.label}</Typography>
                                            <DataSourceInfo title={`${f.label}，顯示於電池副軸。負=充電、正=放電。`} />
                                        </Box>
                                    ))}
                                </Box>
                            </Collapse>
                        </ListItem>

                        {/* Bid Plans (Pink/Orange) */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => setFocusedDataSource(focusedDataSource === 'bidPlans' ? null : 'bidPlans')}
                                sx={{
                                    borderLeft: focusedDataSource === 'bidPlans' ? `4px solid ${SOURCE_COLORS.bidPlans}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'bidPlans' ? alpha(SOURCE_COLORS.bidPlans, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.bidPlans, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <ShowChart sx={{ fontSize: '1.1rem', color: selectedBidPlanFields.size > 0 ? SOURCE_COLORS.bidPlans : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText primary="投標計畫" secondary={!hasBidPlansData ? '無資料' : undefined} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                <DataSourceInfo title="各市場入標結果資料。以盲標單一價格競標方式約定之買入/賣出入標價格與電力量。可透過市場分類晶片切換不同市場（現貨、當日等）。" />
                                {focusedDataSource === 'bidPlans' ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={focusedDataSource === 'bidPlans'} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, py: 0.5, bgcolor: alpha(SOURCE_COLORS.bidPlans, 0.03) }}>
                                    {/* Dynamic category chips */}
                                    {availableBidPlanCategories.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                            <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', fontSize: '0.7rem', mb: 0.25 }}>
                                                市場分類
                                            </Typography>
                                            {availableBidPlanCategories.map((cat) => (
                                                <Chip
                                                    key={cat}
                                                    label={cat === 'spot' ? '現貨市場' : cat === 'intraday' ? '日內市場' : cat}
                                                    size="small"
                                                    variant={selectedBidPlanCategories.has(cat) ? 'filled' : 'outlined'}
                                                    color={selectedBidPlanCategories.has(cat) ? 'primary' : 'default'}
                                                    onClick={() => {
                                                        startTransition(() => {
                                                            setSelectedBidPlanCategories((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(cat)) next.delete(cat);
                                                                else next.add(cat);
                                                                return next;
                                                            });
                                                        });
                                                    }}
                                                    sx={{ fontSize: '0.7rem', height: 24 }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    {/* Site ID chips */}
                                    {availableSiteIds.length > 0 && (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                            <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', fontSize: '0.7rem', mb: 0.25 }}>
                                                案場
                                            </Typography>
                                            {availableSiteIds.map((siteId) => (
                                                <Chip
                                                    key={siteId}
                                                    label={siteId}
                                                    size="small"
                                                    variant={selectedSiteIds.has(siteId) ? 'filled' : 'outlined'}
                                                    color={selectedSiteIds.has(siteId) ? 'secondary' : 'default'}
                                                    onClick={() => {
                                                        startTransition(() => {
                                                            setSelectedSiteIds((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(siteId)) next.delete(siteId);
                                                                else next.add(siteId);
                                                                return next;
                                                            });
                                                        });
                                                    }}
                                                    sx={{ fontSize: '0.7rem', height: 24 }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    {/* 显示所有基础字段，但根据选中的 category 显示不同的标签 */}
                                    {BID_PLAN_BASE_FIELDS.map((f) => {
                                        const fieldKeyWithoutPrefix = f.key.replace('bid_', ''); // 'buy_price', 'buy_volume' 等
                                        return (
                                            <Box key={f.key} sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Checkbox
                                                    size="small"
                                                    checked={selectedBidPlanFields.has(fieldKeyWithoutPrefix)}
                                                    onChange={() => {
                                                        startTransition(() => {
                                                            setSelectedBidPlanFields((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(fieldKeyWithoutPrefix)) next.delete(fieldKeyWithoutPrefix);
                                                                else next.add(fieldKeyWithoutPrefix);
                                                                return next;
                                                            });
                                                        });
                                                    }}
                                                    sx={{ p: 0.5, mr: 1, color: f.color, '&.Mui-checked': { color: f.color } }}
                                                />
                                                <Typography variant="caption" sx={{ color: f.color }}>{f.label}</Typography>
                                                <DataSourceInfo title={f.key === 'bid_buy_price' ? '買入入標價格（圓/kWh）。需求方所提出「此價格以下才購買」的入標價格。' : f.key === 'bid_buy_volume' ? '買入入標電力量（kWh）。需求方希望購買的電力量。' : f.key === 'bid_sell_price' ? '賣出入標價格（圓/kWh）。供給方所提出「此價格以上才出售」的入標價格。' : f.key === 'bid_sell_volume' ? '賣出入標電力量（kWh）。供給方希望出售的電力量。' : f.label} />
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Collapse>
                        </ListItem>

                        <SubHeader label="環境" />

                        {/* Weather (Blue/Amber) */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => {
                                    setFocusedDataSource(focusedDataSource === 'weather' ? null : 'weather');
                                    setExpandedGroups(prev => ({ ...prev, weather: !prev.weather }));
                                }}
                                sx={{
                                    borderLeft: focusedDataSource === 'weather' ? `4px solid ${SOURCE_COLORS.weather}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'weather' ? alpha(SOURCE_COLORS.weather, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.weather, 0.15) }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32, ml: 1 }}> {/* 調整 icon 位置對齊 checkbox */}
                                    <Cloud sx={{ fontSize: '1.1rem', color: showWeather ? SOURCE_COLORS.weather : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="天氣"
                                    secondary={!hasWeatherData ? '無資料' : '含實際值與預測值'}
                                    primaryTypographyProps={{ fontSize: '0.85rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                />
                                <DataSourceInfo title="氣溫、降雨、風速等氣象資料，可選實際觀測或預測值，疊加於副軸。" />
                                {expandedGroups.weather ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={expandedGroups.weather} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 2, pr: 2, pb: 1.5, pt: 0.5, bgcolor: alpha(SOURCE_COLORS.weather, 0.02) }}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        {/* Weather Actual Column */}
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: `1px solid ${alpha(SOURCE_COLORS.weatherActual, 0.3)}`, pb: 0.5 }}>
                                                <Checkbox
                                                    checked={showWeatherActual}
                                                    size="small"
                                                    sx={{ p: 0.5, color: SOURCE_COLORS.weatherActual, '&.Mui-checked': { color: SOURCE_COLORS.weatherActual } }}
                                                    onChange={(e) => {
                                                        startTransition(() => {
                                                            setShowWeatherActual(e.target.checked);
                                                            setShowWeather(e.target.checked || showWeatherForecast);
                                                        });
                                                    }}
                                                />
                                                <Typography variant="caption" fontWeight="bold">實際觀測</Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 0.5, display: 'block' }}>欄位</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                {weatherFields.map((field) => {
                                                    const isSelected = selectedWeatherFieldsActual.has(field.value);
                                                    return (
                                                        <Tooltip key={`actual-${field.value}`} title={`${field.label} (${field.unit})`} arrow placement="top">
                                                            <Box
                                                                onClick={() => toggleWeatherFieldActual(field.value)}
                                                                sx={{
                                                                    px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: isSelected ? alpha(field.color, 0.15) : 'transparent',
                                                                    color: isSelected ? field.color : 'text.secondary',
                                                                    border: `1px solid ${isSelected ? field.color : 'var(--card-border)'}`,
                                                                    '&:hover': { bgcolor: alpha(field.color, 0.25) }
                                                                }}
                                                            >
                                                                {field.label}
                                                            </Box>
                                                        </Tooltip>
                                                    )
                                                })}
                                            </Box>
                                        </Box>

                                        {/* Weather Forecast Column */}
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: `1px solid ${alpha(SOURCE_COLORS.weatherForecast, 0.3)}`, pb: 0.5 }}>
                                                <Checkbox
                                                    checked={showWeatherForecast}
                                                    size="small"
                                                    sx={{ p: 0.5, color: SOURCE_COLORS.weatherForecast, '&.Mui-checked': { color: SOURCE_COLORS.weatherForecast } }}
                                                    onChange={(e) => {
                                                        startTransition(() => {
                                                            setShowWeatherForecast(e.target.checked);
                                                            setShowWeather(e.target.checked || showWeatherActual);
                                                        });
                                                    }}
                                                />
                                                <Typography variant="caption" fontWeight="bold">預報</Typography>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mb: 0.5, display: 'block' }}>欄位</Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                {weatherFields.map((field) => {
                                                    const isSelected = selectedWeatherFieldsForecast.has(field.value);
                                                    return (
                                                        <Tooltip key={`forecast-${field.value}`} title={`${field.label} (${field.unit})`} arrow placement="top">
                                                            <Box
                                                                onClick={() => toggleWeatherFieldForecast(field.value)}
                                                                sx={{
                                                                    px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: isSelected ? alpha(field.color, 0.15) : 'transparent',
                                                                    color: isSelected ? field.color : 'text.secondary',
                                                                    border: `1px solid ${isSelected ? field.color : 'var(--card-border)'}`,
                                                                    '&:hover': { bgcolor: alpha(field.color, 0.25) }
                                                                }}
                                                            >
                                                                {field.label}
                                                            </Box>
                                                        </Tooltip>
                                                    )
                                                })}
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Collapse>
                        </ListItem>

                        <SubHeader label="供需與廣域" />

                        {/* OCCTO (Teal) */}
                        <ListItem disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <ListItemButton
                                onClick={() => {
                                    setFocusedDataSource(focusedDataSource === 'occto' ? null : 'occto');
                                    setExpandedGroups(prev => ({ ...prev, occto: !prev.occto }));
                                }}
                                sx={{
                                    borderLeft: focusedDataSource === 'occto' ? `4px solid ${SOURCE_COLORS.occto}` : '4px solid transparent',
                                    backgroundColor: focusedDataSource === 'occto' ? alpha(SOURCE_COLORS.occto, 0.1) : 'transparent',
                                    '&:hover': { backgroundColor: alpha(SOURCE_COLORS.occto, 0.15) }
                                }}
                            >
                                <Checkbox
                                    checked={showOcctoArea}
                                    size="small"
                                    sx={{ color: SOURCE_COLORS.occto, '&.Mui-checked': { color: SOURCE_COLORS.occto } }}
                                    onChange={(e) => { e.stopPropagation(); setShowOcctoArea(e.target.checked); }}
                                    onClick={e => e.stopPropagation()}
                                />
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Map sx={{ fontSize: '1.1rem', color: showOcctoArea ? SOURCE_COLORS.occto : 'text.disabled' }} />
                                </ListItemIcon>
                                <ListItemText
                                    primary="OCCTO 區域"
                                    secondary={!hasOcctoData ? '無資料' : '廣域營運數據'}
                                    primaryTypographyProps={{ fontSize: '0.85rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem' }}
                                />
                                <DataSourceInfo title="OCCTO 廣域營運的區域供需等數據（如需要電量、火力發電量等），可多選欄位疊加。" />
                                {expandedGroups.occto ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </ListItemButton>

                            <Collapse in={expandedGroups.occto} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 6, pr: 2, pb: 1.5, pt: 0.5, bgcolor: alpha(SOURCE_COLORS.occto, 0.02) }}>
                                    {/* Chart Type Toggle */}
                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <Box
                                            onClick={() => setOcctoChartType('stacked')}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
                                                borderRadius: 1, cursor: 'pointer',
                                                bgcolor: occtoChartType === 'stacked' ? alpha(SOURCE_COLORS.occto, 0.2) : 'transparent',
                                                border: '1px solid',
                                                borderColor: occtoChartType === 'stacked' ? SOURCE_COLORS.occto : 'transparent'
                                            }}
                                        >
                                            <BarChart sx={{ fontSize: '1rem', color: occtoChartType === 'stacked' ? SOURCE_COLORS.occto : 'text.secondary' }} />
                                            <Typography variant="caption" color={occtoChartType === 'stacked' ? 'text.primary' : 'text.secondary'}>堆疊</Typography>
                                        </Box>
                                        <Box
                                            onClick={() => setOcctoChartType('area')}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5,
                                                borderRadius: 1, cursor: 'pointer',
                                                bgcolor: occtoChartType === 'area' ? alpha(SOURCE_COLORS.occto, 0.2) : 'transparent',
                                                border: '1px solid',
                                                borderColor: occtoChartType === 'area' ? SOURCE_COLORS.occto : 'transparent'
                                            }}
                                        >
                                            <StackedLineChart sx={{ fontSize: '1rem', color: occtoChartType === 'area' ? SOURCE_COLORS.occto : 'text.secondary' }} />
                                            <Typography variant="caption" color={occtoChartType === 'area' ? 'text.primary' : 'text.secondary'}>區域</Typography>
                                        </Box>
                                    </Box>

                                    {/* Fields by group: 負載 / 發電 / 儲能 / 其他 */}
                                    {[
                                        { label: '負載', keys: ['area_demand'] },
                                        { label: '發電', keys: ['nuclear_power', 'thermal', 'hydropower', 'geothermal_power', 'biomass', 'solar_power_generation_actual', 'wind_power_generation_actual'] },
                                        { label: '儲能', keys: ['pumped_storage', 'battery_storage'] },
                                        { label: '其他', keys: ['interconnection_line', 'others'] },
                                    ].map((group) => {
                                        const fields = group.keys
                                            .map((key) => occtoStackedFields.find((f) => f.key === key))
                                            .filter((f): f is NonNullable<typeof f> => f != null);
                                        if (fields.length === 0) return null;
                                        return (
                                            <Box key={group.label} sx={{ mb: 1.5 }}>
                                                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{group.label}</Typography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                                    {fields.map((fieldObj) => {
                                                        const isSelected = selectedOcctoFields.has(fieldObj.key);
                                                        return (
                                                            <Box
                                                                key={fieldObj.key}
                                                                onClick={() => toggleOcctoField(fieldObj.key)}
                                                                sx={{
                                                                    px: 1, py: 0.5, borderRadius: 10, cursor: 'pointer',
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: isSelected ? alpha(fieldObj.color, 0.15) : 'transparent',
                                                                    color: isSelected ? fieldObj.color : 'text.secondary',
                                                                    border: `1px solid ${isSelected ? fieldObj.color : 'var(--card-border)'}`,
                                                                    '&:hover': { bgcolor: alpha(fieldObj.color, 0.25) }
                                                                }}
                                                            >
                                                                {fieldObj.label}
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Collapse>
                        </ListItem>

                    </List>
                </Box>
            </Collapse>
        </Paper>
    );
};
