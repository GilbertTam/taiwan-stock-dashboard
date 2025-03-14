
import requests
from loguru import logger

from quick_api.category.adjustment import Adjustment
from quick_api.category.hjks import HJKS
from quick_api.category.holiday import Holiday
from quick_api.category.jepx import JEPX
from quick_api.category.occto import OCCTO
from quick_api.category.price_predict import PricePredict
from quick_api.category.weather import Weather

class QuickAPI:
    def __init__(self, username: str, password: str):
        """
        初始化 QuickAPI 及其所有子類別
        
        Args:
            username: API 使用者名稱
            password: API 密碼
        """
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.auth = (username, password)
        self.base_url = "https://devpower.myquick.net/home/member/epw/api/"
        self.logout_url = "https://devpower.myquick.net/home/member/logout/clear.html"
        
        # 先執行登出確保清除之前的 session
        self.logout_first()
        
        # 初始化所有子類別
        self._init_categories()

    def _init_categories(self):
        """初始化所有 API 類別"""
        self.adjustment = Adjustment(self.session, self.base_url)
        self.hjks = HJKS(self.session, self.base_url)
        self.holiday = Holiday(self.session, self.base_url)
        self.jepx = JEPX(self.session, self.base_url)
        self.occto = OCCTO(self.session, self.base_url)
        self.price_predict = PricePredict(self.session, self.base_url)
        self.weather = Weather(self.session, self.base_url)

    def logout_first(self) -> bool:
        """
        將之前伺服器端session清空登出
        
        Returns:
            bool: 登出是否成功
        """
        try:
            response = self.session.post(
                self.logout_url,
                auth=(self.username, self.password),
                data={
                    'Username': self.username,
                    'Password': self.password
                }
            )
            response.raise_for_status()
            #logger.debug("Logout response: {}", response.text)
            return True
        except requests.exceptions.RequestException as e:
            logger.error("Logout failed: {}", e)
            return False

    def close(self):
        """關閉 session"""
        self.session.close()

    def __enter__(self):
        """Context manager 進入方法"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager 退出方法"""
        self.close()
