'use client';

import React, { useMemo } from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';
import { HjksOutage } from '@/types';

interface OutageTableProps {
  outages: HjksOutage[];
}

interface GroupedOutage {
  key: string;
  company: string;
  name: string;
  unit_name: string;
  max_capacity: number | null;
  events: HjksOutage[];
}

const OutageTable: React.FC<OutageTableProps> = ({ outages }) => {
  const { darkMode } = useTheme();

  // 資料分組邏輯
  const groupedOutages = useMemo(() => {
    const groups: Record<string, GroupedOutage> = {};
    const sortedData = [...outages].sort((a, b) => {
      const compareStation = (a.name || '').localeCompare(b.name || '');
      if (compareStation !== 0) return compareStation;
      const compareUnit = (a.unit_name || '').localeCompare(b.unit_name || '');
      if (compareUnit !== 0) return compareUnit;
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
    });

    sortedData.forEach((outage) => {
      const uniqueKey = `${outage.company}_${outage.name}_${outage.unit_name}`;
      if (!groups[uniqueKey]) {
        groups[uniqueKey] = {
          key: uniqueKey,
          company: outage.company,
          name: outage.name,
          unit_name: outage.unit_name,
          max_capacity: outage.max_capacity,
          events: []
        };
      }
      groups[uniqueKey].events.push(outage);
    });

    return Object.values(groups);
  }, [outages]);

  // 樣式
  const cellStyle = {
    color: darkMode ? '#d9d9d9' : '#000000',
    borderRight: darkMode ? '1px solid #303030' : '1px solid #e0e0e0',
  };

  const groupCellStyle = {
    ...cellStyle,
    verticalAlign: 'top',
    backgroundColor: darkMode ? '#252525' : '#fafafa',
    fontWeight: 500
  };

  const headerStyle = { fontWeight: 'bold', color: darkMode ? '#d9d9d9' : '#000000' };

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ backgroundColor: darkMode ? '#1a1a1a' : '#ffffff', mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headerStyle, width: '10%' }}>公司</TableCell>
            <TableCell sx={{ ...headerStyle, width: '15%' }}>發電廠名稱</TableCell>
            <TableCell sx={{ ...headerStyle, width: '10%' }}>機組名稱</TableCell>
            <TableCell sx={{ ...headerStyle, width: '10%' }}>最大容量 (kW)</TableCell>
            <TableCell sx={headerStyle}>開始時間</TableCell>
            <TableCell sx={headerStyle}>結束時間</TableCell>
            <TableCell sx={headerStyle}>停機類型</TableCell>
            <TableCell sx={headerStyle}>原因</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groupedOutages.map((group) => (
            <React.Fragment key={group.key}>
              {group.events.map((outage, index) => (
                <TableRow key={outage.id} hover>
                  {index === 0 && (
                    <>
                      <TableCell rowSpan={group.events.length} sx={groupCellStyle}>{group.company}</TableCell>
                      <TableCell rowSpan={group.events.length} sx={groupCellStyle}>{group.name}</TableCell>
                      <TableCell rowSpan={group.events.length} sx={groupCellStyle}>{group.unit_name}</TableCell>
                      <TableCell rowSpan={group.events.length} sx={groupCellStyle}>
                        {group.max_capacity ? group.max_capacity.toLocaleString() : '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell sx={cellStyle}>
                    {outage.start_datetime ? format(parseISO(outage.start_datetime), 'yyyy-MM-dd HH:mm') : '-'}
                  </TableCell>
                  <TableCell sx={cellStyle}>
                    {outage.end_datetime ? format(parseISO(outage.end_datetime), 'yyyy-MM-dd HH:mm') : '-'}
                  </TableCell>
                  <TableCell sx={cellStyle}>{outage.stop_type || '-'}</TableCell>
                  <TableCell sx={cellStyle}>{outage.factor || '-'}</TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
          {groupedOutages.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#888' }}>無資料</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OutageTable; 