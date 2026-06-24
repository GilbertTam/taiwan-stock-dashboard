"""分點來源 crawlers。

兩個來源:
  - bsr_twse:  TWSE BSR 抓「上市股」分點 (requests + ddddocr 驗證碼)
  - bsr_tpex:  TPEX 分點頁抓「上櫃股」分點 (Camoufox 過 Cloudflare 下載 CSV)

對外接口一致:analyze_*_broker_full_ex(stock_id, max_retry) -> (payload, reason)
broker_service._crawl_one 依 stock.market 決定走哪一個。
"""

from app.services.broker_crawlers.bsr_twse import (
    BsrFailureReason,
    analyze_broker_full,
    analyze_broker_full_ex,
)
from app.services.broker_crawlers.bsr_tpex import (
    analyze_tpex_broker_full_ex,
    shutdown_session as shutdown_tpex_session,
)

__all__ = [
    "analyze_broker_full",
    "analyze_broker_full_ex",
    "analyze_tpex_broker_full_ex",
    "BsrFailureReason",
    "shutdown_tpex_session",
]
