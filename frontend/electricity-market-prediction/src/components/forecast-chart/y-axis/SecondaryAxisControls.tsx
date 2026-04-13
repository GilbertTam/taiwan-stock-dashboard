import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, Typography, Stack, Alert } from '@mui/material';
import { YAxisRange, ValidationResult } from './types';
import { AxisRangeValidator } from './AxisRangeValidator';
import { useTranslation } from 'react-i18next';

interface SecondaryAxisControlsProps {
    currentRange: YAxisRange | null;
    onRangeChange: (range: YAxisRange) => Promise<void>;
    onReset: () => void;
}

export const SecondaryAxisControls: React.FC<SecondaryAxisControlsProps> = ({
    currentRange,
    onRangeChange,
    onReset,
}) => {
    const { t } = useTranslation('forecast');
    const [minInput, setMinInput] = useState<string>('');
    const [maxInput, setMaxInput] = useState<string>('');
    const [validation, setValidation] = useState<ValidationResult | null>(null);

    const [isUpdating, setIsUpdating] = useState(false);
    const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const validator = new AxisRangeValidator();

    // Update inputs if currentRange changes externally (and we are not actively typing/updating)
    useEffect(() => {
        if (currentRange && !isUpdating) {
            setMinInput(currentRange.min.toString() || '');
            setMaxInput(currentRange.max.toString() || '');
        }
    }, [currentRange, isUpdating]);

    const validateInputs = useCallback((min: string, max: string) => {
        if (!min && !max) {
            setValidation(null);
            return false;
        }
        const result = validator.validate(min, max);
        setValidation(result);
        return result.isValid;
    }, []);

    const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setMinInput(val);
        validateInputs(val, maxInput);
        setFeedback(null);
        setErrorMsg(null);
    };

    const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setMaxInput(val);
        validateInputs(minInput, val);
        setFeedback(null);
        setErrorMsg(null);
    };

    const handleApply = async () => {
        const isValid = validateInputs(minInput, maxInput);
        if (!isValid) return;

        setIsUpdating(true);
        setFeedback(null);
        setErrorMsg(null);

        try {
            await onRangeChange({
                min: parseFloat(minInput),
                max: parseFloat(maxInput),
            });
            setFeedback('success');
            setTimeout(() => setFeedback(null), 2000);
        } catch (err) {
            setFeedback('error');
            setErrorMsg(err instanceof Error ? err.message : t('axisControl.updateFailed'));

            // Revert to current range if available
            if (currentRange) {
                setMinInput(currentRange.min.toString());
                setMaxInput(currentRange.max.toString());
                setValidation(null);
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReset = () => {
        setFeedback(null);
        setErrorMsg(null);
        setValidation(null);
        onReset();
    };

    // Determine field errors based on i18n key contents
    const isMinError = validation?.errors.some(e => e.includes('min') || e.includes('Min'));
    const isMaxError = validation?.errors.some(e => e.includes('max') || e.includes('Max'));
    const isFormatError = validation?.errors.some(e => e.includes('Invalid') || e.includes('Format'));

    return (
        <Box
            data-feedback={feedback || 'none'}
            sx={{
                p: 2,
                border: '1px solid',
                borderColor: feedback === 'success' ? 'success.main' : 'divider',
                transition: 'border-color 0.2s',
                borderRadius: 1
            }}
        >
            <Typography variant="subtitle2" gutterBottom>
                {t('axisControl.title')}
            </Typography>

            <Stack spacing={2} direction="column">
                <Stack spacing={2} direction="row">
                    <TextField
                        label={t('axisControl.min')}
                        size="small"
                        value={minInput}
                        onChange={handleMinChange}
                        error={isMinError || isFormatError}
                        disabled={isUpdating}
                        fullWidth
                        inputProps={{ 'data-testid': 'min-input' }}
                    />
                    <TextField
                        label={t('axisControl.max')}
                        size="small"
                        value={maxInput}
                        onChange={handleMaxChange}
                        error={isMaxError || isFormatError}
                        disabled={isUpdating}
                        fullWidth
                        inputProps={{ 'data-testid': 'max-input' }}
                    />
                </Stack>

                {validation && !validation.isValid && validation.errors.length > 0 && (
                    <Alert severity="error" icon={false} sx={{ py: 0 }}>
                        {validation.errors.map((key, i) => React.createElement('div', { key: i }, t(key)))}
                    </Alert>
                )}

                {validation && validation.isValid && validation.warnings.length > 0 && (
                    <Alert severity="warning" icon={false} sx={{ py: 0 }}>
                        {validation.warnings.map((key, i) => React.createElement('div', { key: i }, t(key)))}
                    </Alert>
                )}

                {feedback === 'error' && errorMsg && (
                    <Alert severity="error" sx={{ py: 0 }}>{errorMsg}</Alert>
                )}

                <Stack spacing={1} direction="row" justifyContent="flex-end">
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleReset}
                        disabled={isUpdating}
                    >
                        {t('axisControl.reset')}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleApply}
                        disabled={isUpdating || (validation !== null && !validation.isValid)}
                        data-testid="apply-button"
                    >
                        {t('axisControl.apply')}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};
