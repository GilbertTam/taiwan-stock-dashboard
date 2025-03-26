from typing import Dict, Optional
from urllib.parse import urljoin
from enum import Enum
from dataclasses import dataclass
import re

import requests
from loguru import logger
from quick_api.utils.request_get import request_get
from quick_api.utils.check_date import check_date

class JEPXError(Exception):
    """JEPX specific errors"""
    pass

class SpotMarketUnit(str, Enum):
    """現貨市場單位列舉"""
    DAILY_AVG = "daily_avg"
    DAILY_HIGH_BOTTOM = "daily_high_bottom"
    DAILY_GROUPING_PRICE = "daily_grouping_price"
    WEEKLY_AVG = "weekly_avg"
    MONTHLY_HIGH_LOW = "monthly_high_low"
    MONTHLY_AVG = "monthly_avg"
    GROUPING_AREA_DAILY_AVG = "grouping_area_daily_avg"
    GROUPING_AREA_WEEKLY_AVG = "grouping_area_weekly_avg"
    GROUPING_AREA_MONTHLY_AVG = "grouping_area_monthly_avg"
    LATEST_DAY = "latest_day"
    LATEST_DAY_NORMAL_SPOT = "latest_day_normal_spot"
    LATEST_DAY_REMOTE_SPOT = "latest_day_remote_spot"
    LATEST_AND_WEST_SPREADNESS = "latest_and_west_spreadness"

class GroupingArea(str, Enum):
    """分組地區列舉"""
    HOKKAIDO = "1"  # 北海道
    TOKYO_KANSAI = "2"  # 東京・関西
    CHUBU_HOKURIKU_CHUGOKU_SHIKOKU = "3"  # 中部・北陸・中国・四国
    KYUSHU = "4"  # 九州

class Area(str, Enum):
    #（北海道, 東北, 東京, 中部, 北陸, 関西, 中国, 四国, 九州）のいずれか
    HOKKAIDO = "北海道"
    TOHOKU = "東北"
    TOKYO = "東京"
    CHUBU = "中部"
    HOKURIKU = "北陸"
    KANSAI = "関西"
    CHUGOKU = "中国"
    SHIKOKU = "四国"
    KYUSHU = "九州"


class WeekendsHolidays(str, Enum):
    """星期六、星期日列舉"""
    INCLUDE = "include"
    EXCLUDE = "exclude"
    ONLY = "only"

@dataclass
class SpotMarketTradeParams:
    """現貨市場交易結果參數"""
    target_date: Optional[str] = None
    years: Optional[int] = None
    months: Optional[int] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    speed_up_to_latest_day: Optional[bool] = None
    time_code: Optional[str] = None
    unit: Optional[str] = None
    fueladjustmentexpenses: Optional[bool] = None
    grouping_area: Optional[str] = None
    weekends_holidays: Optional[str] = None
    area: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = None

@dataclass
class SpotMarketIndexParams:
    """現貨市場指數參數"""
    target_date: Optional[str] = None
    years: Optional[int] = None
    months: Optional[int] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = 100

@dataclass
class ImbalancePriceParams:
    """不平衡料金參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    area: Optional[str] = None

@dataclass
class BeforeTimeMarketParams:
    """時間前市場參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = None

