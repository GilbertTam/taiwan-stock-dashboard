
import React from 'react';
import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Radio,
    Typography,
    Collapse,
    Paper,
    Box,
    SelectChangeEvent
} from '@mui/material';
import { Area } from '@/types';
import { SectionHeader } from './shared';

interface AreaSelectorProps {
    areas: Area[];
    selectedArea: string;
    onAreaChange: (event: SelectChangeEvent) => void;
    expanded: boolean;
    onToggle: () => void;
    step?: number;
    description?: string;
}

export const AreaSelector: React.FC<AreaSelectorProps> = ({
    areas,
    selectedArea,
    onAreaChange,
    expanded,
    onToggle,
    step = 1,
    description = '選擇要分析的地區',
}) => {
    return (
        <Paper
            elevation={0}
            sx={{
                borderBottom: '1px solid var(--card-border)',
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
                選擇地區
            </SectionHeader>
            <Collapse in={expanded}>
                <List dense sx={{ p: 1 }}>
                    {areas.map((area) => {
                        const isSelected = selectedArea === area.name;
                        return (
                            <ListItem
                                key={area.id}
                                disablePadding
                                onClick={() => {
                                    onAreaChange({ target: { value: area.name } } as any);
                                    onToggle(); // Auto close on select
                                }}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                                    color: isSelected ? 'var(--primary)' : 'inherit',
                                    '&:hover': {
                                        backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--hover-bg)',
                                    },
                                }}
                            >
                                <ListItemButton sx={{ py: 0.5, px: 1, borderRadius: 1 }}>
                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                        <Radio
                                            checked={isSelected}
                                            size="small"
                                            sx={{
                                                p: 0.5,
                                                color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                                '&.Mui-checked': { color: 'var(--primary)' },
                                            }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={area.name_ch}
                                        secondary={area.name}
                                        primaryTypographyProps={{
                                            fontSize: '0.85rem',
                                            fontWeight: isSelected ? 600 : 400
                                        }}
                                        secondaryTypographyProps={{
                                            fontSize: '0.7rem',
                                            color: isSelected ? 'color-mix(in srgb, var(--primary), transparent 30%)' : 'text.secondary'
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Collapse>
            {/* 收合時顯示當前選擇 */}
            {!expanded && selectedArea && (
                <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderLeft: '3px solid var(--primary)', ml: 0.5, bgcolor: 'var(--hover-bg)' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>目前選擇：</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {areas.find(a => a.name === selectedArea)?.name_ch || selectedArea}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};
