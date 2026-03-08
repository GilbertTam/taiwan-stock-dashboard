/**
 * Bug Condition Exploration Test for Site Revenue Page
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * **Property 1: Fault Condition** - Automatic Simulation Execution
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate the bugs exist
 * 
 * This test uses a scoped PBT approach to verify concrete failing cases:
 * - Model selection: Select Model A, then select Model B → simulation should auto-run (will fail - requires manual click)
 * - Initial page load: Navigate to page with valid data → simulation should auto-run (will fail - shows empty state)
 * - Date/area change: Change date range → simulation should auto-run after data loads (will fail - requires manual click)
 */

import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Site Revenue Page Bug Condition Exploration', () => {
  describe('Property 1: Fault Condition - Automatic Simulation Execution', () => {
    
    /**
     * Bug 1: Model Selection Does Not Auto-Run Simulation
     * Requirement 2.1: System SHALL automatically execute simulation when user selects a model
     * 
     * Expected to FAIL: Auto-run useEffect depends on selectedModels.length, not selectedModels array
     * When user changes from Model A to Model B, length stays the same, so effect doesn't trigger
     */
    test('should depend on selectedModels array (not just length) in auto-run useEffect (EXPECTED TO FAIL)', () => {
      // Read the SiteRevenuePage source code
      const siteRevenuePagePath = path.join(__dirname, '../page.tsx');
      const siteRevenuePageSource = fs.readFileSync(siteRevenuePagePath, 'utf-8');
      
      // Find the auto-run useEffect (around line 96-104)
      // Look for the effect that checks initialSimulationRun.current and calls handleCalculate
      const autoRunEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(initialSimulationRun\.current\) return;[\s\S]*?handleCalculate\(\);[\s\S]*?\}, \[(.*?)\]\);/;
      const autoRunEffectMatch = siteRevenuePageSource.match(autoRunEffectPattern);
      
      expect(autoRunEffectMatch).toBeTruthy();
      
      if (autoRunEffectMatch) {
        const dependencies = autoRunEffectMatch[1];
        
        // Check if it depends on selectedModels (full array) or a serialized key
        const dependsOnFullArray = 
          dependencies.includes('selectedModels,') || 
          dependencies.includes('selectedModelsKey') ||
          dependencies.includes('JSON.stringify(selectedModels');
        
        // Check if it incorrectly depends on just the length
        const dependsOnLengthOnly = 
          dependencies.includes('selectedModels.length') && 
          !dependsOnFullArray;
        
        // EXPECTED TO FAIL: Currently depends on selectedModels.length only
        // After fix, should depend on full array or serialized key
        expect(dependsOnFullArray).toBe(true);
        expect(dependsOnLengthOnly).toBe(false);
      }
    });

    /**
     * Bug 2: Initial Page Load Does Not Auto-Run Simulation
     * Requirement 2.2: System SHALL automatically execute simulation on initial page load with valid data
     * 
     * Expected to FAIL: Auto-run useEffect may have race conditions or missing conditions
     * Should check for !isDataLoading to ensure data is ready before running
     */
    test('should check for data loading completion in auto-run useEffect (EXPECTED TO FAIL)', () => {
      // Read the SiteRevenuePage source code
      const siteRevenuePagePath = path.join(__dirname, '../page.tsx');
      const siteRevenuePageSource = fs.readFileSync(siteRevenuePagePath, 'utf-8');
      
      // Find the auto-run useEffect
      const autoRunEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(initialSimulationRun\.current\) return;[\s\S]*?handleCalculate\(\);[\s\S]*?\}, \[(.*?)\]\);/;
      const autoRunEffectMatch = siteRevenuePageSource.match(autoRunEffectPattern);
      
      expect(autoRunEffectMatch).toBeTruthy();
      
      if (autoRunEffectMatch) {
        const effectBody = autoRunEffectMatch[0];
        const dependencies = autoRunEffectMatch[1];
        
        // Check if effect checks for data loading completion
        const checksDataLoading = 
          effectBody.includes('!isDataLoading') || 
          effectBody.includes('isDataLoading === false');
        
        // Check if isDataLoading is in dependencies
        const hasDataLoadingDependency = dependencies.includes('isDataLoading');
        
        // EXPECTED TO FAIL: Current implementation doesn't check for data loading completion
        // After fix, should check !isDataLoading before running simulation
        expect(checksDataLoading).toBe(true);
        expect(hasDataLoadingDependency).toBe(true);
      }
    });

    /**
     * Bug 3: Date/Area Changes Don't Auto-Run Simulation
     * Requirement 2.3: System SHALL automatically execute simulation after date/area changes reload data
     * 
     * Expected to FAIL: The clearing useEffect resets initialSimulationRun.current = false,
     * but the auto-run effect doesn't re-trigger because dependencies don't change appropriately
     */
    test('should have mechanism to trigger auto-run after data changes (EXPECTED TO FAIL)', () => {
      // Read the SiteRevenuePage source code
      const siteRevenuePagePath = path.join(__dirname, '../page.tsx');
      const siteRevenuePageSource = fs.readFileSync(siteRevenuePagePath, 'utf-8');
      
      // Find the clearing useEffect (around line 88-94)
      const clearingEffectPattern = /useEffect\(\(\) => \{[\s\S]*?setActualResult\(null\);[\s\S]*?initialSimulationRun\.current = false;[\s\S]*?\}, \[(.*?)\]\);/;
      const clearingEffectMatch = siteRevenuePageSource.match(clearingEffectPattern);
      
      expect(clearingEffectMatch).toBeTruthy();
      
      if (clearingEffectMatch) {
        const clearingDeps = clearingEffectMatch[1];
        
        // The clearing effect depends on chartData.length and selectedModels.length
        // This means when date/area changes, chartData changes, clearing runs, and sets flag to false
        
        // Now check if auto-run effect can detect this change
        const autoRunEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(initialSimulationRun\.current\) return;[\s\S]*?handleCalculate\(\);[\s\S]*?\}, \[(.*?)\]\);/;
        const autoRunEffectMatch = siteRevenuePageSource.match(autoRunEffectPattern);
        
        if (autoRunEffectMatch) {
          const autoRunDeps = autoRunEffectMatch[1];
          
          // Auto-run should depend on chartData (full array) to detect changes
          // Currently it depends on chartData, which should work
          // But it also needs to properly handle the selectedModels dependency
          
          const dependsOnChartData = autoRunDeps.includes('chartData');
          
          // Check if there's a separate model change handler
          const hasModelChangeHandler = siteRevenuePageSource.includes(
            'useEffect(() => {' + 
            '  // Only trigger if we had previous results'
          ) || siteRevenuePageSource.match(
            /useEffect\(\(\) => \{[\s\S]*?ganttData[\s\S]*?selectedModels[\s\S]*?handleCalculate/
          );
          
          // EXPECTED TO FAIL: No explicit model change handler exists
          // After fix, should have explicit handler or improved dependencies
          expect(hasModelChangeHandler).toBeTruthy();
        }
      }
    });

    /**
     * Property-Based Test: Verify bug conditions across multiple scenarios
     * 
     * This test generates random user interactions and verifies that the bugs exist
     * in the current implementation across different scenarios.
     */
    test('PBT: Verify bug conditions exist in current implementation (EXPECTED TO FAIL)', () => {
      fc.assert(
        fc.property(
          // Generate random model selection scenarios
          fc.record({
            initialModelCount: fc.integer({ min: 1, max: 3 }),
            changedModelCount: fc.integer({ min: 1, max: 3 }),
            hasValidData: fc.boolean(),
            isDataLoading: fc.boolean()
          }),
          (scenario) => {
            // Read the source code
            const siteRevenuePagePath = path.join(__dirname, '../page.tsx');
            const siteRevenuePageSource = fs.readFileSync(siteRevenuePagePath, 'utf-8');
            
            // Extract auto-run useEffect dependencies
            const autoRunEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(initialSimulationRun\.current\) return;[\s\S]*?handleCalculate\(\);[\s\S]*?\}, \[(.*?)\]\);/;
            const autoRunEffectMatch = siteRevenuePageSource.match(autoRunEffectPattern);
            
            if (autoRunEffectMatch) {
              const dependencies = autoRunEffectMatch[1];
              
              // Bug 1: When model count stays the same (e.g., 1 → 1), effect won't trigger
              if (scenario.initialModelCount === scenario.changedModelCount) {
                const dependsOnLengthOnly = 
                  dependencies.includes('selectedModels.length') && 
                  !dependencies.includes('selectedModelsKey') &&
                  !dependencies.includes('JSON.stringify(selectedModels');
                
                // EXPECTED TO FAIL: Depends on length only, so won't detect model changes
                // when count stays the same
                expect(dependsOnLengthOnly).toBe(false);
              }
              
              // Bug 2: Initial load should check for data loading completion
              if (scenario.hasValidData && !scenario.isDataLoading) {
                const effectBody = autoRunEffectMatch[0];
                const checksDataLoading = 
                  effectBody.includes('!isDataLoading') || 
                  effectBody.includes('isDataLoading === false');
                
                // EXPECTED TO FAIL: Doesn't check for data loading completion
                expect(checksDataLoading).toBe(true);
              }
            }
          }
        ),
        { numRuns: 20 } // Run 20 times with different scenarios
      );
    });

    /**
     * Integration Test: Verify the complete bug scenario
     * 
     * This test verifies the end-to-end bug behavior by checking the code structure
     * that leads to the bugs.
     */
    test('Integration: Verify bug conditions in code structure (EXPECTED TO FAIL)', () => {
      // Read the SiteRevenuePage source code
      const siteRevenuePagePath = path.join(__dirname, '../page.tsx');
      const siteRevenuePageSource = fs.readFileSync(siteRevenuePagePath, 'utf-8');
      
      // Check 1: Auto-run useEffect should use serialized selectedModels key
      const hasSerializedKey = 
        siteRevenuePageSource.includes('selectedModelsKey') ||
        siteRevenuePageSource.includes('JSON.stringify(selectedModels');
      
      // Check 2: Auto-run useEffect should check for data loading completion
      const autoRunEffectPattern = /useEffect\(\(\) => \{[\s\S]*?if \(initialSimulationRun\.current\) return;[\s\S]*?handleCalculate\(\);[\s\S]*?\}/;
      const autoRunEffectMatch = siteRevenuePageSource.match(autoRunEffectPattern);
      
      let checksDataLoading = false;
      if (autoRunEffectMatch) {
        const effectBody = autoRunEffectMatch[0];
        checksDataLoading = 
          effectBody.includes('!isDataLoading') || 
          effectBody.includes('isDataLoading === false');
      }
      
      // Check 3: Should have explicit model change handler or improved dependencies
      const hasModelChangeHandler = 
        siteRevenuePageSource.match(
          /useEffect\(\(\) => \{[\s\S]*?ganttData[\s\S]*?selectedModels[\s\S]*?handleCalculate/
        ) !== null;
      
      // EXPECTED TO FAIL: All three checks should fail on unfixed code
      expect(hasSerializedKey).toBe(true);
      expect(checksDataLoading).toBe(true);
      expect(hasModelChangeHandler).toBe(true);
    });
  });
});
