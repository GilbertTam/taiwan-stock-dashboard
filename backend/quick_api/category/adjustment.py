from typing import Dict, Optional
from urllib.parse import urljoin
import requests
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, time, timedelta

from loguru import logger
from quick_api.utils.request_get import request_get

class AdjustmentError(Exception):
    """Adjustment specific errors"""
    pass

class Area(str, Enum):
    """地區列舉"""
    HOKKAIDO = "北海道"  # 北海道
    TOUHOKU = "東北"      # 東北
    TOKYO = "東京"        # 東京
    CHUBU = "中部"       # 中部
    HOKURIKU = "北陸"  # 北陸
    KANSAI = "関西"      # 関西
    CHUGOKU = "中国"    # 中国
    SHIKOKU = "四国"    # 四国
    KYUSHU = "九州"      # 九州
    TOTAL = "合計"        # 合計 Default

class Category(str, Enum):
    """商品區分列舉"""
    TERTIARY_1 = "3100"  # 三次調整力①
    TERTIARY_2 = "3200"  # 三次調整力②

class Info(str, Enum):
    """交易情報列舉"""
    TSO = "tso"              # TSO別
    CORRECTED_UNIT = "corrected_unit"  # 電源供應區域別

@dataclass
class TertiaryAdjustabilityParams:
    """三次調整力參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    area: Optional[str] = Area.TOTAL
    category: Optional[str] = Category.TERTIARY_2
    info: Optional[str] = Info.TSO

class Adjustment:
    """
    三次調整力類
    
    用於獲取三次調整力相關資訊
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

        self.area = Area
        self.category = Category
        self.info = Info

    def _get_default_date(self) -> str:
        """
        根據當前時間獲取預設日期
        
        Returns:
            str: 預設日期 (yyyymmdd形式)
        """
        now = datetime.now()
        current_time = now.time()
        
        # 如果當前時間在 15:00-23:59 之間，使用明天的日期
        if time(15, 0) <= current_time <= time(23, 59):
            return (now + timedelta(days=1)).strftime("%Y%m%d")
        # 如果當前時間在 00:00-14:59 之間，使用今天的日期
        return now.strftime("%Y%m%d")

    def get_tertiary_adjustability(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[str] = Area.TOTAL,
        category: Optional[str] = Category.TERTIARY_2,
        info: Optional[str] = Info.TSO
    ) -> Dict:
        """
        No.17 三次調整力API
        獲取三次調整力資訊

        Args:
            from_date: 對象日(FROM) (yyyymmdd形式)
                      預設值：0:00-14:59是當日日期，15:00-23:59是翌日日期
            to_date: 對象日(TO) (yyyymmdd形式)
                    預設值：0:00-14:59是當日日期，15:00-23:59是翌日日期
            area: 區域 (北海道、東北、東京、中部、北陸、関西、中国、四国、九州、合計)
                  預設值：合計
            category: 商品區分 (三次調整力①=3100、三次調整力②=3200)
                     預設值：3200
            info: 交易情報 (TSO別=tso、電源属地別=corrected_unit)
                  預設值：tso

        Returns:
            Dict: 三次調整力資訊
        """

        try:
            # 如果未提供日期，使用預設日期
            if not from_date:
                from_date = self._get_default_date()
            if not to_date:
                to_date = self._get_default_date()

            params = TertiaryAdjustabilityParams(
                from_date=from_date,
                to_date=to_date,
                area=area,
                category=category,
                info=info
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "tertiary_adjustability_preliminary_value/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_tertiary_adjustability: {e}")
            raise AdjustmentError(f"Failed to get tertiary adjustability data: {str(e)}")
