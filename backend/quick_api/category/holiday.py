from typing import Dict, Optional
from urllib.parse import urljoin
import requests
from dataclasses import dataclass

from loguru import logger
from quick_api.utils.request_get import request_get
from quick_api.utils.check_date import check_date

class HolidayError(Exception):
    """Holiday specific errors"""
    pass

@dataclass
class HolidayParams:
    """日本假日資訊查詢參數"""
    from_date: Optional[str] = None  # yyyymmdd形式
    to_date: Optional[str] = None    # yyyymmdd形式
    page: Optional[int] = None
    page_size: Optional[int] = 100

class Holiday:
    """
    日本假日資訊處理類
    
    用於查詢日本國定假日相關資訊
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

    def get_holiday_info(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.09 日本カレンダー（祝日情報）取得API
        
        Args:
            from_date: 開始日期 (yyyymmdd形式)
            to_date: 結束日期 (yyyymmdd形式)
            page: 頁數
            page_size: 每頁資料筆數，預設100筆
        """
        
        from_date, to_date = check_date(from_date, to_date)
        
        try:
            params = HolidayParams(
                from_date=from_date,
                to_date=to_date,
                page=page,
                page_size=page_size
            )
            
            # 移除None值的參數
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "public_holiday_info/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_holiday_info: {e}")
            raise HolidayError(f"Failed to get holiday information: {str(e)}")
