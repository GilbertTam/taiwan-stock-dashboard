import { IChartApi, ISeriesApi, SeriesType } from 'lightweight-charts';
import { AxisType } from './types';

export interface DataSourceAxisMapping {
    dataSourceId: string;
    axis: AxisType;
}

/**
 * DataSourceAxisAssigner
 * 
 * Manages the assignment of data sources (series) to primary or secondary Y-axes.
 */
export class DataSourceAxisAssigner {
    private mappings: Map<string, AxisType>;
    private chart: IChartApi;

    constructor(chart: IChartApi, initialMappings?: DataSourceAxisMapping[]) {
        this.chart = chart;
        this.mappings = new Map();

        if (initialMappings) {
            initialMappings.forEach(m => this.mappings.set(m.dataSourceId, m.axis));
        }
    }

    /**
     * Assigns a data source to a specific axis.
     * Note: This only records the mapping but does not automatically
     * call the chart properties unless updateSeriesAxis is explicitly called 
     * (or if we merge the logic). For encapsulation, let's keep it separate
     * or do it in updateSeriesAxis.
     */
    assignToAxis(dataSourceId: string, axis: AxisType): void {
        this.mappings.set(dataSourceId, axis);
    }

    /**
     * Gets the assigned axis for a specific data source.
     * Defaults to 'primary' if not previously assigned.
     */
    getAxisForDataSource(dataSourceId: string): AxisType {
        return this.mappings.get(dataSourceId) || 'primary';
    }

    /**
     * Gets all data sources assigned to a specific axis.
     */
    getDataSourcesForAxis(axis: AxisType): string[] {
        const sources: string[] = [];
        this.mappings.forEach((mappedAxis, dataSourceId) => {
            if (mappedAxis === axis) {
                sources.push(dataSourceId);
            }
        });
        return sources;
    }

    /**
     * Updates the series options in the chart to use the assigned price scale.
     * 
     * NOTE: With lightweight-charts, there is no generic `chart.getSeries(id)`. 
     * Because of this restriction we typically handle series updates through our React 
     * wrapper or we pass the specific series instance to `updateSeriesAxis`.
     * For simplicity in testing/architecture, we can pass the series instance.
     */
    updateSeriesAxis(series: ISeriesApi<SeriesType>, axis: AxisType): void {
        const priceScaleId = axis === 'primary' ? 'right' : 'left';
        series.applyOptions({ priceScaleId });
    }

    /**
     * Helper to set it via ID if we maintain a registry of series.
     * (If the user context manages series externally, the component will use updateSeriesAxis directly).
     */

    exportMappings(): DataSourceAxisMapping[] {
        const exported: DataSourceAxisMapping[] = [];
        this.mappings.forEach((axis, dataSourceId) => {
            exported.push({ dataSourceId, axis });
        });
        return exported;
    }

    importMappings(mappings: DataSourceAxisMapping[]): void {
        mappings.forEach(m => this.mappings.set(m.dataSourceId, m.axis));
    }
}
