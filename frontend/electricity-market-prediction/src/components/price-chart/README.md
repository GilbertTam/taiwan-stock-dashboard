# Chart Feature (Price & Weather)

Core feature for visualizing electricity price data, predictions, and weather time series using TradingView Lightweight Charts.

## Structure
- `components/`: UI components (ChartLightweight, controls, legend).
- `context/`: State management (PriceChartContext).
- `hooks/`: Custom hooks for data transform, series, crosshair, lifecycle.
- `plugins/`: Lightweight Charts plugins and extensions.
- `types/`: Type definitions and interfaces.
- `utils/`: Helper functions for export and transforms.
- `constants.ts`: Configuration constants.
- `index.ts`: Public API exports.

## Key Components
- `ChartLightweight`: Shared chart implementation (Lightweight Charts). Used for forecast/site-revenue (price) and weather page; data and options come from `PriceChartProvider`.
- `PriceChart` (deprecated alias): Use `ChartLightweight` instead.
