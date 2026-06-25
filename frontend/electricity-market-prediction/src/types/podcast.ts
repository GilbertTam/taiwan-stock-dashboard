/**
 * @fileoverview 財經 Podcast / YouTube 內容型別。
 *
 * 對齊後端 app/schemas/podcast.py。資料由 backend/scripts/podcast_agent.py
 * 爬蟲寫入（YouTube RSS / 股癌逐字稿 → Claude 抽取）。
 */

export type Sentiment = '樂觀' | '悲觀' | '中立';

export interface SentimentCounts {
    bullish: number;
    bearish: number;
    neutral: number;
}

export interface Mention {
    target: string;
    target_type: string | null;   // "stock" / "sector"
    ticker: string | null;
    sentiment: Sentiment;
    reason: string | null;
}

export interface Segment {
    start: string | null;
    end: string | null;
    title: string | null;
    topic: string | null;
    content: string | null;
}

export interface TopMention {
    target: string;
    ticker: string | null;
    target_type: string | null;
    count: number;
    sentiment: SentimentCounts;
}

export interface ChannelSummary {
    channel: string;
    episode_count: number;
    latest_published: string | null;
    latest_title: string | null;
    sentiment: SentimentCounts;
    top_mentions: TopMention[];
}

export interface Episode {
    video_id: string;
    channel: string | null;
    title: string | null;
    published: string | null;
    url: string | null;
    status: string | null;
    summary: string | null;
    topics: string[];
    segments: Segment[];
    mentions: Mention[];
}

export interface ChannelListResponse {
    channels: ChannelSummary[];
}

export interface ChannelDetailResponse {
    channel: string;
    episode_count: number;
    sentiment: SentimentCounts;
    top_mentions: TopMention[];
    episodes: Episode[];
}

export interface TopMentionsResponse {
    days: number;
    mentions: TopMention[];
}
