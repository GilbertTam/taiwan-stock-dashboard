/**
 * @fileoverview Grid Operations Types
 *
 * Types for imbalance, outages, interconnection, intraday, and OCCTO data.
 */

/**
 * Grid imbalance data (supply vs demand gap).
 */
export interface ImbalanceData {
    /** Timestamp (ISO format) */
    datetime: string;
    /** Area name */
    area: string;
    /** Imbalance quantity (kWh) */
    imbalance_quantity?: number | null;
    /** Surplus imbalance rate (yen/kWh) */
    imbalance_surplus_rate?: number | null;
    /** Deficit imbalance rate (yen/kWh) */
    imbalance_deficit_rate?: number | null;
    /** Direction */
    dir?: string;
    /** Source */
    source?: string;
    /** Dataset */
    dataset?: string;
    /** URL */
    url?: string;
    /** MD5 ID */
    md5_id?: string;
}

/**
 * HJKS power plant outage information.
 */
export interface HjksOutage {
    /** Unique identifier */
    id: number;
    /** Area where plant is located */
    area: string;
    /** Operating company name */
    company: string;
    /** Plant code */
    plantcd: string;
    /** Plant name */
    name: string;
    /** Generation format/type */
    format: string;
    /** Unit code within plant */
    unitcd: string;
    /** Unit name */
    unit_name: string;
    /** Maximum generation capacity (MW) */
    max_capacity: number;
    /** Stop category (planned/unplanned) */
    stop_category: string;
    /** Stop type */
    stop_type: string;
    /** Outage start time (ISO) */
    start_datetime: string;
    /** Expected end outlook */
    outlook: string;
    /** Expected end time (ISO) */
    end_datetime: string;
    /** Outage reason/factor */
    factor: string;
    /** Last update time (ISO) */
    upddt: string;
    /** Capacity reduction (MW), null if unknown */
    down_capacity: number | null;
}

/**
 * Interconnection line flow data.
 */
export interface InterconnectionFlow {
    /** Timestamp (ISO format) */
    datetime: string;
    /** Name of interconnection line */
    interconnection_name: string;
    /** Forward direction operating capacity (MW) */
    forward_operating_capacity: number;
    /** Reverse direction operating capacity (MW) */
    reverse_operating_capacity: number;
    /** Forward direction margin (MW) */
    forward_margin: number;
    /** Reverse direction margin (MW) */
    reverse_margin: number;
    /** Forward planned flow (MW) */
    forward_planned_flow: number;
    /** Reverse planned flow (MW) */
    reverse_planned_flow: number;
    /** Forward available capacity (MW) */
    forward_available_capacity: number;
    /** Reverse available capacity (MW) */
    reverse_available_capacity: number;
    /** Moving supply capacity (MW) */
    moving_supply_capacity: number;
    /** Forward capacity after movement (MW) */
    forward_available_capacity_after_movement: number;
    /** Reverse capacity after movement (MW) */
    reverse_available_capacity_after_movement: number;
    /** Forward disconnection info */
    forward_disconnection_information: string;
    /** Reverse disconnection info */
    reverse_disconnection_information: string;
}

/**
 * JEPX intraday market trading data.
 */
export interface IntradayData {
    /** Trading date */
    date: string;
    /** 30-minute interval code (1-48) */
    time_code: number;
    /** Opening price (yen/kWh) */
    opening_price: number;
    /** Highest price (yen/kWh) */
    high_price: number;
    /** Lowest price (yen/kWh) */
    low_price: number;
    /** Closing price (yen/kWh) */
    closing_price: number;
    /** Volume-weighted average price (yen/kWh) */
    average_price: number;
    /** Total contracted volume (kWh) */
    total_contracted_volume: number;
    /** Number of contracts executed */
    contract_count: number;
    /** Full datetime (ISO format) */
    datetime: string;
}

/**
 * OCCTO area supply/demand data.
 */
export interface OcctoAreaData {
    /** Timestamp (ISO format) */
    datetime: string;
    /** Area name */
    area: string;
    /** Total area demand (MW) */
    area_demand: number;
    /** Nuclear generation (MW) */
    nuclear_power: number;
    /** Thermal generation (MW) */
    thermal: number;
    /** Hydropower generation (MW) */
    hydropower: number;
    /** Geothermal generation (MW) */
    geothermal_power: number;
    /** Biomass generation (MW) */
    biomass: number;
    /** Solar actual generation (MW) */
    solar_power_generation_actual: number;
    /** Solar output control/curtailment (MW) */
    solar_power_output_control: number;
    /** Wind actual generation (MW) */
    wind_power_generation_actual: number;
    /** Wind output control/curtailment (MW) */
    wind_power_output_control: number;
    /** Pumped storage (MW, negative = pumping) */
    pumped_storage: number;
    /** Battery storage (MW) */
    battery_storage: number;
    /** Net interconnection flow (MW) */
    interconnection_line: number;
    /** Other generation sources (MW) */
    others: number;
    /** Total generation (MW) */
    total: number;
}

