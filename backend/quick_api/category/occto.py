from typing import Dict, Optional, List, Union
from urllib.parse import urljoin
from enum import Enum
from dataclasses import dataclass

import requests
from loguru import logger
from quick_api.utils.request_get import request_get
from quick_api.utils.now_after_24h import now_after_24h
from quick_api.utils.check_date import check_date

class OCCTOError(Exception):
    """OCCTO specific errors"""
    pass

class Direction(str, Enum):
    """方向列舉"""
    # "両方"、”順方向"、"逆方向"  
    BOTH = "両方"          # 雙向
    FORWARD = "順方向"    # 順向
    REVERSE = "逆方向"    # 逆向

class FormulationStatus(str, Enum):
    """策定/更新狀態列舉"""
    FORMULATED = "策定"  # 策定
    UPDATED = "更新後"        # 更新後

class CrossSection(str, Enum):
    """對象區間列舉"""
    NEXT_DAY = "翌日"      # 隔天
    NEXT_TWO_DAY = "翌々日"  # 隔兩天

class Area(str, Enum):
    """區域列舉"""
    HOKKAIDO = "北海道"  # 北海道
    TOHOKU = "東北"      # 東北
    TOKYO = "東京"        # 東京
    CHUBU = "中部"       # 中部
    HOKURIKU = "北陸"  # 北陸
    KANSAI = "関西"      # 関西
    CHUGOKU = "中国"    # 中国
    SHIKOKU = "四国"    # 四国
    KYUSHU = "九州"      # 九州

class AreaEng(str, Enum):
    """地區列舉"""
    HOKKAIDO = "hokkaido"  # 北海道
    TOHOKU = "tohoku"    # 東北
    TOKYO = "tokyo"      # 東京
    CHUBU = "chubu"       # 中部
    HOKURIKU = "hokuriku"  # 北陸
    KANSAI = "kansai"      # 関西
    CHUGOKU = "chugoku"    # 中国
    SHIKOKU = "shikoku"    # 四国
    KYUSHU = "kyushu"      # 九州


class Unit(str, Enum):
    """計算單位列舉"""
    DAILY = "daily"            # 以日為單位
    LATEST_DAY = "latest_day"  # 最新日期

class InterconnectionLine(str, Enum):
    """連系線列舉"""
    HOKKAIDO_TO_TOHOKU = "北海道本州間連系設備"
    SOUMA_FUTABA = "相馬双葉幹線"
    HIGASHI_SHIMIZU = "東清水周波数変換設備"
    SHIN_SHINANO = "新信濃周波数変換設備"
    SAKUMA = "佐久間周波数変換設備"
    HIGASHI_FUKUMITSU = "東福光連系所"
    MINAMI_FUKUMITSU = "南福光連系所"
    SHIN_TONO = "新豊根周波数変換設備"
    HIGASHI_OMI = "東近江変換所"
    NISHI_HARIMA = "西播東岡山線"
    ANAN_KINOKI = "阿南紀北直流幹線"
    KANMON = "関門連系線"

class PlannedKubun(str, Enum):
    """計劃類型列舉"""
    YEARLY_PLAN = "年間計画"
    MONTHLY_PLAN = "月間計画"
    UNPLANNED = "計画外"
    EMERGENCY = "緊急"

class OutageUnit(str, Enum):
    """停電單位列舉"""
    # ========================================
    DISPLAY = "display"  # 顯示
    SEARCH = "search"    # 搜尋

class Unit(str, Enum):
    """計算單位列舉"""
    # ========================================
    DAILY = "daily"      # 日次
    LATEST_DAY = "latest_day"  # 最新日

class DemandPeakUnit(str, Enum):
    # grouping_area=エリアグルーピング結果を集計する
    GROUPING_AREA = "grouping_area"
    # weekly_avg=週次で集計して平均を求める
    WEEKLY_AVG = "weekly_avg"
    # grouping_area_weekly_avg=エリアグルーピング結果を週次で集計する
    GROUPING_AREA_WEEKLY_AVG = "grouping_area_weekly_avg"


@dataclass
class BaseParams:
    """基本參數"""
    page: Optional[int] = None
    page_size: Optional[int] = 100

@dataclass
class InterconnectionLineParams(BaseParams):
    """連系線容量參數"""
    from_datetime: Optional[str] = None
    to_datetime: Optional[str] = None
    interconnection_line: Optional[str] = None
    unit: Optional[str] = Unit.DAILY

