"""
Market Information Serializers.

This module defines DRF serializers for market information data structures
returned by the Elasticsearch service. These serializers are primarily used
for Swagger/OpenAPI documentation generation and response validation.

Serializer Categories:
    - Grid Operations: ImbalanceSerializer, InterconnectionFlowSerializer
    - Power Plants: HjksOutageSerializer
    - JEPX Markets: SpotTradeSerializer, IntradaySerializer
    - OCCTO Data: OcctoAreaSerializer, OcctoInterconnectionSerializer, OcctoEventSerializer
    - External Data: EarthquakeSerializer, WeatherActualSerializer, WeatherForecastSerializer
    - Grid Balancing: TdgcSerializer
"""

from rest_framework import serializers


# =============================================================================
# Grid Operations Serializers
# =============================================================================

class ImbalanceSerializer(serializers.Serializer):
    """
    Serializer for grid imbalance data.

    Represents the difference between planned and actual power
    generation/consumption for a specific grid area at a given time.
    """
    datetime = serializers.DateTimeField()
    area = serializers.CharField()
    imbalance_quantity = serializers.FloatField(required=False, allow_null=True)
    imbalance_surplus_rate = serializers.FloatField(required=False, allow_null=True)
    imbalance_deficit_rate = serializers.FloatField(required=False, allow_null=True)
    dir = serializers.CharField(required=False)
    source = serializers.CharField(required=False)
    dataset = serializers.CharField(required=False)
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


class InterconnectionFlowSerializer(serializers.Serializer):
    """
    Serializer for interconnection line flow data.

    Represents power flow between grid areas through transmission
    interconnection lines, including capacity and margin information.
    """
    datetime = serializers.DateTimeField()
    interconnection_name = serializers.CharField()
    forward_operating_capacity = serializers.FloatField()
    reverse_operating_capacity = serializers.FloatField()
    forward_margin = serializers.FloatField()
    reverse_margin = serializers.FloatField()
    forward_planned_flow = serializers.FloatField()
    reverse_planned_flow = serializers.FloatField()
    forward_available_capacity = serializers.FloatField()
    reverse_available_capacity = serializers.FloatField()
    moving_supply_capacity = serializers.FloatField()
    forward_available_capacity_after_movement = serializers.FloatField()
    reverse_available_capacity_after_movement = serializers.FloatField()
    forward_disconnection_information = serializers.CharField()
    reverse_disconnection_information = serializers.CharField()
    crawl_time = serializers.DateTimeField(required=False)
    md5_id = serializers.CharField(required=False)


# =============================================================================
# Power Plant Serializers
# =============================================================================

class HjksOutageSerializer(serializers.Serializer):
    """
    Serializer for HJKS power plant outage data.

    HJKS (発電計画・実績・停止) provides information about
    planned and unplanned power plant outages that may affect
    electricity supply in the grid.
    """
    id = serializers.IntegerField()
    area = serializers.CharField()
    company = serializers.CharField()
    plantcd = serializers.CharField()
    name = serializers.CharField()
    format = serializers.CharField()
    unitcd = serializers.CharField()
    unit_name = serializers.CharField()
    max_capacity = serializers.IntegerField()
    stop_category = serializers.CharField()
    stop_type = serializers.CharField()
    start_datetime = serializers.DateTimeField()
    outlook = serializers.CharField()
    end_datetime = serializers.DateTimeField()
    factor = serializers.CharField()
    upddt = serializers.DateTimeField()
    down_capacity = serializers.IntegerField(allow_null=True)
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


# =============================================================================
# JEPX Market Serializers
# =============================================================================

class SpotTradeSerializer(serializers.Serializer):
    """
    Serializer for JEPX spot market trade data.

    Represents a single trading record from the Day-Ahead spot market,
    including system price, area price, and quantity information.
    """
    id = serializers.CharField(read_only=True)
    trade_date = serializers.DateField()
    time_code = serializers.IntegerField()
    sell_quantity = serializers.IntegerField(required=False)
    buy_quantity = serializers.IntegerField(required=False)
    contract_quantity = serializers.IntegerField(required=False)
    system_price = serializers.FloatField(required=False)
    name = serializers.CharField(help_text="Area Name (EN)")
    name_ch = serializers.CharField(help_text="Area Name (Chinese)")
    name_jp = serializers.CharField(help_text="Area Name (Japanese)")
    price = serializers.FloatField()
    avoidable_cost = serializers.FloatField(required=False)


