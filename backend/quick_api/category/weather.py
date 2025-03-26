from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urljoin
from enum import Enum

import requests
from loguru import logger

from quick_api.utils.request_get import request_get
from quick_api.utils.now_after_24h import now_after_24h
from quick_api.utils.check_date import check_date

class WeatherError(Exception):
    """Weather specific errors"""
    pass

class Area(str, Enum):
    HOKKAIDO = "北海道"
    TOHOKU = "東北"
    TOKYO = "東京"
    CHUBU = "中部"
    HOKURIKU = "北陸"
    KANSAI = "関西"
    CHUGOKU = "中国"
    SHIKOKU = "四国"
    KYUSHU = "九州"

class City(str, Enum):
    TOKYO = "東京"
    YOKOHAMA = "横浜"
    NAGOYA = "名古屋"
    OSAKA = "大阪"
    FUKUOKA = "福岡"
    SAPPORO = "札幌"
    # etc. need to add more cities

class Section(str, Enum):
    H00 = "0"
    H03 = "3"
    H06 = "6"
    H09 = "9"
    H12 = "12"
    H15 = "15"
    H18 = "18"
    H21 = "21"
    LATEST = "latest"
    ALL = "all"

class ResultUnit(str, Enum):
    # daily_temp   日単位の最低気温、最高気温を返す。
    DAILY_TEMP = 'daily_temp'
    # weekly_temp   日単位の最低気温、最高気温を返す。
    WEEKLY_TEMP = 'weekly_temp'

class ForecastUnit(str, Enum):
    # daily 日単位の情報を返す。（最終予報のみ。現状は最高、最低気温のみ返却）
    DAILY = 'daily'
    # daily_temp  日単位の最高気温、最低気温を返す。
    DAILY_TEMP = 'daily_temp'
    # weekly_temp   週単位の最高気温、最低気温を返す。
    WEEKLY_TEMP = 'weekly_temp'

class AvgUnit(str, Enum):
    # (latest, morn)　※価格予測画面でのみ使用
    LATEST = "latest"
    MORNING = "morn"

@dataclass
class WeatherBaseParams:
    area: str
    
@dataclass
class WeatherResultsParams(WeatherBaseParams):
    """天氣實際數據API參數"""
    from_datetime: str
    to_datetime: str
    city: str
    unit: str
    page: int
    page_size: int

@dataclass
class WeatherForecastParams(WeatherBaseParams):
    """天氣預報API參數"""
    from_datetime: str
    to_datetime: str
    city: str
    section: str
    unit: str
    page_size: int
    page: int

