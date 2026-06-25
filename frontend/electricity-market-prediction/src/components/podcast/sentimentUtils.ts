/**
 * 情緒色彩 / emoji 共用工具。集中於此，卡片與標籤共用同一套視覺語言。
 *   樂觀 → 綠（var(--primary)）  悲觀 → 紅（#FF6B6B）  中立 → 灰（var(--muted)）
 */
import type { Sentiment, SentimentCounts } from '@/types/podcast';

export const SENTIMENT_COLOR: Record<Sentiment, string> = {
    樂觀: 'var(--primary)',
    悲觀: '#FF6B6B',
    中立: 'var(--muted)',
};

export const SENTIMENT_EMOJI: Record<Sentiment, string> = {
    樂觀: '📈',
    悲觀: '📉',
    中立: '➖',
};

/** i18n key suffix（podcast namespace 下 sentiment.*）。 */
export const SENTIMENT_I18N: Record<Sentiment, string> = {
    樂觀: 'sentiment.bullish',
    悲觀: 'sentiment.bearish',
    中立: 'sentiment.neutral',
};

/** 從計數推出主導情緒（並列時偏向「看好/看壞」勝過中立）。 */
export function dominantSentiment(c: SentimentCounts): Sentiment {
    if (c.bullish === 0 && c.bearish === 0 && c.neutral === 0) return '中立';
    if (c.bullish >= c.bearish && c.bullish >= c.neutral) return '樂觀';
    if (c.bearish >= c.bullish && c.bearish >= c.neutral) return '悲觀';
    return '中立';
}

export function totalCount(c: SentimentCounts): number {
    return c.bullish + c.bearish + c.neutral;
}