class JEPX:
    """
    日本卸電力取引所 (JEPX) API
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

        self.unit = SpotMarketUnit
        self.grouping_area = GroupingArea
        self.area = Area
        self.weekends_holidays = WeekendsHolidays


    def get_spot_market_data(
        self,
        target_date: Optional[str] = None,
        years: Optional[int] = None,
        months: Optional[int] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        speed_up_to_latest_day: Optional[bool] = None,
        time_code: Optional[str] = None,
        unit: Optional[str] = None,
        fuel_adjustment: Optional[bool] = None,
        grouping_area: Optional[str] = None,
        weekends_holidays: Optional[str] = None,
        area: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = None
    ) -> Dict:
        """
        No.1 スポット市場取引結果API
        獲取現貨市場交易結果
        
        Args:
            target_date: 指定日 (YYYYMMDD格式)
            years: 取得年數
            months: 取得月數
            from_date: 取得期間(From) (YYYYMMDD格式)
            to_date: 取得期間(To) (YYYYMMDD格式)
            speed_up_to_latest_day: 離最新日幾天內的資料
            time_code: 時間區塊 (1-48的整數。1是00:00, 2是00:30，以此類推)
            unit: 計算單位
            fuel_adjustment: 是否包含燃料調整費
            grouping_area: 區域群組計算（1:北海道, 2:東京・関西, 3:中部・北陸・中国・四国, 4:九州)，unit為GROUPING_AREA_DAILY_AVG、GROUPING_AREA_WEEKLY_AVG、GROUPING_AREA_MONTHLY_AVG時使用
            weekends_holidays: 是否包含星期六、星期日 ("include", "exclude", "only")
            area: 指定區域
            page: 頁數
            page_size: 一頁顯示數量
            
        Returns:
            Dict: 現貨市場交易結果資料
        """

        if not target_date:
            from_date, to_date = check_date(from_date, to_date)
        else:
            # 檢查日期格式是否為YYYYMMDD
            if not re.match(r'^\d{8}$', target_date):
                raise ValueError("target_date must be in YYYYMMDD format")

        try:
            params = SpotMarketTradeParams(
                target_date=target_date,
                years=years,
                months=months,
                from_date=from_date,
                to_date=to_date,
                speed_up_to_latest_day=speed_up_to_latest_day,
                time_code=time_code,
                unit=unit,
                fueladjustmentexpenses=fuel_adjustment,
                grouping_area=grouping_area,
                weekends_holidays=weekends_holidays,
                area=area,
                page=page,
                page_size=page_size
            )
            
            # 移除None值的參數
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "spot_market_trade_result/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_spot_market_data: {e}")
            raise JEPXError(f"Failed to get spot market data: {str(e)}")

    def get_spot_market_index(
        self,
        target_date: Optional[str] = None,
        years: Optional[int] = None,
        months: Optional[int] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.2 スポット市場インデックスAPI
        獲取現貨市場指數
        
        Args:
            target_date: 指定日 (yyyymmdd形式)
            years: 取得年數
            months: 取得月數
            from_date: 取得期間(From) (yyyymmdd形式)
            to_date: 取得期間(To) (yyyymmdd形式)
            page: 頁數
            page_size: 一頁顯示數量
            
        Returns:
            Dict: 現貨市場指數資料
        """

        if not target_date:
            from_date, to_date = check_date(from_date, to_date)
        else:
            # 檢查日期格式是否為YYYYMMDD
            if not re.match(r'^\d{8}$', target_date):
                raise ValueError("target_date must be in YYYYMMDD format")

        try:
            params = SpotMarketIndexParams(
                target_date=target_date,
                years=years,
                months=months,
                from_date=from_date,
                to_date=to_date,
                page=page,
                page_size=page_size
            )
            
            # 移除None值的參數
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "spot_market_index/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_spot_market_index: {e}")
            raise JEPXError(f"Failed to get spot market index: {str(e)}")

    def get_imbalance_price(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[str] = None
    ) -> Dict:
        """
        No.18 インバランス料金単価・量API
        獲取平衡費用單價和數量
        
        Args:
            from_date: 對象日(FROM) (yyyymmdd形式)
            to_date: 對象日(TO) (yyyymmdd形式)
            area: 區域 (北海道, 東北, 東京, 中部, 北陸, 関西, 中国, 四国, 九州)
            
        Returns:
            Dict: 平衡費用單價和數量資料
        """

        from_date, to_date = check_date(from_date, to_date)

        try:
            params = ImbalancePriceParams(
                from_date=from_date,
                to_date=to_date,
                area=area
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "imbalance_price_basis/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_imbalance_price: {e}")
            raise JEPXError(f"Failed to get imbalance price data: {str(e)}")

    def get_before_time_market(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = None
    ) -> Dict:
        """
        No.19 時間前市場価格API
        獲取時間前市場價格
        
        Args:
            from_date: 對象日(FROM) (yyyymmdd形式)
            to_date: 對象日(TO) (yyyymmdd形式)
            page: 頁數
            page_size: 一頁顯示數量
        Returns:
            Dict: 時間前市場價格資料
        """
        
        from_date, to_date = check_date(from_date, to_date)

        try:
            params = BeforeTimeMarketParams(
                from_date=from_date,
                to_date=to_date,
                page=page,
                page_size=page_size,
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "before_time_market_trade_result/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_before_time_market: {e}")
            raise JEPXError(f"Failed to get before time market data: {str(e)}")