@dataclass
class WeatherAverageParams(WeatherBaseParams):
    """天氣平均值API參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    section: Optional[str] = None
    unit: Optional[str] = None

class Weather:
    """天気データ取得クラス"""

    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

        self.area = Area
        self.city = City
        self.section = Section
        self.result_unit = ResultUnit
        self.forecast_unit = ForecastUnit
        self.avg_unit = AvgUnit

    def get_weather_results(
        self,
        from_datetime: Optional[str] = None,
        to_datetime: Optional[str] = None,
        area: str = None,
        city: str = None,
        unit: str = None,
        page: int = 1,
        page_size: int = 24
    ) -> Optional[Dict[str, str]]:
        """
        No.07 天気実績データ取得API
        
        Args:
            from_datetime: 開始時間 (YYYYMMDDHH0000)，預設為當前時間
            to_datetime: 結束時間 (YYYYMMDDHH0000)，不填的話，預設為24小時後
            area: 地區，不指定就是全體地區
            city: 城市（要注意地區有沒有包含指定的城市）
            unit: 資料單位
            page: 頁數
            page_size: 每頁資料量
        """

        from_datetime, to_datetime = now_after_24h(from_datetime, to_datetime)

        if area is not None and city is not None:
            raise WeatherError("area and city cannot be used together")
        if area is None and city is None:
            raise WeatherError("area or city must be specified")

        params = WeatherResultsParams(
            from_datetime=from_datetime,
            to_datetime=to_datetime,
            area=area,
            city=city,
            unit=unit,
            page=page,
            page_size=page_size
        )

        # 移除 None 值
        params = {k: v for k, v in params.__dict__.items() if v is not None}

        return request_get(
            session=self.session,
            url=urljoin(self.url, "weather_results/"),
            params=params
        )

    def get_weather_forecast(
        self,
        from_datetime: Optional[str] = None,
        to_datetime: Optional[str] = None,
        area: str = None,
        city: str = None,
        section: str = Section.ALL,
        unit: str = None,
        page_size: int = 24,
        page: int = 1
    ) -> Optional[Dict[str, str]]:
        """
        No.08 天気予報データAPI
        
        Args:
            from_datetime: 開始時間 (YYYYMMDDHH0000)，預設為當前時間
            to_datetime: 結束時間 (YYYYMMDDHH0000)，不填的話，預設為24小時後
            area: 地區，不指定就是全體地區
            city: 城市（要注意地區有沒有包含指定的城市）
            section:
                latest = 最終予報のみ／all＝全断面
                0,3,6,9,12,15,18,21=指定した数字の時刻のみ返す(unit=daily_temp,weekly_temp指定時のみ)
            unit: 資料單位
            page_size: 每頁資料量
            page: 頁數
        """

        from_datetime, to_datetime = now_after_24h(from_datetime, to_datetime)

        if area is not None and city is not None:
            raise WeatherError("area and city cannot be used together")

        params = WeatherForecastParams(
            from_datetime=from_datetime,
            to_datetime=to_datetime,
            area=area,
            city=city,
            section=section,
            unit=unit,
            page_size=page_size,
            page=page,
        )
        
        # 移除 None 值
        params = {k: v for k, v in params.__dict__.items() if v is not None}

        return request_get(
            session=self.session,
            url=urljoin(self.url, "weather_forecast/"),
            params=params
        )

    def get_weather_forecast_average(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: str = None,
        section: Optional[str] = None,
        unit: Optional[str] = None,
    ) -> Optional[Dict[str, str]]:
        """
        No.20 天気予報平均値API
        
        Args:
            from_date: 開始日期 (YYYYMMDD)，預設為當前日期
            to_date: 結束日期 (YYYYMMDD)，預設為當前日期
            area: 地區
            section: 時段 (0,3,6,9,12,15,18,21)
            unit: 資料類型 (latest/morn) ※僅在價格預測畫面使用
        
        Raises:
            WeatherError: 參數驗證失敗時
        """
        from_date, to_date = check_date(from_date, to_date)

        try:
            
            # 基本參數驗證
            if area not in [a.value for a in Area]:
                raise WeatherError(f"Invalid area: {area}")
            
            params = WeatherAverageParams(area=area)
            
            # section 和 unit 的互斥驗證
            if section is not None and unit is not None:
                raise WeatherError("Cannot specify both section and unit")
            
            # section 驗證
            if section is not None:
                if section not in [s.value for s in Section]:
                    raise WeatherError(f"Invalid section: {section}")
                params.section = section
            
            # unit 驗證
            if unit is not None:
                if unit not in [u.value for u in AvgUnit]:
                    raise WeatherError(f"Invalid unit: {unit}")
                params.unit = unit
                
            # 日期參數處理
            if unit != AvgUnit.LATEST:
                params.from_date = from_date
                
            if not params.section and to_date:
                params.to_date = to_date
            
            # 移除 None 值
            params = {k: v for k, v in params.__dict__.items() if v is not None}

            return request_get(
                session=self.session,
                url=urljoin(self.url, "weather_forecast_average/"),
                params=params
            )

        except WeatherError as e:
            logger.error(f"Parameter validation failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise

    def get_weather_results_average(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: str = None,
        section: Optional[str] = None,
        unit: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        No.21 天気実績平均値API
        獲取平均氣溫、平均雲量、平均濕度

        Args:
            from_date: 開始日期 (YYYYMMDD)，預設為當前日期
            to_date: 結束日期 (YYYYMMDD)，預設為當前日期
            area: 地區（北海道, 東北, 東京, 中部, 北陸, 関西, 中国, 四国, 九州）
            section: 時段 (0,3,6,9,12,15,18,21)，當 unit 未指定時才有效
            unit: 最新資料檢查（latest），預設為空值

        Returns:
            Dict[str, str]: API 回應資料

        Raises:
            WeatherError: 參數驗證失敗時
        """
        try:
            # 驗證地區
            if area not in [a.value for a in Area]:
                raise WeatherError(f"Invalid area: {area}")

            # 初始化參數
            params = WeatherAverageParams(area=area)

            # 設定 unit
            if unit is not None:
                if unit != "latest":
                    raise WeatherError("unit must be 'latest' if specified")
                params.unit = unit

            # 設定 section（只在 unit 未指定時有效）
            if unit is None and section is not None:
                if section not in [s.value for s in Section]:
                    raise WeatherError(f"Invalid section: {section}")
                params.section = section

            # 設定日期
            if from_date or to_date:
                from_date, to_date = check_date(from_date, to_date)
                params.from_date = from_date
                params.to_date = to_date

            # 移除空值
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}

            # 發送請求
            return request_get(
                session=self.session,
                url=urljoin(self.url, "weather_results_average/"),
                params=request_params
            )

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise
        except WeatherError as e:
            logger.error(f"Parameter validation failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise