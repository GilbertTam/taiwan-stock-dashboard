# Forecast Chart Y-Axis Module

## Overview

This module implements dual Y-axis independent control for the forecast chart, addressing the limitation of the lightweight-charts library which only supports native drag/zoom for one axis.

## Architecture

The solution uses a hybrid interaction model:
- **Primary Axis (Y1/Right)**: Native drag and zoom interactions via lightweight-charts
- **Secondary Axis (Y2/Left)**: Precise control via sidebar input fields using `chart.priceScale('left').setVisibleRange()` API

## Directory Structure

```
src/components/forecast-chart/y-axis/
├── types.ts              # Core TypeScript interfaces
├── index.ts              # Module exports
├── __tests__/            # Test files
│   └── types.test.ts     # Type validation tests
└── README.md             # This file
```

## Core Interfaces

### YAxisRange
Represents the visible range for a Y-axis:
```typescript
interface YAxisRange {
  min: number;
  max: number;
}
```

### AxisType
Defines which Y-axis is being referenced:
```typescript
type AxisType = 'primary' | 'secondary';
```

### YAxisConfig
Complete configuration for both Y-axes:
```typescript
interface YAxisConfig {
  primary: YAxisRange | null;   // null = auto-range
  secondary: YAxisRange | null;  // null = auto-range
}
```

### ValidationResult
Result of input validation:
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

## Testing

This module uses **fast-check** for property-based testing to ensure correctness across a wide range of inputs.

Run tests:
```bash
npm test -- src/components/forecast-chart/y-axis/__tests__/types.test.ts
```

## Requirements Mapping

This module addresses the following requirements from the spec:
- **Requirement 1.1**: Primary axis native drag/zoom functionality
- **Requirement 2.1**: Secondary axis input field controls
- **Requirement 3.1**: Data source assignment to Y-axes

## Next Steps

Future tasks will implement:
1. Validation logic for Y-axis range inputs
2. Y-axis controller for state management
3. Secondary axis UI controls component
4. Data source assignment functionality
5. Persistence layer for Y-axis configuration
