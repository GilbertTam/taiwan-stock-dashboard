'use client';

import React, { useState } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Chip,
    TableSortLabel
} from '@mui/material';
import { GanttOperation } from '@/types/revenueAnalysis';
import { format } from 'date-fns';
import { useTheme } from '@/app/ThemeProvider';

interface OperationScheduleTableProps {
    data: GanttOperation[];
    title?: string;
    height?: number;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof GanttOperation | 'timeCode';

export const OperationScheduleTable: React.FC<OperationScheduleTableProps> = ({
    data,
    title = "Detailed Operation Schedule",
    height = 400
}) => {
    const { darkMode } = useTheme();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<OrderBy>('timeStep');

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Helper for action colors
    const getActionColor = (action: string) => {
        switch (action) {
            case 'Charge': return 'success';
            case 'Spot': return 'error';
            case 'Balance': return 'warning';
            default: return 'default';
        }
    };

    // Sorting logic
    const sortedData = React.useMemo(() => {
        return [...data].sort((a, b) => {
            let aValue: any = a[orderBy as keyof GanttOperation];
            let bValue: any = b[orderBy as keyof GanttOperation];

            // Special handling for timeCode derived from timeStep if needed
            if (orderBy === 'timeCode') {
                aValue = a.timeCode ?? (a.timeStep % 48) + 1;
                bValue = b.timeCode ?? (b.timeStep % 48) + 1;
            }

            if (bValue < aValue) {
                return order === 'asc' ? 1 : -1;
            }
            if (bValue > aValue) {
                return order === 'asc' ? -1 : 1;
            }
            return 0;
        });
    }, [data, order, orderBy]);

    const visibleRows = React.useMemo(
        () => sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [sortedData, page, rowsPerPage]
    );

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', border: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}>
                <Typography variant="h6">{title}</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: height }}>
                <Table stickyHeader aria-label="operation table" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TableSortLabel
                                    active={orderBy === 'datetime'}
                                    direction={orderBy === 'datetime' ? order : 'asc'}
                                    onClick={() => handleRequestSort('datetime')}
                                >
                                    Time
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'timeCode'}
                                    direction={orderBy === 'timeCode' ? order : 'asc'}
                                    onClick={() => handleRequestSort('timeCode')}
                                >
                                    Time Code
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                                <TableSortLabel
                                    active={orderBy === 'action'}
                                    direction={orderBy === 'action' ? order : 'asc'}
                                    onClick={() => handleRequestSort('action')}
                                >
                                    Action
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'price'}
                                    direction={orderBy === 'price' ? order : 'asc'}
                                    onClick={() => handleRequestSort('price')}
                                >
                                    Price (JPY)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'power'}
                                    direction={orderBy === 'power' ? order : 'asc'}
                                    onClick={() => handleRequestSort('power')}
                                >
                                    Power (MW)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'soc'}
                                    direction={orderBy === 'soc' ? order : 'asc'}
                                    onClick={() => handleRequestSort('soc')}
                                >
                                    SoC (%)
                                </TableSortLabel>
                            </TableCell>
                            <TableCell align="right">
                                <TableSortLabel
                                    active={orderBy === 'revenue'}
                                    direction={orderBy === 'revenue' ? order : 'asc'}
                                    onClick={() => handleRequestSort('revenue')}
                                >
                                    Revenue (JPY)
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visibleRows.map((row, index) => {
                            const timeCode = row.timeCode ?? (row.timeStep % 48) + 1;

                            return (
                                <TableRow hover role="checkbox" tabIndex={-1} key={`${row.datetime}-${index}`}>
                                    <TableCell component="th" scope="row">
                                        {(() => {
                                            if (!row.datetime) return '-';
                                            try {
                                                const d = new Date(row.datetime);
                                                if (isNaN(d.getTime())) return '-';
                                                return format(d, 'MM/dd HH:mm');
                                            } catch {
                                                return '-';
                                            }
                                        })()}
                                    </TableCell>
                                    <TableCell align="center">
                                        {timeCode}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={row.action}
                                            color={getActionColor(row.action) as any}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.price.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.power.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {(row.soc * 100).toFixed(1)}%
                                    </TableCell>
                                    <TableCell align="right">
                                        {row.revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? '-'}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 25, 48, 100]}
                component="div"
                count={data.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </Paper>
    );
};
