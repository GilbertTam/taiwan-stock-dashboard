'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CircularProgress } from '@mui/material';
import { DataStatusRawView } from '@/components/data-status/DataStatusRawView';
import { useTranslation } from 'react-i18next';

function RecordsContent() {
    const { t } = useTranslation('dataStatus');
    const router       = useRouter();
    const searchParams = useSearchParams();

    const sourceKey = searchParams.get('source_key') ?? '';
    const area      = searchParams.get('area') ?? '';
    const date      = searchParams.get('date') ?? '';
    const slotParam = searchParams.get('slot');
    const slot      = slotParam !== null && slotParam !== '' ? parseInt(slotParam, 10) : undefined;

    if (!sourceKey || !area || !date) {
        return (
            <div style={{ padding: 24 }}>
                {t('invalidUrlError')}
            </div>
        );
    }

    return (
        <DataStatusRawView
            sourceKey={sourceKey}
            area={area}
            date={date}
            slot={slot}
            onClose={() => router.back()}
        />
    );
}

export default function DataStatusRecordsPage() {
    return (
        <Suspense fallback={<CircularProgress sx={{ m: 4 }} />}>
            <RecordsContent />
        </Suspense>
    );
}
