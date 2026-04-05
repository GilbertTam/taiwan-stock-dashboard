import React from 'react';
import { Box, Typography, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { Assessment, Settings, Storage, AutoMode } from '@mui/icons-material';
import { useTheme } from '@/app/ThemeProvider';

/**
 * 案場收益說明面板 | Site revenue info panel (shown in the "說明" tab)
 */
interface RevenueEmptyStateProps {
    onRunSimulation?: () => void;
}

export const RevenueEmptyState: React.FC<RevenueEmptyStateProps> = ({ onRunSimulation: _onRunSimulation } = {}) => {
    const { darkMode } = useTheme();

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
            label: '系統自動計算 (Auto Simulation)',
            description: '資料載入完成後，系統自動計算最適排程與收益，無需手動執行。',
            icon: <AutoMode />,
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center' }}>
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
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', fontStyle: 'italic' }}>
                        請在左側選擇區域與模型，資料載入後將自動開始計算。
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
