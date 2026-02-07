import React from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

interface ProfitSummaryTableProps {
    totalProfits: any;
    selectedModels: {
        id: string | number;
        name: string;
        color: string;
        calculatingDate: string;
    }[];
    modelColorMap: Record<string, string>;
    colors: any;
    darkMode: boolean;
}

export const ProfitSummaryTable: React.FC<ProfitSummaryTableProps> = ({
    totalProfits,
    selectedModels,
    modelColorMap,
    colors,
    darkMode
}) => {
    return (
        <Paper sx={{ p: 2, backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.9)', border: `1px solid ${colors.grid}` }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>Total Profit Summary</Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Total Profit</TableCell>
                        <TableCell align="right">% of Optimal</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow>
                        <TableCell sx={{ color: colors.actual, fontWeight: 'bold' }}>Optimal (Actual)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalProfits.cumulativeActual?.toFixed(0)}</TableCell>
                        <TableCell align="right">100%</TableCell>
                    </TableRow>
                    {selectedModels.map(model => {
                        const modelKey = `${model.id}|${model.name}`;
                        const profit = totalProfits[`${modelKey}_cumulative`];
                        const actual = totalProfits.cumulativeActual;
                        const percent = actual ? (profit / actual * 100).toFixed(1) : '-';
                        return (
                            <TableRow key={modelKey}>
                                <TableCell sx={{ color: modelColorMap[modelKey] }}>{model.name}</TableCell>
                                <TableCell align="right">{profit?.toFixed(0) ?? '-'}</TableCell>
                                <TableCell align="right">{percent}%</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </Paper>
    );
};
