import React from 'react';
import { Box, Typography, Stepper, Step, StepLabel, StepContent } from '@mui/material';
import { Assessment, Settings, Storage, AutoMode } from '@mui/icons-material';
import { useTheme } from '@/app/ThemeProvider';
import { useTranslation } from 'react-i18next';

/**
 * Site revenue info panel (shown in the "説明" tab)
 */
interface RevenueEmptyStateProps {
    onRunSimulation?: () => void;
}

export const RevenueEmptyState: React.FC<RevenueEmptyStateProps> = ({ onRunSimulation: _onRunSimulation } = {}) => {
    const { darkMode } = useTheme();
    const { t } = useTranslation('siteRevenue');

    const steps = [
        {
            label: t('emptyState.step1Label'),
            description: t('emptyState.step1Desc'),
            icon: <Assessment />,
        },
        {
            label: t('emptyState.step2Label'),
            description: t('emptyState.step2Desc'),
            icon: <Storage />,
        },
        {
            label: t('emptyState.step3Label'),
            description: t('emptyState.step3Desc'),
            icon: <Settings />,
        },
        {
            label: t('emptyState.step4Label'),
            description: t('emptyState.step4Desc'),
            icon: <AutoMode />,
        },
    ];

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ maxWidth: 600, width: '100%' }}>
                <Typography variant="h5" fontWeight="600" gutterBottom align="center" sx={{ mb: 4, color: 'text.primary' }}>
                    {t('emptyState.title')}
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
                        {t('emptyState.instruction')}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};
