import React, { useMemo } from 'react';
import {
  ComposedChart,
  Area, // 改用 Area
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Box, Paper, Typography, useTheme as useMuiTheme } from '@mui/material';
import { format, parseISO } from 'date-fns';

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
  const muiTheme = useMuiTheme();
  const isDarkMode = muiTheme.palette.mode === 'dark';

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Paper sx={{ p: 1.5, backgroundColor: 'rgba(20, 20, 20, 0.95)', border: '1px solid #555', fontSize: '12px' }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1, fontWeight: 'bold' }}>
            {format(parseISO(d.datetime), 'MM/dd HH:mm')}
          </Typography>
          
          {/* 淨流量差異展示 */}
          <Box sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid #444' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#fff' }}>淨流量 (Net Flow):</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: d.net_flow >= 0 ? '#82ca9d' : '#8884d8' }}>
                   {d.net_flow > 0 ? `Reverse +${d.net_flow.toFixed(1)}` : `Forward ${d.net_flow.toFixed(1)}`} MW
                </Typography>
             </Box>
          </Box>
          
          {/* Reverse 區塊 */}
          <Box sx={{ mb: 1 }}>
             <Typography variant="caption" sx={{ color: '#82ca9d', fontWeight: 'bold' }}>Reverse (流進)</Typography>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
               <span style={{ color: '#ccc' }}>流量:</span>
               <span style={{ color: '#fff' }}>{Math.abs(d.reverse_planned_flow)} MW</span>
             </Box>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
               <span style={{ color: '#888' }}>容量:</span>
               <span style={{ color: '#aaa' }}>{d.reverse_available_capacity} MW</span>
             </Box>
          </Box>

          {/* Forward 區塊 */}
          <Box>
             <Typography variant="caption" sx={{ color: '#8884d8', fontWeight: 'bold' }}>Forward (流出)</Typography>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
               <span style={{ color: '#ccc' }}>流量:</span>
               <span style={{ color: '#fff' }}>{Math.abs(d.forward_planned_flow)} MW</span>
             </Box>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
               <span style={{ color: '#888' }}>容量:</span>
               <span style={{ color: '#aaa' }}>{d.forward_available_capacity} MW</span>
             </Box>
          </Box>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 350, mt: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="bold">
        連系線流量與容量分析
      </Typography>
      
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={processedData}
          // [修正 1] 增加 bottom margin，給 Legend 留位子
          margin={{ top: 10, right: 30, left: 0, bottom: 40 }} 
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} vertical={false} />
          <XAxis 
            dataKey="datetime" 
            tickFormatter={(t) => format(parseISO(t), 'MM/dd HH:mm')}
            tick={{ fontSize: 11, fill: isDarkMode ? '#aaa' : '#666' }}
            minTickGap={50}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: isDarkMode ? '#aaa' : '#666' }}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* [修正 2] 明確定義 Legend 高度與位置 */}
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            wrapperStyle={{ bottom: 0, fontSize: '12px' }} 
          />
          
          <ReferenceLine y={0} stroke={isDarkMode ? '#666' : '#999'} />

          {/* [建議優化] 容量線改用 monotone，避免 step 造成的雜訊感 */}
          <Line
            type="monotone" // 改成 monotone 線條會比較乾淨
            dataKey="display_reverse_capacity"
            stroke="#82ca9d"
            strokeDasharray="3 3"
            strokeOpacity={0.8} // 稍微提高不透明度
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            name="Reverse 容量"
          />
          
          <Line
            type="monotone" // 改成 monotone
            dataKey="display_forward_capacity"
            stroke="#8884d8"
            strokeDasharray="3 3"
            strokeOpacity={0.8}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
            name="Forward 容量"
          />

          <Area 
            type="step" 
            dataKey="display_reverse_flow" 
            fill="#82ca9d" 
            stroke="#82ca9d"
            fillOpacity={0.6}
            isAnimationActive={false}
            name="Reverse 流進" 
          />
          <Area 
            type="step" 
            dataKey="display_forward_flow" 
            fill="#8884d8" 
            stroke="#8884d8"
            fillOpacity={0.6}
            isAnimationActive={false}
            name="Forward 流出" 
          />

        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default InterconnectionChart;