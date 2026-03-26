'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Alert,
  CircularProgress,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { format, parseISO } from 'date-fns';
import { fetchOcctoEvents } from '@/services/api';
import type { OcctoEvent } from '@/types';

interface OcctoEventsPanelProps {
  startDate: Date | null;
  endDate: Date | null;
}

/** 依 value 判斷嚴重性 */
function getSeverity(value: number): 'error' | 'warning' | 'info' {
  if (value >= 3) return 'error';
  if (value >= 1) return 'warning';
  return 'info';
}

const SEVERITY_COLORS = {
  error:   { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  info:    { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.35)', text: '#3b82f6' },
};

const SEVERITY_ICONS = {
  error:   <ErrorOutlineIcon sx={{ fontSize: 15 }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 15 }} />,
  info:    <InfoOutlinedIcon sx={{ fontSize: 15 }} />,
};

export default function OcctoEventsPanel({ startDate, endDate }: OcctoEventsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<OcctoEvent[]>([]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const start = format(startDate, 'yyyyMMdd');
    const end   = format(endDate,   'yyyyMMdd');

    setLoading(true);
    fetchOcctoEvents({ start_date: start, end_date: end })
      .then((data) => setEvents(data))
      .catch((err) => { console.error('Failed to fetch OCCTO events:', err); setEvents([]); })
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  if (!startDate || !endDate) {
    return <Alert severity="info">請選擇日期範圍</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!events.length) {
    return (
      <Alert severity="info" sx={{ borderRadius: 1.5 }}>
        該時段無系統事件資料 (No grid events for this period)
      </Alert>
    );
  }

  // 依日期分組
  const grouped: Record<string, OcctoEvent[]> = {};
  for (const ev of events) {
    const day = ev.datetime.slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  }
  const sortedDays = Object.keys(grouped).sort().reverse();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          OCCTO 系統事件
        </Typography>
        <Chip size="small" label={`${events.length} 件`} sx={{ height: 18, fontSize: 11 }} />
      </Box>

      {sortedDays.map((day) => (
        <Box key={day} sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 700,
              color: 'text.secondary',
              fontFamily: 'monospace',
              mb: 0.5,
              letterSpacing: 0.5,
            }}
          >
            {day}
          </Typography>
          <List dense disablePadding>
            {grouped[day].map((ev, idx) => {
              const sev = getSeverity(ev.value);
              const col = SEVERITY_COLORS[sev];
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />}
                  <ListItem
                    disablePadding
                    sx={{
                      px: 1.25,
                      py: 0.75,
                      borderRadius: 1,
                      backgroundColor: col.bg,
                      border: `1px solid ${col.border}`,
                      mb: idx < grouped[day].length - 1 ? 0.5 : 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
                      <Box sx={{ color: col.text, mt: 0.25, flexShrink: 0 }}>
                        {SEVERITY_ICONS[sev]}
                      </Box>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
                              {ev.description || '（無描述）'}
                            </Typography>
                            {ev.area && (
                              <Chip
                                size="small"
                                label={ev.area}
                                sx={{ height: 16, fontSize: 10, color: 'text.secondary' }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace' }}>
                              {ev.datetime.length >= 16 ? ev.datetime.slice(11, 16) : ev.datetime}
                            </Typography>
                            {ev.value !== 0 && (
                              <Typography sx={{ fontSize: 10, color: col.text }}>
                                value: {ev.value}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
}
