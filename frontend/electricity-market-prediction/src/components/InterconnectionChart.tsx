import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';

import { useTheme } from '@/app/ThemeProvider';
import { useChartColors } from '@/utils/chartColors';
import BaseChart from '@/components/charts/BaseChart';

interface InterconnectionFlow {
  datetime: string;
  interconnection_name: string;
  forward_planned_flow: number;
  reverse_planned_flow: number;
  forward_available_capacity: number;
  reverse_available_capacity: number;
  forward_margin: number;
  reverse_margin: number;
}

interface InterconnectionChartProps {
  data: InterconnectionFlow[];
}

// 簡單的降採樣函數：當數據量過大時，每 N 筆取一筆，避免圖表崩潰
const downsampleData = (data: any[], threshold = 300) => {
  if (data.length <= threshold) return data;

  const samplingRate = Math.ceil(data.length / threshold);
  return data.filter((_, index) => index % samplingRate === 0);
};

const InterconnectionChart: React.FC<InterconnectionChartProps> = ({ data }) => {
  const { darkMode } = useTheme();
  const colors = useChartColors();

  // 使用 useMemo 處理數據轉換與降採樣
  const processedData = useMemo(() => {
    // 1. 先轉換數據格式
    const mapped = data.map(item => ({
      ...item,
      // 容量：作為背景邊界
      display_forward_capacity: -Math.abs(item.forward_available_capacity),
      display_reverse_capacity: Math.abs(item.reverse_available_capacity),

      // 流量：確保方向正確
      display_forward_flow: -Math.abs(item.forward_planned_flow || 0),
      display_reverse_flow: Math.abs(item.reverse_planned_flow || 0),

      // 差異 (淨流量)：流進 - 流出
      net_flow: (item.reverse_planned_flow || 0) - (item.forward_planned_flow || 0)
    }));

    // 2. 如果數據量太大，進行降採樣 (只用於圖表顯示，Tooltip 仍可設法顯示詳細，但這裡為了效能同步簡化)
    return downsampleData(mapped, 500); // 限制最大顯示點數為 500
  }, [data]);

  const option = useMemo<EChartsOption>(() => {
    if (!processedData || processedData.length === 0) return {};

    const times = processedData.map((d: any) => new Date(d.datetime).getTime());
    const dataMinTime = times[0];
    const dataMaxTime = times[times.length - 1];

    const tooltipFormatter = (params: any) => {
      const list = Array.isArray(params) ? params : [params];
      const ts = list?.[0]?.value?.[0];
      const dataIndex = list?.[0]?.dataIndex ?? 0;
      const d = processedData[dataIndex] as any;
      const header = ts ? format(new Date(ts), 'MM/dd HH:mm') : '';

      if (!d) return '';

      const netFlow = Number(d.net_flow ?? 0);
      const netColor = netFlow >= 0 ? colors.rainActual : colors.imbalance;
      const netText =
        netFlow > 0 ? `Reverse +${netFlow.toFixed(1)}` : `Forward ${netFlow.toFixed(1)}`;

      const reverseFlow = Math.abs(Number(d.reverse_planned_flow ?? 0));
      const forwardFlow = Math.abs(Number(d.forward_planned_flow ?? 0));

      return `
        <div style="
          padding:12px;
          border:1px solid ${colors.tooltipBorder};
          background:${colors.tooltipBg};
          color:${colors.text};
          box-shadow:0 4px 10px rgba(0,0,0,0.5);
          min-width:240px;
          font-size:12px;
          pointer-events:none;
        ">
          <div style="font-weight:800;margin-bottom:8px;">${header}</div>

          <div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid ${darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'};">
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <span>淨流量 (Net Flow):</span>
              <span style="font-weight:800;color:${netColor};">${netText} MW</span>
            </div>
          </div>

          <div style="margin-bottom:8px;">
            <div style="font-weight:800;color:${colors.rainActual};margin-bottom:4px;">Reverse (流進)</div>
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <span style="color:${darkMode ? '#ccc' : '#666'};">流量:</span>
              <span style="font-weight:700;">${reverseFlow.toFixed(0)} MW</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <span style="color:${darkMode ? '#aaa' : '#777'};">容量:</span>
              <span style="color:${colors.subText};">${Number(d.reverse_available_capacity ?? 0).toFixed(0)} MW</span>
            </div>
          </div>

          <div>
            <div style="font-weight:800;color:${colors.imbalance};margin-bottom:4px;">Forward (流出)</div>
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <span style="color:${darkMode ? '#ccc' : '#666'};">流量:</span>
              <span style="font-weight:700;">${forwardFlow.toFixed(0)} MW</span>
            </div>
            <div style="display:flex;justify-content:space-between;gap:16px;">
              <span style="color:${darkMode ? '#aaa' : '#777'};">容量:</span>
              <span style="color:${colors.subText};">${Number(d.forward_available_capacity ?? 0).toFixed(0)} MW</span>
            </div>
          </div>
        </div>
      `;
    };

    return {
      grid: { left: 50, right: 30, top: 20, bottom: 55, containLabel: true },
      legend: {
        bottom: 0,
        height: 36,
        textStyle: { color: colors.text, fontSize: 12 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'transparent',
        borderWidth: 0,
        extraCssText: 'pointer-events:none;',
        formatter: tooltipFormatter as any,
      },
      xAxis: {
        type: 'time',
        min: dataMinTime,
        max: dataMaxTime,
        axisLabel: { color: colors.text, fontSize: 11, hideOverlap: true },
        axisLine: { lineStyle: { color: colors.grid } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.text, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
      },
      series: [
        {
          name: 'Reverse 容量',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { color: colors.rainActual, width: 2, type: 'dashed', opacity: 0.8 },
          data: processedData.map((d: any) => [new Date(d.datetime).getTime(), d.display_reverse_capacity]),
        },
        {
          name: 'Forward 容量',
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { color: colors.imbalance, width: 2, type: 'dashed', opacity: 0.8 },
          data: processedData.map((d: any) => [new Date(d.datetime).getTime(), d.display_forward_capacity]),
        },
        {
          name: 'Reverse 流進',
          type: 'line',
          showSymbol: false,
          step: 'end',
          lineStyle: { color: colors.rainActual, width: 2 },
          areaStyle: { color: colors.rainActual, opacity: 0.25 },
          data: processedData.map((d: any) => [new Date(d.datetime).getTime(), d.display_reverse_flow]),
        },
        {
          name: 'Forward 流出',
          type: 'line',
          showSymbol: false,
          step: 'end',
          lineStyle: { color: colors.imbalance, width: 2 },
          areaStyle: { color: colors.imbalance, opacity: 0.25 },
          data: processedData.map((d: any) => [new Date(d.datetime).getTime(), d.display_forward_flow]),
        },
        {
          name: 'Zero',
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: darkMode ? '#666' : '#999', width: 1 },
            data: [{ yAxis: 0 }],
          },
        } as any,
      ],
      animation: false,
    };
  }, [processedData, colors, darkMode]);

  return (
    <Box sx={{ width: '100%', height: 350, mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        連系線流量與容量分析
      </Typography>
      <BaseChart option={option} height="100%" />
    </Box>
  );
};

export default InterconnectionChart;