/**
 * Bug 1: IMB資料tooltip問題 - Bug Condition Exploration Test
 * 
 * **Validates: Requirements 1.1, 1.2**
 * **Property 1: Fault Condition** - IMB Tooltip 未勾選仍顯示
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior:
 * - When showImbalanceQuantity, showImbalanceSurplusRate, and showImbalanceDeficitRate are all false
 * - The tooltip SHALL NOT display any IMB data
 * 
 * EXPECTED OUTCOME: Test FAILS on unfixed code (proves bug exists)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChartInfoPanel } from '../ChartInfoPanel';
import * as fc from 'fast-check';

describe('Bug 1: IMB Tooltip Display Bug - Exploration Test', () => {
  // Mock colors object
  const mockColors = {
    actual: '#1976d2',
    text: '#000000',
    subText: '#666666',
    tooltipBorder: '#e0e0e0',
    delta: {
      positive: '#4caf50',
      negative: '#f44336',
      neutral: '#9e9e9e'
    }
  };

  describe('Property 1: Fault Condition - IMB data should NOT display when all IMB options are unchecked', () => {
    /**
     * Test Case: When all IMB options are false, tooltip should NOT contain IMB data
     * 
     * This is a scoped property-based test that tests the concrete failing case:
     * - All IMB show flags are false
     * - hoveredData contains IMB values
     * - Expected: No IMB data should be rendered in the tooltip
     */
    it('should NOT display imbalance quantity when showImbalanceQuantity is false', () => {
      // Arrange: Create hoveredData with IMB data
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        imbalance: 1000, // IMB data present
        imbalance_surplus_rate: 5.5,
        imbalance_deficit_rate: 8.2
      };

      // Act: Render with showImbalance=true but individual flags false
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={true}
          showImbalanceQuantity={false}  // UNCHECKED
          showImbalanceSurplusRate={false}  // UNCHECKED
          showImbalanceDeficitRate={false}  // UNCHECKED
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: IMB data should NOT be present in the rendered output
      const text = container.textContent || '';

      // Check that IMB labels are NOT present
      expect(text).not.toContain('Imb');
      expect(text).not.toContain('不平衡量');

      // Check that IMB values are NOT present
      expect(text).not.toContain('1000');

      // EXPECTED: This assertion will FAIL on unfixed code because the bug causes
      // IMB data to display even when showImbalanceQuantity is false
    });

    it('should NOT display surplus rate when showImbalanceSurplusRate is false', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        imbalance: 1000,
        imbalance_surplus_rate: 5.5, // IMB surplus rate present
        imbalance_deficit_rate: 8.2
      };

      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={true}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}  // UNCHECKED
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert
      const text = container.textContent || '';
      expect(text).not.toContain('Surplus');
      expect(text).not.toContain('剩餘單價');
      expect(text).not.toContain('5.5');

      // EXPECTED: This will FAIL on unfixed code
    });

    it('should NOT display deficit rate when showImbalanceDeficitRate is false', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        imbalance: 1000,
        imbalance_surplus_rate: 5.5,
        imbalance_deficit_rate: 8.2 // IMB deficit rate present
      };

      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={true}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}  // UNCHECKED
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert
      const text = container.textContent || '';
      expect(text).not.toContain('Deficit');
      expect(text).not.toContain('不足單價');
      expect(text).not.toContain('8.2');

      // EXPECTED: This will FAIL on unfixed code
    });

    /**
     * Property-Based Test: For any IMB data values, when all show flags are false,
     * no IMB data should be displayed
     */
    it('property: should NOT display ANY IMB data when ALL IMB options are unchecked (property-based)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary IMB data values
          fc.record({
            imbalance: fc.option(fc.float({ min: -10000, max: 10000 }), { nil: null }),
            imbalance_surplus_rate: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            imbalance_deficit_rate: fc.option(fc.float({ min: 0, max: 100 }), { nil: null })
          }),
          (imbData) => {
            // Arrange: Create hoveredData with generated IMB values
            const hoveredData = {
              timestamp: new Date('2024-01-01T12:00:00Z'),
              actualPrice: 10.5,
              ...imbData
            };

            // Act: Render with all IMB flags false
            const { container } = render(
              <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={[]}
                colors={mockColors}
                areaName="Test Area"
                showImbalance={true}
                showImbalanceQuantity={false}  // ALL UNCHECKED
                showImbalanceSurplusRate={false}  // ALL UNCHECKED
                showImbalanceDeficitRate={false}  // ALL UNCHECKED
                showIntraday={false}
                selectedInterconnectionFields={new Set()}
                selectedBatteryFields={new Set()}
                selectedBidPlanFields={new Set()}
                selectedBidPlanCategories={new Set()}
                showOcctoArea={false}
                showWeather={false}
                showWeatherActual={false}
                showWeatherForecast={false}
                selectedOcctoFields={new Set()}
                selectedWeatherFieldsActual={new Set()}
                selectedWeatherFieldsForecast={new Set()}
                timezone="Asia/Tokyo"
                showRightAxisLabels={false}
                onToggleRightAxisLabels={() => { }}
              />
            );

            // Assert: No IMB-related text should be present
            const text = container.textContent || '';

            // Check for IMB labels
            const hasImbLabel = text.includes('Imb') || text.includes('不平衡量');
            const hasSurplusLabel = text.includes('Surplus') || text.includes('剩餘單價');
            const hasDeficitLabel = text.includes('Deficit') || text.includes('不足單價');

            // Property: When all IMB options are unchecked, no IMB labels should appear
            expect(hasImbLabel).toBe(false);
            expect(hasSurplusLabel).toBe(false);
            expect(hasDeficitLabel).toBe(false);

            // EXPECTED: This will FAIL on unfixed code, surfacing counterexamples
            // Counterexample format: { imbalance: X, imbalance_surplus_rate: Y, imbalance_deficit_rate: Z }
          }
        ),
        { numRuns: 50 } // Run 50 test cases with different IMB data values
      );
    });
  });

  describe('Documentation: Expected Counterexamples', () => {
    /**
     * This test documents the expected counterexamples that prove the bug exists.
     * 
     * When the above tests FAIL (as expected on unfixed code), they will surface
     * counterexamples like:
     * 
     * - Counterexample 1: tooltip shows "Imb: 1000kWh" even when showImbalanceQuantity is false
     * - Counterexample 2: tooltip shows "Surplus: 5.5¥" even when showImbalanceSurplusRate is false
     * - Counterexample 3: tooltip shows "Deficit: 8.2¥" even when showImbalanceDeficitRate is false
     * 
     * These counterexamples confirm that the bug exists: IMB data is displayed
     * even when the corresponding show flags are false.
     */
    it('documents expected bug behavior', () => {
      // This test always passes - it's just documentation
      expect(true).toBe(true);
    });
  });

  describe('Property 2: Preservation - Weather data tooltip displays correctly', () => {
    /**
     * Test Case: When weather options are checked, tooltip should display weather data
     * This verifies that the fix for IMB bug doesn't break weather data display
     */
    it('should display weather actual data when weather options are checked', () => {
      // Arrange: Create hoveredData with weather actual data
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        weather_data_actual: {
          temperature_2m: 15.5,
          precipitation: 2.3,
          wind_speed_10m: 5.2
        }
      };

      // Act: Render with weather enabled and fields selected
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={true}
          showWeatherActual={true}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set(['temperature_2m', 'precipitation', 'wind_speed_10m'])}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: Weather data should be present
      const text = container.textContent || '';

      // Check for weather labels (using abbreviated labels from component)
      expect(text).toContain('氣溫'); // Temperature label
      expect(text).toContain('降水'); // Rainfall label
      expect(text).toContain('風速'); // Wind speed label

      // Check for weather values (rounded to 0 decimals by default)
      expect(text).toContain('15.5'); // Temperature value (15.5)
      expect(text).toContain('2'); // Rainfall value (2.3 rounded down)
      expect(text).toContain('5.2'); // Wind speed value (5.2)

      // EXPECTED: This should PASS on unfixed code (weather display is not affected by IMB bug)
    });

    it('should display weather forecast data when forecast options are checked', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        weather_data_forecast: {
          temperature_2m: 18.2,
          cloud_cover: 75
        }
      };

      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={true}
          showWeatherActual={false}
          showWeatherForecast={true}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set(['temperature_2m', 'cloud_cover'])}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert
      const text = container.textContent || '';
      expect(text).toContain('氣溫'); // Temperature label
      expect(text).toContain('雲量'); // Cloud label
      expect(text).toContain('18.2'); // Temperature value (18.2)
      expect(text).toContain('75'); // Cloud value
      expect(text).toContain('(F)'); // Forecast indicator

      // EXPECTED: This should PASS on unfixed code
    });

    /**
     * Property-Based Test: For any weather data values, when weather options are checked,
     * weather data should be displayed correctly
     */
    it('property: should display weather data correctly for any weather values (property-based)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary weather data values
          fc.record({
            temperature: fc.option(fc.float({ min: -30, max: 50 }), { nil: null }),
            rainfall: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
            wind_speed: fc.option(fc.float({ min: 0, max: 50 }), { nil: null })
          }),
          (weatherData) => {
            // Map legacy property names genrated by fc.record to new property names
            const mappedWeatherData: Record<string, any> = {};
            if (weatherData.temperature !== null) mappedWeatherData.temperature_2m = weatherData.temperature;
            if (weatherData.rainfall !== null) mappedWeatherData.precipitation = weatherData.rainfall;
            if (weatherData.wind_speed !== null) mappedWeatherData.wind_speed_10m = weatherData.wind_speed;

            // Arrange
            const hoveredData = {
              timestamp: new Date('2024-01-01T12:00:00Z'),
              actualPrice: 10.5,
              weather_data_actual: mappedWeatherData
            };

            // Determine which fields have data
            const selectedFields = new Set<string>();
            if (weatherData.temperature != null) selectedFields.add('temperature_2m');
            if (weatherData.rainfall != null) selectedFields.add('precipitation');
            if (weatherData.wind_speed != null) selectedFields.add('wind_speed_10m');

            // Act
            const { container } = render(
              <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={[]}
                colors={mockColors}
                areaName="Test Area"
                showImbalance={false}
                showImbalanceQuantity={false}
                showImbalanceSurplusRate={false}
                showImbalanceDeficitRate={false}
                showIntraday={false}
                selectedInterconnectionFields={new Set()}
                selectedBatteryFields={new Set()}
                selectedBidPlanFields={new Set()}
                selectedBidPlanCategories={new Set()}
                showOcctoArea={false}
                showWeather={true}
                showWeatherActual={true}
                showWeatherForecast={false}
                selectedOcctoFields={new Set()}
                selectedWeatherFieldsActual={selectedFields}
                selectedWeatherFieldsForecast={new Set()}
                timezone="Asia/Tokyo"
                showRightAxisLabels={false}
                onToggleRightAxisLabels={() => { }}
              />
            );

            // Assert: Weather data should be present when fields are selected
            const text = container.textContent || '';

            if (weatherData.temperature != null) {
              expect(text).toContain('氣溫');
              expect(text).toContain(weatherData.temperature.toFixed(1));
            }
            if (weatherData.rainfall != null) {
              expect(text).toContain('降水');
              expect(text).toContain(weatherData.rainfall.toFixed(0));
            }
            if (weatherData.wind_speed != null) {
              expect(text).toContain('風速');
              expect(text).toContain(weatherData.wind_speed.toFixed(1));
            }

            // EXPECTED: This should PASS on unfixed code
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Preservation - OCCTO data tooltip displays correctly', () => {
    /**
     * Test Case: When OCCTO options are checked, tooltip should display OCCTO data
     */
    it('should display OCCTO data when OCCTO options are checked', () => {
      // Arrange: Create hoveredData with OCCTO data
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        occto_values: {
          area_demand: 5000,
          nuclear_power: 1200,
          solar_power_generation_actual: 800
        }
      };

      // Act: Render with OCCTO enabled and fields selected
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={true}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set(['area_demand', 'nuclear_power', 'solar_power_generation_actual'])}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: OCCTO data should be present
      const text = container.textContent || '';

      // Check for OCCTO labels
      expect(text).toContain('Demand'); // area_demand label
      expect(text).toContain('Nucl'); // nuclear_power label
      expect(text).toContain('Solar'); // solar label

      // Check for OCCTO values
      expect(text).toContain('5000'); // area_demand value
      expect(text).toContain('1200'); // nuclear_power value
      expect(text).toContain('800'); // solar value

      // EXPECTED: This should PASS on unfixed code
    });

    /**
     * Property-Based Test: For any OCCTO data values, when OCCTO options are checked,
     * OCCTO data should be displayed correctly
     */
    it('property: should display OCCTO data correctly for any OCCTO values (property-based)', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary OCCTO data values
          fc.record({
            area_demand: fc.option(fc.float({ min: 0, max: 10000 }), { nil: null }),
            nuclear_power: fc.option(fc.float({ min: 0, max: 5000 }), { nil: null }),
            thermal: fc.option(fc.float({ min: 0, max: 8000 }), { nil: null })
          }),
          (occtoData) => {
            // Arrange
            const hoveredData = {
              timestamp: new Date('2024-01-01T12:00:00Z'),
              actualPrice: 10.5,
              occto_values: occtoData
            };

            // Determine which fields have data
            const selectedFields = new Set<string>();
            if (occtoData.area_demand != null) selectedFields.add('area_demand');
            if (occtoData.nuclear_power != null) selectedFields.add('nuclear_power');
            if (occtoData.thermal != null) selectedFields.add('thermal');

            // Act
            const { container } = render(
              <ChartInfoPanel
                hoveredData={hoveredData}
                selectedModels={[]}
                colors={mockColors}
                areaName="Test Area"
                showImbalance={false}
                showImbalanceQuantity={false}
                showImbalanceSurplusRate={false}
                showImbalanceDeficitRate={false}
                showIntraday={false}
                selectedInterconnectionFields={new Set()}
                selectedBatteryFields={new Set()}
                selectedBidPlanFields={new Set()}
                selectedBidPlanCategories={new Set()}
                showOcctoArea={true}
                showWeather={false}
                showWeatherActual={false}
                showWeatherForecast={false}
                selectedOcctoFields={selectedFields}
                selectedWeatherFieldsActual={new Set()}
                selectedWeatherFieldsForecast={new Set()}
                timezone="Asia/Tokyo"
                showRightAxisLabels={false}
                onToggleRightAxisLabels={() => { }}
              />
            );

            // Assert: OCCTO data should be present when fields are selected
            const text = container.textContent || '';

            if (occtoData.area_demand != null) {
              expect(text).toContain('Demand');
              expect(text).toContain(occtoData.area_demand.toFixed(0));
            }
            if (occtoData.nuclear_power != null) {
              expect(text).toContain('Nucl');
              expect(text).toContain(occtoData.nuclear_power.toFixed(0));
            }
            if (occtoData.thermal != null) {
              expect(text).toContain('Therm');
              expect(text).toContain(occtoData.thermal.toFixed(0));
            }

            // EXPECTED: This should PASS on unfixed code
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Preservation - Basic tooltip functionality works correctly', () => {
    /**
     * Test Case: Tooltip should display time and price correctly
     */
    it('should display timestamp and actual price correctly', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-15T14:30:00Z'),
        actualPrice: 25.75,
        actualDelta: 2.5
      };

      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Tokyo Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: Basic tooltip info should be present
      const text = container.textContent || '';

      // Check for area name
      expect(text).toContain('Tokyo Area');

      // Check for price
      expect(text).toContain('¥25.75');

      // Check for delta
      expect(text).toContain('+2.5');

      // Check for "Obs" label (Observation)
      expect(text).toContain('Obs');

      // EXPECTED: This should PASS on unfixed code
    });

    /**
     * Test Case: Tooltip should display model predictions correctly
     */
    it('should display model predictions when models are selected', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-15T14:30:00Z'),
        actualPrice: 25.75,
        modelPredictions: [
          { modelId: 1, modelName: 'Model A', predictedPrice: 26.5 },
          { modelId: 2, modelName: 'Model B', predictedPrice: 24.8 }
        ],
        modelDifferences: {
          '1|Model A': 0.75,
          '2|Model B': -0.95
        }
      };

      const selectedModels = [
        { id: 1, name: 'Model A', color: '#ff6b6b' },
        { id: 2, name: 'Model B', color: '#4ecdc4' }
      ];

      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={selectedModels}
          colors={mockColors}
          areaName="Tokyo Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: Model predictions should be present
      const text = container.textContent || '';

      expect(text).toContain('Model A');
      expect(text).toContain('¥26.5');
      expect(text).toContain('+0.75');

      expect(text).toContain('Model B');
      expect(text).toContain('¥24.8');
      expect(text).toContain('-0.95');

      // EXPECTED: This should PASS on unfixed code
    });

    /**
     * Test Case: Tooltip should show placeholder when no data is hovered
     */
    it('should display placeholder message when hoveredData is null', () => {
      // Act
      const { container } = render(
        <ChartInfoPanel
          hoveredData={null}
          selectedModels={[]}
          colors={mockColors}
          areaName="Tokyo Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert: Placeholder message should be present
      const text = container.textContent || '';
      expect(text).toContain('HOVER FOR DETAILS');

      // EXPECTED: This should PASS on unfixed code
    });
  });

  describe('Property 2: Preservation - Tooltip updates immediately when options change', () => {
    /**
     * Test Case: When weather options change, tooltip content should reflect the change
     */
    it('should update tooltip content when weather field selection changes', () => {
      // Arrange: Same hoveredData, different field selections
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        weather_data_actual: {
          temperature_2m: 15.5,
          precipitation: 2.3,
          wind_speed_10m: 5.2
        }
      };

      // Act 1: Render with only temperature selected
      const { container: container1 } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={true}
          showWeatherActual={true}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set(['temperature_2m'])}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert 1: Only temperature should be present
      const text1 = container1.textContent || '';
      expect(text1).toContain('氣溫');
      expect(text1).toContain('15.5');
      expect(text1).not.toContain('降水');
      expect(text1).not.toContain('風速');

      // Act 2: Render with all fields selected
      const { container: container2 } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={true}
          showWeatherActual={true}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set(['temperature_2m', 'precipitation', 'wind_speed_10m'])}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert 2: All fields should be present
      const text2 = container2.textContent || '';
      expect(text2).toContain('氣溫');
      expect(text2).toContain('15.5');
      expect(text2).toContain('降水');
      expect(text2).toContain('2'); // 2.3 rounded down to 2
      expect(text2).toContain('風速');
      expect(text2).toContain('5.2');

      // EXPECTED: This should PASS on unfixed code
    });

    /**
     * Test Case: Intraday data should display when showIntraday is true
     */
    it('should display intraday data when showIntraday changes to true', () => {
      // Arrange
      const hoveredData = {
        timestamp: new Date('2024-01-01T12:00:00Z'),
        actualPrice: 10.5,
        intraday_average: 11.2
      };

      // Act 1: Render with showIntraday=false
      const { container: container1 } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={false}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert 1: Intraday should NOT be present
      const text1 = container1.textContent || '';
      expect(text1).not.toContain('Intra');
      expect(text1).not.toContain('11.2');

      // Act 2: Render with showIntraday=true
      const { container: container2 } = render(
        <ChartInfoPanel
          hoveredData={hoveredData}
          selectedModels={[]}
          colors={mockColors}
          areaName="Test Area"
          showImbalance={false}
          showImbalanceQuantity={false}
          showImbalanceSurplusRate={false}
          showImbalanceDeficitRate={false}
          showIntraday={true}
          selectedInterconnectionFields={new Set()}
          selectedBatteryFields={new Set()}
          selectedBidPlanFields={new Set()}
          selectedBidPlanCategories={new Set()}
          showOcctoArea={false}
          showWeather={false}
          showWeatherActual={false}
          showWeatherForecast={false}
          selectedOcctoFields={new Set()}
          selectedWeatherFieldsActual={new Set()}
          selectedWeatherFieldsForecast={new Set()}
          timezone="Asia/Tokyo"
          showRightAxisLabels={false}
          onToggleRightAxisLabels={() => { }}
        />
      );

      // Assert 2: Intraday should be present
      const text2 = container2.textContent || '';
      expect(text2).toContain('Intra');
      expect(text2).toContain('11'); // 11.2 rounded

      // EXPECTED: This should PASS on unfixed code
    });
  });

  describe('Documentation: Preservation Requirements', () => {
    /**
     * This test documents the preservation requirements for Bug 1 fix.
     * 
     * The fix for IMB tooltip bug MUST NOT affect:
     * 1. Weather data display (actual and forecast)
     * 2. OCCTO data display
     * 3. Interconnection data display
     * 4. Battery data display
     * 5. Intraday data display
     * 6. Basic tooltip functionality (time, price, model predictions)
     * 7. Immediate updates when data source options change
     * 
     * All the above tests verify these behaviors work correctly on UNFIXED code.
     * After the fix is implemented, these same tests must continue to pass.
     */
    it('documents preservation requirements', () => {
      // This test always passes - it's just documentation
      expect(true).toBe(true);
    });
  });
});
