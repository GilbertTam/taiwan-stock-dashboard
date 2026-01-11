from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from area.serializers import AreaSerializer
from area.constants import AREA_EN_CH_MAP, AREA_EN_JP_MAP, AREA_ORDER

class AreaListView(APIView):
    """
    獲取所有電力區域列表
    """
    permission_classes = (IsAuthenticated,)

    @swagger_auto_schema(
        operation_summary="獲取電力區域列表",
        operation_description="返回所有電力區域的詳細資訊，包括ID、名稱、中文名稱和日文名稱",
        responses={
            "200": openapi.Response(
                description="成功獲取電力區域列表",
                examples={
                    "application/json": {
                        "result": [
                            {
                                "id": 1,
                                "name": "tokyo",
                                "name_ch": "東京",
                                "name_jp": "東京"
                            },
                            {
                                "id": 2,
                                "name": "shikoku",
                                "name_ch": "四國",
                                "name_jp": "四国"
                            }
                        ],
                        "code": 0,
                    }
                },
            )
        },
    )
    def get(self, request, format=None):
        """
        獲取所有電力區域的列表
        """
        # Instead of querying the database, we use the constants
        areas = []
        for index, name in enumerate(AREA_ORDER, start=1):
            areas.append({
                "id": index,
                "name": name,
                "name_ch": AREA_EN_CH_MAP.get(name, ""),
                "name_jp": AREA_EN_JP_MAP.get(name, "")
            })

        response_data = {
            "result": areas,
            "code": 0
        }
        
        return Response(response_data)
