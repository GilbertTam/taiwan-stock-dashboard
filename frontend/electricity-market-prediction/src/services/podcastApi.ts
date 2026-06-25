/**
 * @fileoverview 財經 Podcast API service。
 *
 * 端點:
 *   GET /api/podcast/channels             — 頻道卡片 grid
 *   GET /api/podcast/channels/{channel}   — 單一頻道詳情(集數 + 段落 + 標的情緒)
 *   GET /api/podcast/mentions/top?days=    — 最近 N 天熱門標的
 */

import { createApiInstance } from './apiClient';
import type {
    ChannelDetailResponse,
    ChannelListResponse,
    TopMentionsResponse,
} from '@/types/podcast';

export const fetchChannels = async (): Promise<ChannelListResponse> => {
    const api = createApiInstance();
    const response = await api.get<ChannelListResponse>('/podcast/channels');
    return response.data;
};

export const fetchChannelDetail = async (
    channel: string,
): Promise<ChannelDetailResponse> => {
    const api = createApiInstance();
    const response = await api.get<ChannelDetailResponse>(
        `/podcast/channels/${encodeURIComponent(channel)}`,
    );
    return response.data;
};

export const fetchTopMentions = async (
    days = 30,
    channel?: string,
): Promise<TopMentionsResponse> => {
    const api = createApiInstance();
    const response = await api.get<TopMentionsResponse>('/podcast/mentions/top', {
        params: { days, ...(channel ? { channel } : {}) },
    });
    return response.data;
};
