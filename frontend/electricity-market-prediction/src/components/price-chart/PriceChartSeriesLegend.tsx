/**
 * 價格圖表系列圖例 | Price chart series legend — toggleable legend for all chart overlays.
 *
 * 顯示當前啟用的所有圖表系列（現貨價格、預測模型、日前市場、不平衡、
 * 互連、電池、OCCTO、天氣等）的圖例項目。
 * 與 dashboard 的 AreaChartLegend（僅顯示「區域顏色＋名稱」）不同，
 * 此元件負責全資料源的可視化圖例。
 *
 * Renders legend items for all active chart series: spot prices, prediction
 * models, intraday market, imbalance, interconnection, battery, OCCTO, and
 * weather overlays. Unlike dashboard's AreaChartLegend (which shows area
 * color indicators), this legend covers all data-source series on the price chart.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';
import { usePriceChart } from './context/PriceChartContext';
import { occtoStackedFields, weatherFields, INTERCONNECTION_FIELDS, BATTERY_FIELDS, BID_PLAN_SPOT_FIELDS, BID_PLAN_INTRADAY_FIELDS, TDGC_FIELDS, TDGC_CATEGORIES } from './constants';
import { WEATHER_FIELD_DISPLAY, DAILY_CATEGORIES } from '@/constants/weatherCategories';

export const PriceChartSeriesLegend: React.FC = () => {
    const { t } = useTranslation('forecast');
    const {
        modelColorMap,
        selectedModels,
        showImbalance,
        showImbalanceQuantity,
        showImbalanceSurplusRate,
        showImbalanceDeficitRate,
        showIntraday,
        showIntradayAverage,
        selectedInterconnectionFields,
        selectedBatteryFields,
        selectedTdgcFields,
        selectedTdgcCategories,
        selectedTdgcDataTypes,
        selectedBidPlanFields,
        selectedBidPlanCategories,
        showOcctoArea,
        selectedOcctoFields,
        showWeather,
        showWeatherActual,
        showWeatherForecast,
        selectedWeatherFieldsActual,
        selectedWeatherFieldsForecast,
        setSelectedWeatherFieldsActual,
        setSelectedWeatherFieldsForecast,
        colors,
        areaName,
        hideObsAndPriceRow
    } = usePriceChart();

    const LegendItem = ({
        color,
        label,
        type = 'line',
        opacity = 1,
        onClick,
        clickable = false
    }: {
        color: string;
        label: string;
        type?: 'line' | 'dashed' | 'box' | 'circle' | 'candlestick' | 'split-line';
        opacity?: number;
        onClick?: () => void;
        clickable?: boolean;
    }) => (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: clickable ? 'pointer' : 'default',
                padding: '4px 6px',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                '&:hover': clickable ? {
                    backgroundColor: 'var(--card-hover-bg, rgba(0, 0, 0, 0.05))'
                } : {}
            }}
            onClick={onClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            } : undefined}
        >
            {type === 'line' && <Box sx={{ width: '12px', height: '2px', bgcolor: color, opacity }} />}
            {type === 'dashed' && <Box sx={{ width: '12px', height: '2px', bgcolor: color, borderStyle: 'dashed', borderBottom: '2px dashed', opacity }} />}
            {type === 'split-line' && (
                <Box sx={{ display: 'flex', width: '12px', height: '2px', opacity }}>
                    <Box sx={{ width: '6px', height: '100%', bgcolor: color }} />
                    <Box sx={{ width: '6px', height: '100%', bgcolor: color, borderStyle: 'dashed', borderBottom: '2px dashed' }} />
                </Box>
            )}
            {type === 'box' && <Box sx={{ width: '10px', height: '10px', bgcolor: color, opacity, borderRadius: 0.5 }} />}
            {type === 'circle' && <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: color, opacity }} />}
            {type === 'candlestick' && (
                <Box sx={{ width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: '1px', height: '12px', bgcolor: color, position: 'absolute' }} />
                    <Box sx={{ width: '6px', height: '8px', bgcolor: color, zIndex: 1 }} />
                </Box>
            )}
            <Typography sx={{ fontSize: 11, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>
                {label}
            </Typography>
        </Box>
    );

    const GroupSeparator = ({ label }: { label: string }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
            <Box sx={{ width: '1px', height: '12px', bgcolor: 'var(--card-border)', mr: 1 }} />
            <Typography sx={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 500 }}>
                {label}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{
            px: 2,
            py: 1.5,
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            backgroundColor: 'var(--card-bg)',
            alignItems: 'center',
            fontSize: '11px',
            minHeight: '40px',
            rowGap: 1
        }}>
            {/* --- Price Section --- */}
            {!hideObsAndPriceRow && (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <LegendItem color={colors.actual} label={t('legend.spotActualPrice')} />
                    {selectedModels.map(model => (
                        <LegendItem
                            key={model.id}
                            color={modelColorMap[`${model.id}|${model.name}`] || model.color}
                            label={model.name}
                        />
                    ))}
                </Box>
            )}

            {/* --- Intraday Section --- */}
            {!hideObsAndPriceRow && (showIntraday || showIntradayAverage || showImbalanceQuantity || showImbalanceSurplusRate || showImbalanceDeficitRate || selectedInterconnectionFields.size > 0 || selectedBatteryFields.size > 0 || selectedTdgcFields.size > 0 || selectedBidPlanFields.size > 0) && (
                <>
                    <GroupSeparator label={t('legend.market')} />
                    {showIntraday && <LegendItem color={colors.intraday} label={t('legend.intraday')} type="candlestick" />}
                    {showIntradayAverage && <LegendItem color="#ffa726" label={t('legend.intradayAvg')} type="dashed" />}
                    {showImbalanceQuantity && <LegendItem color={colors.imbalance} label={t('legend.imbalanceQty')} />}
                    {showImbalanceSurplusRate && <LegendItem color="#4caf50" label={t('legend.surplusRate')} />}
                    {showImbalanceDeficitRate && <LegendItem color="#e65100" label={t('legend.deficitRate')} />}
                    {INTERCONNECTION_FIELDS.filter(f => selectedInterconnectionFields.has(f.key)).map(f => (
                        <LegendItem key={f.key} color={f.color} label={t(f.labelKey)} />
                    ))}
                    {BATTERY_FIELDS.filter(f => selectedBatteryFields.has(f.key)).map(f => (
                        <LegendItem key={f.key} color={f.color} label={t(f.labelKey)} />
                    ))}
                    {TDGC_FIELDS.filter(f => selectedTdgcFields.has(f.key)).flatMap(f => {
                        const dataTypes = selectedTdgcDataTypes.size > 0 ? selectedTdgcDataTypes : new Set(['prompt']);
                        const showDtLabel = dataTypes.size > 1;
                        return Array.from(dataTypes).flatMap(dt =>
                            Array.from(selectedTdgcCategories).map(cat => {
                                const catCfg = TDGC_CATEGORIES[cat];
                                const catLabel = catCfg ? t(catCfg.labelKey) : cat;
                                const catColor = catCfg?.color ?? '#999';
                                const dtSuffix = showDtLabel ? ` (${t(`controlBar.${dt}`)})` : '';
                                const isPrompt = dt === 'prompt';
                                return (
                                    <LegendItem
                                        key={`tdgc-${dt}-${cat}-${f.key}`}
                                        color={catColor}
                                        label={`${catLabel} ${t(f.labelKey)}${dtSuffix}`}
                                        type={f.type === 'quantity' ? 'box' : isPrompt ? 'dashed' : 'line'}
                                        opacity={isPrompt ? 0.6 : 1}
                                    />
                                );
                            })
                        );
                    })}
                    {/* Bid Plan Fields - 根据选中的 category 显示 */}
                    {selectedBidPlanCategories.has('spot') && BID_PLAN_SPOT_FIELDS.filter(f => {
                        const fieldKeyWithoutPrefix = f.key.replace('bid_', '');
                        return selectedBidPlanFields.has(fieldKeyWithoutPrefix);
                    }).map(f => (
                        <LegendItem key={`bp-spot-${f.key}`} color={f.color} label={t(f.labelPrefix) + t(f.labelKey)} />
                    ))}
                    {selectedBidPlanCategories.has('intraday') && BID_PLAN_INTRADAY_FIELDS.filter(f => {
                        const fieldKeyWithoutPrefix = f.key.replace('bid_', '');
                        return selectedBidPlanFields.has(fieldKeyWithoutPrefix);
                    }).map(f => (
                        <LegendItem key={`bp-intraday-${f.key}`} color={f.color} label={t(f.labelPrefix) + t(f.labelKey)} />
                    ))}
                </>
            )}

            {/* --- OCCTO Section --- */}
            {!hideObsAndPriceRow && showOcctoArea && selectedOcctoFields.size > 0 && (
                <>
                    <GroupSeparator label={t('legend.occto')} />
                    {occtoStackedFields
                        .filter(f => selectedOcctoFields.has(f.key))
                        .map(f => (
                            <LegendItem key={f.key} color={f.color} label={t(f.labelKey)} type="box" />
                        ))
                    }
                </>
            )}

            {/* --- Weather Section --- */}
            {(showWeather || showWeatherActual || showWeatherForecast) && (
                <>
                    <GroupSeparator label={t('legend.weather')} />
                    {(() => {
                        const dailyFieldsSet = new Set(DAILY_CATEGORIES.flatMap(c => c.fields));
                        const allSelectedActual = Array.from(selectedWeatherFieldsActual);
                        const allSelectedForecast = Array.from(selectedWeatherFieldsForecast);
                        const allUniqueVisibleFields = Array.from(new Set([...allSelectedActual, ...allSelectedForecast]));

                        return allUniqueVisibleFields.sort().map(field => {
                            const hasActual = showWeatherActual && selectedWeatherFieldsActual.has(field);
                            const hasForecast = showWeatherForecast && selectedWeatherFieldsForecast.has(field);
                            if (!hasActual && !hasForecast) return null;

                            const isDaily = dailyFieldsSet.has(field);
                            const freqStr = isDaily ? t('legend.daily') : t('legend.hourly');
                            const displayInfo = WEATHER_FIELD_DISPLAY[field];

                            // Find color: exact or base prefix match
                            const scalePattern = /_(\d+m?|0_to_7cm|7_to_28cm|28_to_100cm|100_to_255cm|0_to_100cm|max|min|mean|sum)$/;
                            const baseFieldName = field.replace(scalePattern, '');
                            const weatherConfig = weatherFields.find(w => w.value === field || w.value === baseFieldName);
                            const color = weatherConfig?.color || '#888';
                            const label = displayInfo?.shortLabelKey ? t(displayInfo.shortLabelKey) : (weatherConfig?.labelKey ? t(weatherConfig.labelKey) : field);

                            // Handler for toggling weather field visibility
                            const handleToggle = () => {
                                if (showWeatherActual && showWeatherForecast) {
                                    if (hasActual || hasForecast) {
                                        setSelectedWeatherFieldsActual(prev => { const n = new Set(prev); n.delete(field); return n; });
                                        setSelectedWeatherFieldsForecast(prev => { const n = new Set(prev); n.delete(field); return n; });
                                    } else {
                                        setSelectedWeatherFieldsActual(prev => new Set(prev).add(field));
                                        setSelectedWeatherFieldsForecast(prev => new Set(prev).add(field));
                                    }
                                } else if (showWeatherActual) {
                                    setSelectedWeatherFieldsActual(prev => {
                                        const n = new Set(prev);
                                        if (n.has(field)) n.delete(field); else n.add(field);
                                        return n;
                                    });
                                } else if (showWeatherForecast) {
                                    setSelectedWeatherFieldsForecast(prev => {
                                        const n = new Set(prev);
                                        if (n.has(field)) n.delete(field); else n.add(field);
                                        return n;
                                    });
                                }
                            };

                            if (hasActual && hasForecast) {
                                return (
                                    <LegendItem
                                        key={`weather-both-${field}`}
                                        color={color}
                                        label={`[${t('legend.bothPrefix')}·${freqStr}] ${label}`}
                                        type="split-line"
                                        onClick={handleToggle}
                                        clickable={true}
                                    />
                                );
                            }
                            if (hasActual) {
                                return (
                                    <LegendItem
                                        key={`weather-actual-${field}`}
                                        color={color}
                                        label={`[${t('legend.actualPrefix')}·${freqStr}] ${label}`}
                                        onClick={handleToggle}
                                        clickable={true}
                                    />
                                );
                            }
                            if (hasForecast) {
                                return (
                                    <LegendItem
                                        key={`weather-forecast-${field}`}
                                        color={color}
                                        label={`[${t('legend.forecastPrefix')}·${freqStr}] ${label}`}
                                        type="dashed"
                                        opacity={0.7}
                                        onClick={handleToggle}
                                        clickable={true}
                                    />
                                );
                            }
                            return null;
                        });
                    })()}
                </>
            )}
        </Box>
    );
};
