from typing import Dict, Optional, List, Union
from urllib.parse import urljoin
import requests
from enum import Enum
from dataclasses import dataclass

from loguru import logger
from quick_api.utils.request_get import request_get
from quick_api.utils.check_date import check_date
from quick_api.utils.now_after_24h import now_after_24h

class HJKSError(Exception):
    """HJKS specific errors"""
    pass

class SuspensionKind(str, Enum):
    """停止區分列舉"""
    PLANNED = "planned"  # 計画停止
    UNPLANNED = "unplanned"  # 計画外停止
    OUTPUT_DECREASE = "output_decrease"  # 出力低下

class SuspensionKindDetail(Enum):
    # 低下相關
    DECREASE_FUEL_CONSTRAINT = "低下・燃料制約"
    DECREASE_EQUIPMENT_FAILURE = "低下・設備故障"
    DECREASE_TRANSMISSION_CONSTRAINT = "低下・送電線等制約"
    DECREASE_OTHER = "低下・その他"
    
    # 停止相關
    STOP_FUEL_CONSTRAINT = "停止・燃料制約"
    STOP_EQUIPMENT_FAILURE = "停止・設備故障"
    STOP_TRANSMISSION_CONSTRAINT = "停止・送電線等制約"
    STOP_PERIODIC_INSPECTION = "停止・定期検査等"
    STOP_OTHER = "停止・その他"				

class PowerGenMethod(str, Enum):
    """發電形式列舉"""
    CARBON = "火力（石炭）"
    GAS = "火力（ガス）"
    OIL = "火力（石油）"
    NUCLEAR = "原子力"
    HYDRO = "水力"
    OTHER = "その他"
    
class Area(str, Enum):
    """地區列舉"""
    HOKKAIDO = "北海道"  # 北海道
    TOHOKU = "東北"    # 東北
    TOKYO = "東京"      # 東京
    CHUBU = "中部"     # 中部
    HOKURIKU = "北陸"  # 北陸
    KANSAI = "関西"    # 関西
    CHUGOKU = "中国"  # 中国
    SHIKOKU = "四国"  # 四国
    KYUSHU = "九州"    # 九州

class UnitType(str, Enum):
    """集計單位列舉"""
    ALL_AREA_SUM = "all_area_sum"  # 所有發電形式的全國合計
    ANY_AREA_SUM = "any_area_sum"  # 各個發電形式的分區合計
    GROUPING_AREA_SUM = "grouping_area_sum"  # 區域群組的合計
    GROUPING_AREA_WEEKLY_SUM = "grouping_area_weekly_sum"  # 區域群組的週合計
    GROUPING_AREA_MONTHLY_SUM = "grouping_area_monthly_sum"  # 區域群組的月合計

class SortType(str, Enum):
    """排序類型列舉"""
    ASC = "asc"  # 升冪
    DESC = "desc"  # 降冪

@dataclass
class SuspensionParams:
    """停止情報一覧參數"""
    area: Optional[str] = None
    company: Optional[str] = None
    power_plant_code: Optional[str] = None
    power_plant_name: Optional[str] = None
    power_gen_method: Optional[str] = None
    unit_name: Optional[str] = None
    suspension_kind: Optional[str] = None
    suspension_kind_detail: Optional[str] = None
    from_datetime: Optional[str] = None
    to_datetime: Optional[str] = None
    sort_column: Optional[str] = None
    sort: Optional[str] = None
    limit: Optional[int] = None
    page: Optional[int] = None
    page_size: Optional[int] = 100

@dataclass
class UnitParams:
    """UNIT參數"""
    page: Optional[int] = None
    page_size: Optional[int] = 100

@dataclass
class PowerPlantStatusParams:
    """發電廠運作狀況參數"""
    area: Optional[Union[str, List[str]]] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    power_gen_method: Optional[str] = None
    unit: Optional[str] = None

