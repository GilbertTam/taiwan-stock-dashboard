import React from 'react';
import { Box, Typography, Button, Paper, useTheme as useMuiTheme, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { PlayArrow, Assessment, Settings, Storage } from '@mui/icons-material';
import { useTheme } from '@/app/ThemeProvider';

/** 
 * 案場收益空白狀態 | Site revenue empty state 
 */
interface RevenueEmptyStateProps {
    onRunSimulation: () => void;
}

export const RevenueEmptyState: React.FC<RevenueEmptyStateProps> = ({ onRunSimulation }) => {
    const { darkMode } = useTheme();
    const muiTheme = useMuiTheme();

    const steps = [
        {
            label: '選擇區域與日期 (Select Region & Date)',
            description: '在側邊欄選擇您要分析的日本電力區域與時間範圍。',
            icon: <Assessment />,
        },
        {
            label: '選擇預測模型 (Select Prediction Model)',
            description: '選擇一個或多個 AI 預測模型進行收益比較。',
            icon: <Storage />,
        },
        {
            label: '設定儲能參數 (Set Storage Parameters)',
            description: '設定電池容量、最大充放電功率與效率等系統參數。',
            icon: <Settings />,
        },
        {
            label: '點擊「執行模擬」 (Click Run Simulation)',
            description: '依據上述設定，計算最適排程與預估收益。',
            icon: <PlayArrow />,
        },
    ];

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 4, md: 8 },
                flex: 1,
                backgroundColor: darkMode ? 'rgba(0,0,0,0.2)' : 'white',
                border: '1px solid',
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
            }}
        >
            <Box sx={{ maxWidth: 600, width: '100%' }}>
                <Typography variant="h5" fontWeight="600" gutterBottom align="center" sx={{ mb: 4, color: 'text.primary' }}>
                    案場收益模擬分析
                </Typography>

                <Stepper orientation="vertical" sx={{ mb: 6 }}>
                    {steps.map((step, index) => (
                        <Step key={step.label} active={true}>
                            <StepLabel
                                StepIconComponent={() => (
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: darkMode ? 'primary.dark' : 'primary.light',
                                            color: darkMode ? 'primary.light' : 'primary.main',
                                        }}
                                    >
                                        {step.icon}
                                    </Box>
                                )}
                            >
                                <Typography variant="subtitle1" fontWeight="500">
                                    {step.label}
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {step.description}
                                </Typography>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<PlayArrow />}
                        onClick={onRunSimulation}
                        sx={{
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: '1rem',
                            fontWeight: 600,
                        }}
                    >
                        開始執行模擬 (Start Simulation)
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
};