/**
 * OCCTO interconnection line data.
 */
export interface OcctoInterconnection {
    /** Timestamp (ISO format) */
    datetime: string;
    /** Interconnection line name */
    interconnection_name: string;
    /** Forward operating capacity (MW) */
    forward_operating_capacity: number;
    /** Reverse operating capacity (MW) */
    reverse_operating_capacity: number;
    /** Forward planned flow (MW) */
    forward_planned_flow: number;
    /** Reverse planned flow (MW) */
    reverse_planned_flow: number;
    /** Actual measured flow (MW) */
    actual_flow: number;
    /** Forward wide-area adjustment capacity (MW) */
    forward_wide_area_adjustment_capacity: number;
    /** Reverse wide-area adjustment capacity (MW) */
    reverse_wide_area_adjustment_capacity: number;
    /** Forward margin (MW) */
    forward_margin: number;
    /** Reverse margin (MW) */
    reverse_margin: number;
    /** Forward available capacity (MW) */
    forward_available_capacity: number;
    /** Reverse available capacity (MW) */
    reverse_available_capacity: number;
}

/**
 * OCCTO system event data.
 */
export interface OcctoEvent {
    /** Event timestamp (ISO format) */
    datetime: string;
    /** Affected area */
    area: string;
    /** Event description */
    description: string;
    /** Associated value (context-dependent) */
    value: number;
}

/**
 * Battery data (eflow): spot/intraday/primary values, SOC, charge/discharge.
 * Negative = charge, positive = discharge.
 */
export interface BatteryData {
    /** Data time (ISO format) */
    event_time: string;
    /** Site ID (e.g. Helios) */
    site_id?: string;
    /** Crawl time */
    crawl_time?: string;
    /** Source (eflow) */
    source?: string;
    /** Dataset (battery_data) */
    dataset?: string;
    /** Spot power: negative=charge, positive=discharge (kW or kWh) */
    spot_value?: number | null;
    spot_direction?: string | null;
    /** Intraday power */
    intraday_value?: number | null;
    intraday_direction?: string | null;
    /** Primary adjustment power */
    primary_value?: number | null;
    primary_direction?: string | null;
    spot_charge_volume?: number | null;
    spot_discharge_volume?: number | null;
    intraday_charge_volume?: number | null;
    intraday_discharge_volume?: number | null;
    primary_charge_volume?: number | null;
    primary_discharge_volume?: number | null;
    /** Virtual SOC (kWh) */
    soc_kwh?: number | null;
    /** Charge/discharge plan */
    charge_discharge_plan?: number | null;
    /** Actual SOC (kWh) */
    actual_soc_kwh?: number | null;
    /** Actual SOC (%) */
    actual_soc_per?: number | null;
    md5_id?: string;
}

/**
 * TDGC (Tertiary Demand/Generation Control) balancing market data.
 */
export interface TdgcData {
    /** Timestamp (ISO format) */
    datetime: string;
    /** Area name */
    Area: string;
    /** Corrected unit price average (yen/kWh) */
    CorrectedUnitPriceAve: number;
    /** Corrected unit price maximum (yen/kWh) */
    CorrectedUnitPriceMax: number;
    /** Corrected unit price minimum (yen/kWh) */
    CorrectedUnitPriceMin: number;
    /** In-area quantity (kWh) */
    InAreaQuantity: number;
    /** Number of offers */
    OfferCount: number;
    /** Total offer quantity (kWh) */
    OfferCountQuantityInTotal: number;
    /** Number of unique offer IDs */
    OfferIdCount: number;
    /** Total quantity by offer ID (kWh) */
    OfferIdCountQuantityInTotal: number;
    /** Reserve requirement (kWh) */
    ReserveRequirement: number;
    /** Total contracted quantity (kWh) */
    TotalContractQuantity: number;
    /** TSO price average (yen/kWh) */
    TsoPriceAve: number;
    /** TSO price maximum (yen/kWh) */
    TsoPriceMax: number;
    /** TSO price minimum (yen/kWh) */
    TsoPriceMin: number;
    /** Commodity category identifier */
    CommodityCategory: string;
}