class HJKS:
    """
    発電所情報公開システム (HJKS) API
    """
    
    def __init__(self, session: requests.Session, url: str):
        self.session = session
        self.url = url
        self.suspension_kind_detail = SuspensionKindDetail
        self.suspension_kind = SuspensionKind
        self.power_gen_method = PowerGenMethod
        self.area = Area
        self.unit_type = UnitType
        self.sort_type = SortType

    def get_suspension_info(
        self,
        area: Optional[Union[str, List[str]]] = None,
        company: Optional[str] = None,
        power_plant_code: Optional[str] = None,
        power_plant_name: Optional[str] = None,
        power_gen_method: Optional[Union[str, List[str]]] = None,
        unit_name: Optional[str] = None,
        suspension_kind: Optional[Union[str, List[str]]] = None,
        suspension_kind_detail: Optional[str] = None,
        from_datetime: Optional[str] = None,
        to_datetime: Optional[str] = None,
        sort_column: Optional[str] = None,
        sort: Optional[str] = SortType.ASC,
        limit: Optional[int] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.03 停止情報一覧API
        
        Args:
            area: 區域（可輸入多個）
            company: 事業者名
            power_plant_code: 發電廠代碼
            power_plant_name: 發電廠名稱
            power_gen_method: 發電形式（可輸入多個）
            unit_name: 單位名稱
            suspension_kind: 停止類型（可輸入多個）
            suspension_kind_detail: 停止類型詳細
            from_datetime: 停止期間(From) (yyyymmddhhmss格式)
            to_datetime: 停止期間(To) (yyyymmddhhmss格式)
            sort_column: 排序欄位
            sort: 順序 (asc=升冪、desc=降冪)
            limit: 取得數量
            page: 頁數
            page_size: 一頁顯示的數量
        """

        from_datetime, to_datetime = now_after_24h(from_datetime, to_datetime)

        try:
            params = SuspensionParams(
                area=area,
                company=company,
                power_plant_code=power_plant_code,
                power_plant_name=power_plant_name,
                power_gen_method=power_gen_method,
                unit_name=unit_name,
                suspension_kind=suspension_kind,
                suspension_kind_detail=suspension_kind_detail,
                from_datetime=from_datetime,
                to_datetime=to_datetime,
                sort_column=sort_column,
                sort=sort,
                limit=limit,
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "suspension_info/"),
                params=request_params
            )
        except Exception as e:
            logger.error(f"Error in get_suspension_info: {e}")
            raise HJKSError(f"Failed to get suspension info: {str(e)}")

    def get_unit_info(
        self,
        page: Optional[int] = None,
        page_size: Optional[int] = 100
    ) -> Dict:
        """
        No.04 ユニット一覧API
        
        Args:
            page: 頁數
            page_size: 一頁顯示的數量
        """
        try:
            params = UnitParams(
                page=page,
                page_size=page_size
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}
            
            return request_get(
                session=self.session,
                url=urljoin(self.url, "unit_info/"),
                params=request_params
            )
        except Exception as e:
            logger.error(f"Error in get_unit_info: {e}")
            raise HJKSError(f"Failed to get unit info: {str(e)}")

    def get_power_plant_status(
        self,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        area: Optional[Union[str, List[str]]] = None,
        power_gen_method: Optional[str] = None,
        unit: Optional[str] = None
    ) -> Dict:
        """
        No.06 発電所稼働状況API2
        
        Args:
            from_date: 開始日 (yyyymmdd格式)
            to_date: 終了日 (yyyymmdd格式)
            area: 區域（可輸入多個）
            power_gen_method: 發電形式
            unit: 單位名稱
        """

        from_date, to_date = check_date(from_date, to_date)

        try:
            params = PowerPlantStatusParams(
                area=area,
                from_date=from_date,
                to_date=to_date,
                power_gen_method=power_gen_method,
                unit=unit
            )
            
            request_params = {k: v for k, v in params.__dict__.items() if v is not None}

            return request_get(
                session=self.session,
                url=urljoin(self.url, "power_plant_operating_status_new/"),
                params=request_params
            )
        except Exception as e:
            logger.error(f"Error in get_power_plant_status: {e}")
            raise HJKSError(f"Failed to get power plant status: {str(e)}")