@dataclass
class NextDayInterconnectionLineParams(BaseParams):
    """隔天與隔兩天連系線容量參數"""
    target_cross_section: Optional[str] = None
    from_datetime: Optional[str] = None
    to_datetime: Optional[str] = None
    interconnection_line: Optional[str] = None
    formulation_updated: Optional[str] = None
    direction: Optional[str] = Direction.BOTH

@dataclass
class PowerDemandParams(BaseParams):
    """電力需求參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    area: Optional[Union[str, List[str]]] = None
    unit: Optional[str] = None

@dataclass
class OutagePlanParams(BaseParams):
    """作業停止計画參數"""
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    interconnection_line: Optional[str] = None
    planned_kubun: Optional[str] = None
    unit: str = OutageUnit.SEARCH
    alert_flag: int = 0 # 0: False, 1: True

class OCCTO:
    """
    OCCTO (電力広域的運営推進機関) API
    
    處理連系線容量和電力需要相關的 API
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url

        # 列舉常數
        self.direction = Direction
        self.formulation_status = FormulationStatus
        self.cross_section = CrossSection
        self.area = Area
        self.area_eng = AreaEng
        self.outage_unit = OutageUnit
        self.demand_peak_unit = DemandPeakUnit
        self.unit = Unit
        self.interconnection_line = InterconnectionLine
        self.planned_kubun = PlannedKubun

    def get_weekly_interconnection_capacity(
        self,
        from_datetime: Optional[str] = None,
        to_datetime: Optional[str] = None,
        interconnection_line: Optional[str] = None,
        unit: Optional[str] = Unit.DAILY,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.10 連系線空容量(週間)API
        獲取連系線空容量(週間)
        
        Args:
            from_datetime: 日時(From) (yyyymmddhhmmss形式)
            to_datetime: 日時(To) (yyyymmddhhmmss形式)
            interconnection_line: 連線名稱
            unit: 集計単位 (daily=日次で空容量最小の最小値と空容量最大の最大値を返却する)
            page: 頁數
            page_size: 每頁資料數
        """

        from_datetime, to_datetime = now_after_24h(from_datetime, to_datetime)

        try:
            params = InterconnectionLineParams(
                from_datetime=from_datetime,
                to_datetime=to_datetime,
                interconnection_line=interconnection_line,
                unit=unit,
                page=page,
                page_size=page_size
            )

            request_params = {k: v for k, v in params.__dict__.items() if v is not None}

            return request_get(
                session=self.session,
                url=urljoin(self.url, "coorperationline_emptycapacity_weekly/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_weekly_interconnection_capacity: {e}")
            raise OCCTOError(f"Failed to get weekly interconnection capacity: {str(e)}")

    def get_nextday_interconnection_capacity(
        self,
        target_cross_section: Optional[str] = None,
        from_datetime: Optional[str] = None,
        to_datetime: Optional[str] = None,
        interconnection_line: Optional[str] = None,
        formulation_updated: Optional[str] = None,
        direction: Optional[str] = Direction.BOTH,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.11 連系線空容量(翌日・翌々日)API
        獲取連系線空容量(隔天・隔兩天)
        
        Args:
            target_cross_section: 対象断面 ("翌日"、"翌々日")
            from_datetime: 日時(From) (yyyymmddhhmmss形式)
            to_datetime: 日時(To) (yyyymmddhhmmss形式)
            interconnection_line: 連系線名称
            formulation_updated: 策定/更新後 ("策定"、"更新後")
            direction: 潮流方向 ("両方向"、"順方向"、"逆方向")
            page: ページ番号
            page_size: 1ページあたりのデータ件数
        """

        from_datetime, to_datetime = now_after_24h(from_datetime, to_datetime)
        
        try:
            params = NextDayInterconnectionLineParams(
                target_cross_section=target_cross_section,
                from_datetime=from_datetime,
                to_datetime=to_datetime,
                interconnection_line=interconnection_line,
                formulation_updated=formulation_updated,
                direction=direction,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "coorperationline_emptycapacity_nextday/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_nextday_interconnection_capacity: {e}")
            raise OCCTOError(f"Failed to get nextday interconnection capacity: {str(e)}")

    def get_nextday_power_demand_peak(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[Union[str, List[str]]] = None,
        unit: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.12 電力需要予想・ピーク時供給力(翌日)API
        獲取電力需求預測・峰值供應力(隔天)
        附註：API回傳是昨天跟from_date
        
        Args:
            from_date: 日付(From) (yyyymmdd形式)
            to_date: 日付(To) (yyyymmdd形式)
            area: 地區（可輸入多個）
            unit: 集計単位
                grouping_area=エリアグルーピング結果を集計する
                weekly_avg=週次で集計して平均を求める
                grouping_area_weekly_avg=エリアグルーピング結果を週次で集計する
            page: ページ番号
            page_size: 1ページあたりのデータ件数
        """
        from_date, to_date = check_date(from_date, to_date)
        
        try:
            params = PowerDemandParams(
                from_date=from_date,
                to_date=to_date,
                area=area,
                unit=unit,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "power_demand_expected_peak_when_supply_force_nextday/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_nextday_power_demand_peak: {e}")
            raise OCCTOError(f"Failed to get nextday power demand peak: {str(e)}")

    def get_weekly_power_demand_peak(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[Union[str, List[str]]] = None,
        unit: Optional[str] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.13 電力需要予想・ピーク時供給力(週間)API
        獲取電力需求預測・峰值供應力(週間)
        
        Args:
            from_date: 日付(From) (yyyymmdd形式)
            to_date: 日付(To) (yyyymmdd形式)
            area: 地區（可輸入多個）
            unit: 集計単位 (latest_day=最新日付を出力する)
                    有最新日只會抓到最新日的數據
            page: 頁數
            page_size: 每頁資料數
        """
        from_date, to_date = check_date(from_date, to_date)

        try:
            params = PowerDemandParams(
                from_date=from_date,
                to_date=to_date,
                area=area,
                unit=unit,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "power_demand_expected_peak_when_supply_force_weekly/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_weekly_power_demand_peak: {e}")
            raise OCCTOError(f"Failed to get weekly power demand peak: {str(e)}")

    def get_power_demand_achievement(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[Union[str, List[str]]] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.16 電力需要実績API
        獲取電力需求實際值
        
        Args:
            from_date: 対象日(FROM) (yyyymmdd形式)
            to_date: 対象日(TO) (yyyymmdd形式)
            area: 地區（可輸入多個）
                (hokkaido, tohoku, tokyo, chubu, hokuriku, kansai, chugoku, shikoku, kyushu)
            page: ページ番号
            page_size: 1ページあたりのデータ件数
        """
        from_date, to_date = check_date(from_date, to_date)
        try:
            params = PowerDemandParams(
                from_date=from_date,
                to_date=to_date,
                area=area,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "power_demand_achievement_daily/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_power_demand_achievement: {e}")
            raise OCCTOError(f"Failed to get power demand achievement: {str(e)}")

    def get_interconnection_outage_plan(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        planned_kubun: Optional[str] = None,
        interconnection_line: Optional[str] = None,
        unit: str = OutageUnit.SEARCH,
        alert_flag: int = 0
    ) -> Dict:
        """
        No.22 獲取連系線の作業停止計画
        獲取連系線的作業停止計畫

        Args:
            from_date: FROM (yyyymmdd格式)
            to_date: TO (yyyymmdd格式)
            planned_kubun: 計劃類型
            interconnection_line: 連接線通稱，可選擇以下其中一個，不填就是全部
                (北海道本州間連系設備、相馬双葉幹線、東清水周波数変換設備、新信濃周波数変換設備、
                 佐久間周波数変換設備、東福光連系所、南福光連系所、新豊根周波数変換設備、東近江変換所、
                 西播東岡山線、阿南紀北直流幹線、関門連系線) 
            unit: (display ,search)選擇顯示或搜尋，搜尋畫面的話就是search
            alert_flag: 警報標誌 (0: False, 1: True)
        """
        from_date, to_date = check_date(from_date, to_date)
        
        try:
            params = OutagePlanParams(
                from_date=from_date,
                to_date=to_date,
                planned_kubun=planned_kubun,
                interconnection_line=interconnection_line,
                unit=unit,
                alert_flag=alert_flag,
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "working_stop_plan/"),
                params=request_params
            )
            
        except Exception as e:
            logger.error(f"Error in get_interconnection_outage_plan: {e}")
            raise OCCTOError(f"Failed to get interconnection outage plan: {str(e)}")