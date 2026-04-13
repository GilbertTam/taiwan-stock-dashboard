'use client';

import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { useTheme } from '@/app/ThemeProvider';
import { HjksOutage } from '@/types';
import { useTranslation } from 'react-i18next'; 
import { 
  parse, 
  startOfDay, 
  endOfDay, 
  differenceInMinutes, 
  addDays, 
  format, 
  isAfter, 
  isBefore,
  max,
  min,
  isWithinInterval
} from 'date-fns';

interface OutageGanttChartProps {
  outages: HjksOutage[];
  startDate: Date;
  endDate: Date;
}

// 擴充事件介面，加入 lane (泳道索引)
interface ProcessedOutage extends HjksOutage {
  displayStart: Date;
  displayEnd: Date;
  x: number;
  width: number;
  laneIndex: number; // 新增：決定這個事件要畫在第幾層
}

// 擴充群組介面，加入 totalLanes (總高度)
interface GroupedRow {
  key: string;
  stationName: string;
  unitName: string;
  events: ProcessedOutage[];
  totalLanes: number; // 新增：該機組總共需要幾層高
}

const OutageGanttChart: React.FC<OutageGanttChartProps> = ({ outages, startDate, endDate }) => {
  const { darkMode } = useTheme();
  const { t } = useTranslation('generationMix');

  // === 設定參數 ===
  const DAY_WIDTH = 240; 
  const HOURS_IN_DAY = 24;
  const PIXELS_PER_HOUR = DAY_WIDTH / HOURS_IN_DAY;
  const HEADER_HEIGHT = 60; 
  const ROW_HEIGHT = 40; // 每一條 Bar 的高度空間 (包含間距)
  const BAR_HEIGHT = 24; // Bar 本體的高度

  const TIME_MARKERS = [0, 3, 6, 9, 12, 15, 18, 21];

  // 計算甘特圖數據
  const ganttData = useMemo(() => {
    const days: Date[] = [];
    let loopDate = startOfDay(startDate);
    const endLoopDate = endOfDay(endDate);

    while (loopDate <= endLoopDate) {
      days.push(loopDate);
      loopDate = addDays(loopDate, 1);
    }

    const viewStartTime = startOfDay(startDate);
    const viewEndTime = endOfDay(endDate);
    const totalWidth = days.length * DAY_WIDTH;

    // 1. 基本座標計算
    const validOutages = outages.map(outage => {
      try {
        const outageStart = parse(outage.start_datetime, 'yyyy-MM-dd HH:mm:ss', new Date());
        const outageEnd = parse(outage.end_datetime, 'yyyy-MM-dd HH:mm:ss', new Date());

        if (isAfter(outageStart, viewEndTime) || isBefore(outageEnd, viewStartTime)) return null;

        const displayStart = max([outageStart, viewStartTime]);
        const displayEnd = min([outageEnd, viewEndTime]);
        const startDiffMinutes = differenceInMinutes(displayStart, viewStartTime);
        const durationMinutes = differenceInMinutes(displayEnd, displayStart);

        const x = (startDiffMinutes / 60) * PIXELS_PER_HOUR;
        const width = (durationMinutes / 60) * PIXELS_PER_HOUR;

        return {
          ...outage,
          displayStart,
          displayEnd,
          x,
          width: Math.max(width, 4),
          laneIndex: 0, // 初始值
        } as ProcessedOutage;
      } catch (e) {
        return null;
      }
    }).filter((item): item is ProcessedOutage => item !== null);

    // 2. 分組並計算堆疊 (Packing Algorithm)
    const groups: Record<string, GroupedRow> = {};
    
    // 先建立群組容器
    validOutages.forEach(event => {
      const uniqueKey = `${event.company || 'UNK'}_${event.name}_${event.unit_name}`;
      if (!groups[uniqueKey]) {
        groups[uniqueKey] = {
          key: uniqueKey,
          stationName: event.name,
          unitName: event.unit_name,
          events: [],
          totalLanes: 1
        };
      }
      groups[uniqueKey].events.push(event);
    });

    // 針對每個群組計算 Lane Index
    Object.values(groups).forEach(group => {
      // 1. 先依照顯示開始時間排序
      group.events.sort((a, b) => a.x - b.x);

      // 2. 紀錄每個泳道目前的「結束位置 (x + width)」
      const lanesEndTime: number[] = [];

      group.events.forEach(event => {
        let placed = false;
        // 嘗試將事件放入現有的泳道中
        for (let i = 0; i < lanesEndTime.length; i++) {
          // 如果這個泳道的結束時間 < 事件的開始時間，代表可以放入 (稍微加一點 buffer 防止緊貼)
          if (lanesEndTime[i] + 5 <= event.x) {
            event.laneIndex = i;
            lanesEndTime[i] = event.x + event.width;
            placed = true;
            break;
          }
        }

        // 如果所有泳道都滿了，開一條新的
        if (!placed) {
          event.laneIndex = lanesEndTime.length;
          lanesEndTime.push(event.x + event.width);
        }
      });

      // 更新該群組的總高度 (至少 1 層)
      group.totalLanes = Math.max(lanesEndTime.length, 1);
    });

    const groupedRows = Object.values(groups).sort((a, b) => {
      if (a.stationName !== b.stationName) return a.stationName.localeCompare(b.stationName);
      return a.unitName.localeCompare(b.unitName);
    });

    const today = new Date();
    const todayX = isWithinInterval(today, { start: viewStartTime, end: viewEndTime })
      ? (differenceInMinutes(startOfDay(today), viewStartTime) / 60) * PIXELS_PER_HOUR
      : null;

    return { days, groupedRows, totalWidth, todayX };
  }, [outages, startDate, endDate]);

  const colors = {
    background: darkMode ? '#141414' : '#ffffff',
    text: darkMode ? '#e0e0e0' : '#333333',
    textSecondary: darkMode ? '#888' : '#888',
    border: darkMode ? '#303030' : '#e0e0e0',
    gridStrong: darkMode ? '#444' : '#ccc',
    gridWeak: darkMode ? '#222' : '#f0f0f0',
    rowHover: darkMode ? '#1f1f1f' : '#fcfcfc',
    groupSeparator: darkMode ? '#444' : '#ddd', // 群組之間的分隔線較深
  };

  const getOutageColor = (type: string | undefined) => {
    const t = type || '';
    if (t.includes('緊急') || t.includes('事故')) return darkMode ? '#d9363e' : '#f5222d';
    if (t.includes('出力低下')) return darkMode ? '#722ed1' : '#9254de';
    if (t.includes('計画外停止')) return darkMode ? '#ff5500' : '#ff5500';
    if (t.includes('計画')) return darkMode ? '#177ddc' : '#1890ff';
    return darkMode ? '#faad14' : '#faad14';
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', border: `1px solid ${colors.border}`, bgcolor: colors.background, borderRadius: 1, overflow: 'hidden', fontFamily: 'Roboto, Helvetica, Arial, sans-serif' }}>
      <Box sx={{ overflowX: 'auto', position: 'relative' }}>
        <Box sx={{ minWidth: `${ganttData.totalWidth + 160}px`, position: 'relative' }}>
          
          {/* Header (保持不變) */}
          <Box sx={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: colors.background, borderBottom: `1px solid ${colors.border}`, height: `${HEADER_HEIGHT}px`, display: 'flex' }}>
            <Box sx={{ width: '160px', flexShrink: 0, position: 'sticky', left: 0, zIndex: 30, backgroundColor: colors.background, borderRight: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)' }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: colors.textSecondary }}>{t('outages.plantUnit')}</Typography>
            </Box>
            <Box sx={{ display: 'flex' }}>
              {ganttData.days.map((day) => (
                <Box key={format(day, 'yyyy-MM-dd')} sx={{ width: `${DAY_WIDTH}px`, borderRight: `1px solid ${colors.border}`, position: 'relative' }}>
                  <Box sx={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: darkMode ? '#1f1f1f' : '#f5f5f5', borderBottom: `1px solid ${colors.border}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: colors.text }}>{format(day, 'MM/dd')}</Typography>
                  </Box>
                  <Box sx={{ height: '36px', position: 'relative' }}>
                    {TIME_MARKERS.map((hour) => (
                      <Box key={hour} sx={{ position: 'absolute', left: `${hour * PIXELS_PER_HOUR}px`, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: hour % 6 === 0 ? `1px solid ${colors.border}` : 'none' }}>
                        <Box sx={{ width: '1px', height: '4px', bgcolor: colors.textSecondary, opacity: 0.5 }} />
                        <Typography sx={{ fontSize: '10px', color: hour === 12 ? colors.text : colors.textSecondary, fontWeight: hour === 12 ? 'bold' : 'normal', mt: 0.5, transform: 'translateX(-50%)', display: hour === 0 ? 'none' : 'block' }}>{hour}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Body */}
          <Box>
            {ganttData.groupedRows.map((group) => {
              // 動態計算此區塊的高度：層數 * 單層高度
              const groupHeight = group.totalLanes * ROW_HEIGHT;
              
              return (
                <Box 
                  key={group.key} 
                  sx={{ 
                    display: 'flex', 
                    height: `${groupHeight}px`, // 動態高度
                    borderBottom: `1px solid ${colors.groupSeparator}`, // 機組與機組間用深線隔開
                    '&:hover': { bgcolor: colors.rowHover } 
                  }}
                >
                  {/* 左側 Sticky Header - 高度自動撐滿 */}
                  <Box sx={{ 
                    width: '160px', 
                    flexShrink: 0, 
                    position: 'sticky', 
                    left: 0, 
                    zIndex: 10, 
                    backgroundColor: colors.background, 
                    borderRight: `1px solid ${colors.border}`, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center', // 內容垂直置中
                    px: 1.5, 
                    boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)' 
                  }}>
                    <Typography variant="body2" sx={{ fontWeight: '500', fontSize: '12px', color: colors.text }} noWrap title={group.stationName}>
                      {group.stationName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '10px', mt: 0.3 }}>
                      {group.unitName}
                    </Typography>
                  </Box>

                  {/* 右側甘特圖區域 */}
                  <Box sx={{ 
                    flex: 1, 
                    position: 'relative', 
                    height: '100%', 
                    backgroundImage: `
                      linear-gradient(90deg, ${colors.gridStrong} 1px, transparent 1px), 
                      linear-gradient(90deg, ${colors.gridWeak} 1px, transparent 1px)
                    `, 
                    backgroundSize: `${DAY_WIDTH}px 100%, ${DAY_WIDTH / 4}px 100%` 
                  }}>
                    {/* 今日垂直線 */}
                    {ganttData.todayX != null && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: `${ganttData.todayX}px`,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          bgcolor: darkMode ? 'rgba(24, 144, 255, 0.8)' : 'rgba(24, 144, 255, 0.6)',
                          zIndex: 4,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {/* 繪製每條分隔虛線 (如果有兩層以上) */}
                    {Array.from({ length: group.totalLanes - 1 }).map((_, idx) => (
                      <Box 
                        key={`line-${idx}`} 
                        sx={{ 
                          position: 'absolute', 
                          top: (idx + 1) * ROW_HEIGHT, 
                          left: 0, 
                          right: 0, 
                          borderTop: `1px dashed ${colors.border}`, 
                          opacity: 0.5 
                        }} 
                      />
                    ))}

                    {group.events.map((outage) => (
                      <Tooltip 
                        key={outage.id} 
                        arrow 
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{outage.stop_type}</Typography>
                            <Typography variant="caption" display="block">{t('outages.reason')}: {outage.factor || t('outages.noDetail')}</Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#ccc' }}>
                               {format(outage.displayStart, 'MM/dd HH:mm')} ~ {format(outage.displayEnd, 'MM/dd HH:mm')}
                            </Typography>
                          </Box>
                        }
                      >
                        <Box sx={{ 
                          position: 'absolute', 
                          left: `${outage.x}px`, 
                          width: `${outage.width}px`, 
                          top: `${outage.laneIndex * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2}px`, 
                          height: `${BAR_HEIGHT}px`, 
                          backgroundColor: getOutageColor(outage.stop_type), 
                          borderRadius: '6px', 
                          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'}`, 
                          cursor: 'pointer', 
                          zIndex: 5, 
                          transition: 'all 0.15s ease', 
                          boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          px: 1, 
                          overflow: 'hidden', 
                          '&:hover': { zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.25)', transform: 'translateY(-1px)' } 
                        }}>
                          <Typography variant="caption" sx={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {outage.stop_type}
                          </Typography>
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              );
            })}
            
            {ganttData.groupedRows.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center', color: colors.textSecondary, fontSize: '12px' }}>
                {t('outages.noDataInPeriod')}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default OutageGanttChart;