class IntradaySerializer(serializers.Serializer):
    """
    Serializer for JEPX intraday market data.

    Represents trading data from the intraday market with OHLC
    (Open, High, Low, Close) price information and volume.
    """
    date = serializers.DateField(format="%Y/%m/%d")
    time_code = serializers.IntegerField()
    opening_price = serializers.FloatField()
    high_price = serializers.FloatField()
    low_price = serializers.FloatField()
    closing_price = serializers.FloatField()
    average_price = serializers.FloatField()
    total_contracted_volume = serializers.FloatField()
    contract_count = serializers.IntegerField()
    datetime = serializers.DateTimeField()
    cat = serializers.CharField(required=False)
    dir = serializers.CharField(required=False)
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


# =============================================================================
# OCCTO Data Serializers
# =============================================================================

class OcctoAreaSerializer(serializers.Serializer):
    """
    Serializer for OCCTO area supply/demand data.

    Contains power generation breakdown by source type for a grid area,
    provided by OCCTO (Organization for Cross-regional Coordination
    of Transmission Operators).
    """
    area_demand = serializers.IntegerField()
    nuclear_power = serializers.IntegerField()
    hydropower = serializers.IntegerField()
    geothermal_power = serializers.IntegerField()
    biomass = serializers.IntegerField()
    solar_power_generation_actual = serializers.IntegerField()
    solar_power_output_control = serializers.IntegerField()
    wind_power_generation_actual = serializers.IntegerField()
    wind_power_output_control = serializers.IntegerField()
    pumped_storage = serializers.IntegerField()
    battery_storage = serializers.IntegerField()
    interconnection_line = serializers.IntegerField()
    others = serializers.IntegerField()
    total = serializers.IntegerField()
    thermal = serializers.IntegerField()
    datetime = serializers.DateTimeField()
    area = serializers.CharField()
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


class OcctoInterconnectionSerializer(serializers.Serializer):
    """
    Serializer for OCCTO interconnection data.

    Detailed interconnection line data including operating capacity,
    wide-area adjustment capacity, and flow information.
    """
    interconnection_name = serializers.CharField()
    target_date = serializers.DateField(required=False)
    target_time = serializers.CharField(required=False)
    forward_operating_capacity = serializers.FloatField()
    reverse_operating_capacity = serializers.FloatField()
    forward_wide_area_adjustment_capacity = serializers.FloatField()
    reverse_wide_area_adjustment_capacity = serializers.FloatField()
    forward_margin = serializers.FloatField()
    reverse_margin = serializers.FloatField()
    forward_available_capacity = serializers.FloatField()
    reverse_available_capacity = serializers.FloatField()
    forward_planned_flow = serializers.FloatField()
    reverse_planned_flow = serializers.FloatField()
    actual_flow = serializers.FloatField()
    forward_expanded_operating_capacity = serializers.FloatField(required=False)
    reverse_expanded_operating_capacity = serializers.FloatField(required=False)
    datetime = serializers.DateTimeField()
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


class OcctoEventSerializer(serializers.Serializer):
    """
    Serializer for OCCTO system event data.

    Represents system events reported by OCCTO that may affect
    grid operations, such as emergency dispatch activations.
    """
    datetime = serializers.DateTimeField()
    area = serializers.CharField()
    description = serializers.CharField()
    value = serializers.FloatField()
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


# =============================================================================
# Grid Balancing Serializers
# =============================================================================

