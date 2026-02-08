import { TimeSlot } from '@/types';

export const getMinMax = (values: number[]) => ({
    min: Math.min(...values),
    max: Math.max(...values)
});

export const getColumnStats = (
    selectedModels: { id: string | number; name: string }[],
    modelTimeSlotMAEs: Record<string, Record<TimeSlot, number>>
) => {
    const getValues = (slot: TimeSlot) => selectedModels.map(model =>
        modelTimeSlotMAEs[`${model.id}|${model.name}`][slot]
    );

    return {
        all: getMinMax(getValues(TimeSlot.ALL)),
        morning: getMinMax(getValues(TimeSlot.MORNING)),
        evening: getMinMax(getValues(TimeSlot.EVENING)),
        night: getMinMax(getValues(TimeSlot.NIGHT)),
    };
};

export const getCellStyle = (
    value: number,
    minMax: { min: number, max: number },
    colors: { text: string },
    darkMode: boolean
) => ({
    color: colors.text,
    backgroundColor: value === minMax.max
        ? (darkMode ? 'rgba(255, 77, 79, 0.2)' : 'rgba(255, 77, 79, 0.1)')
        : value === minMax.min
            ? (darkMode ? 'rgba(82, 196, 26, 0.2)' : 'rgba(82, 196, 26, 0.1)')
            : 'transparent',
    position: 'relative' as const,
    '&::after': value === minMax.max || value === minMax.min ? {
        content: '""',
        position: 'absolute',
        top: '50%',
        right: '8px',
        transform: 'translateY(-50%)',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: value === minMax.max
            ? (darkMode ? '#ff4d4f' : '#cf1322')
            : (darkMode ? '#52c41a' : '#389e0d')
    } : {}
});
