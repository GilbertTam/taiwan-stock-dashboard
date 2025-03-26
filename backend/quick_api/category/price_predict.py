import datetime
from typing import Dict, Optional
from urllib.parse import urljoin
import requests
from enum import Enum
from dataclasses import dataclass

from loguru import logger
from quick_api.utils.request_get import request_get
from quick_api.utils.check_date import check_date

class PricePredictError(Exception):
    """Price prediction specific errors"""
    pass

class Section(str, Enum):
    H00 = "0"
    H03 = "3"
    H06 = "6"
    H09 = "9"
    H12 = "12"
    H15 = "15"
    H18 = "18"
    H21 = "21"

class Area(str, Enum):
    """區域列舉"""
    # 北海道/東北/東京/中部/北陸/関西/中国/四国/九州
    HOKKAIDO = "北海道"
    TOHOKU = "東北"
    TOKYO = "東京"
    CHUBU = "中部"
    HOKURIKU = "北陸"
    KANSAI = "関西"
    CHUGOKU = "中国"
    SHIKOKU = "四国"
    KYUSHU = "九州"

class PriceType(str, Enum):
    """價格類型列舉"""
    # XXX_dailyを指定可能。(XXXにはareaが入る)
    # (hokkaido, tohoku, tokyo, chubu, hokuriku, kansai, chugoku, shikoku, kyushuのいずれか)"
    HOKKAIDO = "hokkaido_daily"
    TOHOKU = "tohoku_daily"
    TOKYO = "tokyo_daily"
    CHUBU = "chubu_daily"
    HOKURIKU = "hokuriku_daily"
    KANSAI = "kansai_daily"
    CHUGOKU = "chugoku_daily"
    SHIKOKU = "shikoku_daily"
    KYUSHU = "kyushu_daily"

class SpotUnit(str, Enum):
    """SPOT單位列舉"""
    # latest_calculating_datetime=最新的計算結果
    LATEST_CALCULATING_DATETIME = "latest_calculating_datetime"
    # latest_calculating_date=最新の9時の計算結果を返す(計算日込み)
    LATEST_CALCULATING_DATE = "latest_calculating_date"
    # select_calculating_date_section=以下のsectionの計算結果を返す（sectionは必須）
    # section=0,3,6,9,12,15,18,21のいずれかを指定する。
    SELECT_CALCULATING_DATE_SECTION = "select_calculating_date_section"

class ForwardUnit(str, Enum):
    """FORWARD單位列舉"""
    # monthly_avg=月平均值
    MONTHLY_AVG = "monthly_avg"
    # latest_calculating_date=最近一個月的計算結果
    LATEST_CALCULATING_DATE = "latest_calculating_date"
@dataclass
class SpotPowerPricePredictParams:
    """現貨電力價格預測參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    calculating_date: Optional[str] = None
    time_code: Optional[str] = None
    area: Optional[str] = None
    unit: Optional[str] = None
    section: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = 100

@dataclass
class ForwardPowerPricePredictParams:
    """遠期電力價格預測參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    calculating_date: Optional[str] = None
    price_type: Optional[str] = None
    unit: Optional[str] = None
    page: Optional[int] = None
    page_size: Optional[int] = 100

class PricePredict:
    """
    電力價格預測類
    
    用於獲取現貨和遠期電力價格預測
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

        self.section = Section
        self.area = Area
        self.price_type = PriceType

        self.spot_unit = SpotUnit
        self.forward_unit = ForwardUnit

    def get_spot_power_price_prediction(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        calculating_date: Optional[str] = None,
        time_code: Optional[str] = None,
        area: Optional[str] = None,
        unit: Optional[str] = None,
        section: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.14 スポット価格予測3API
        獲取現貨電力價格預測
        
        Args:
            from_date: 取得期間(From) (yyyymmdd形式)
            to_date: 取得期間(To) (yyyymmdd形式)
            calculating_date: 計算日 (yyyymmdd形式)
            time_code: 時間代碼 (1-48，1是00:00，2是00:30，以此類推)
            area: 地區
            unit:
                latest_calculating_datetime=最新の計算結果を返す
                latest_calculating_date=最新の9時の計算結果を返す(計算日込み)
                select_calculating_date_section=以下のsectionの計算結果を返す
            section: 計算區段代碼 (3,6,9,12,15,18,21)
            page: 頁碼
            page_size: 每頁資料筆數，預設100筆
            
        Returns:
            Dict: 現貨電力價格預測資料
        """

        from_date, to_date = check_date(from_date, to_date)

        # 這個API取得資料是當天早上九點的資料
        # 所以計算日必須是昨天，結束日期也必須加一天
        from_date = (datetime.datetime.strptime(from_date, "%Y%m%d") - datetime.timedelta(days=1)).strftime("%Y%m%d")
        to_date = (datetime.datetime.strptime(to_date, "%Y%m%d") + datetime.timedelta(days=1)).strftime("%Y%m%d")

        try:
            params = SpotPowerPricePredictParams(
                from_date=from_date,
                to_date=to_date,
                calculating_date=calculating_date,
                time_code=time_code,
                area=area,
                unit=unit,
                section=section,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "spot_power_price_prediction3/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_spot_power_price_prediction: {e}")
            raise PricePredictError(f"Failed to get spot power price prediction: {str(e)}")

    def get_forward_power_price_prediction(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        calculating_date: Optional[str] = None,
        price_type: Optional[str] = None,
        unit: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.15 フォワード価格予測3API
        獲取遠期電力價格預測
        
        Args:
            from_date: 取得期間(From) (yyyymmdd形式)
            to_date: 取得期間(To) (yyyymmdd形式)
            calculating_date: 計算日 (yyyymmdd形式，2023/11/XX より前はデータがないので選択不可)
            price_type: 價格類型 (hokkaido, tohoku, tokyo, chubu, hokuriku, kansai, chugoku, shikoku, kyushu)
            unit:
                    monthly_avg=月平均值
                    latest_calculating_date=最近一個月的計算結果
            page: 頁碼
            page_size: 每頁資料筆數，預設100筆
            
        Returns:
            Dict: 遠期電力價格預測資料
        """

        from_date, to_date = check_date(from_date, to_date)

        try:
            params = ForwardPowerPricePredictParams(
                from_date=from_date,
                to_date=to_date,
                calculating_date=calculating_date,
                price_type=price_type,
                unit=unit,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "forward_power_price_prediction3/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_forward_power_price_prediction: {e}")
            raise PricePredictError(f"Failed to get forward power price prediction: {str(e)}")