class TdgcSerializer(serializers.Serializer):
    """
    Serializer for TDGC (Tertiary Demand/Generation Control) data.

    Contains balancing market information including reserve
    requirements and contracted quantities for grid frequency control.
    """
    datetime = serializers.DateTimeField()
    Area = serializers.CharField()
    CorrectedUnitPriceAve = serializers.FloatField()
    CorrectedUnitPriceMax = serializers.FloatField()
    CorrectedUnitPriceMin = serializers.FloatField()
    InAreaQuantity = serializers.FloatField()
    OfferCount = serializers.IntegerField()
    OfferCountQuantityInTotal = serializers.FloatField()
    OfferIdCount = serializers.IntegerField()
    OfferIdCountQuantityInTotal = serializers.FloatField()
    ReserveRequirement = serializers.FloatField()
    TotalContractQuantity = serializers.FloatField()
    TsoPriceAve = serializers.FloatField()
    TsoPriceMax = serializers.FloatField()
    TsoPriceMin = serializers.FloatField()
    CommodityCategory = serializers.CharField()
    data_type = serializers.CharField(required=False)
    missing_flag = serializers.CharField(required=False)
    url = serializers.URLField(required=False)
    md5_id = serializers.CharField(required=False)


# =============================================================================
# External Data Serializers
# =============================================================================

class EarthquakeSerializer(serializers.Serializer):
    """
    Serializer for JMA earthquake data.

    Contains earthquake event information from Japan Meteorological
    Agency, useful for correlating with grid disturbances.
    """
    get_datetime = serializers.DateTimeField()
    event_datetime = serializers.DateTimeField()
    event_id = serializers.CharField(allow_null=True, required=False)
    event_date = serializers.DateField(required=False)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    location = serializers.DictField(required=False)
    magnitude = serializers.FloatField()
    max_intensity = serializers.IntegerField()
    depth = serializers.CharField()
    location_name = serializers.CharField()
    closest_region = serializers.CharField()
    closest_distance_km = serializers.FloatField(required=False)
    source = serializers.CharField(required=False)
    ingested_at = serializers.DateTimeField(required=False)
    distance_hokkaido_km = serializers.FloatField(required=False)
    distance_tohoku_km = serializers.FloatField(required=False)
    distance_tokyo_km = serializers.FloatField(required=False)
    distance_chubu_km = serializers.FloatField(required=False)
    distance_hokuriku_km = serializers.FloatField(required=False)
    distance_kansai_km = serializers.FloatField(required=False)
    distance_chugoku_km = serializers.FloatField(required=False)
    distance_shikoku_km = serializers.FloatField(required=False)
    distance_kyushu_km = serializers.FloatField(required=False)


class WeatherActualSerializer(serializers.Serializer):
    """
    Serializer for actual (observed) weather data.

    Contains weather observations that can be correlated with
    electricity demand and renewable generation patterns.
    """
    get_datetime = serializers.DateTimeField()
    weather_datetime = serializers.DateTimeField()
    region = serializers.CharField()
    area = serializers.CharField()
    city = serializers.CharField()
    temperature = serializers.FloatField(allow_null=True)
    rainfall = serializers.FloatField(allow_null=True)
    snowfall = serializers.FloatField(allow_null=True)
    wind_speed = serializers.FloatField(allow_null=True)
    wind_direction = serializers.CharField(allow_null=True)
    relative_humidity = serializers.FloatField(allow_null=True)
    weather_id = serializers.IntegerField()
    clouds_all = serializers.IntegerField(allow_null=True)
    source = serializers.CharField(required=False)
    ingested_at = serializers.DateTimeField(required=False)


class WeatherForecastSerializer(serializers.Serializer):
    """
    Serializer for weather forecast data.

    Contains predicted weather data used for electricity demand
    forecasting and renewable generation predictions.
    """
    get_datetime = serializers.DateTimeField()
    weather_datetime = serializers.DateTimeField()
    region = serializers.CharField()
    area = serializers.CharField()
    city = serializers.CharField()
    temperature = serializers.FloatField(allow_null=True)
    rainfall = serializers.FloatField(allow_null=True)
    snowfall = serializers.FloatField(allow_null=True)
    wind_speed = serializers.FloatField(allow_null=True)
    wind_direction = serializers.CharField(allow_null=True)
    relative_humidity = serializers.FloatField(allow_null=True)
    weather_id = serializers.IntegerField()
    clouds_all = serializers.IntegerField(allow_null=True)
    source = serializers.CharField(required=False)
    ingested_at = serializers.DateTimeField(required=False)
