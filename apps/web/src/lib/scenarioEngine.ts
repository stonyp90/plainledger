/**
 * Scenario Simulation Engine
 * 
 * Handles scenario comparison, simulation, and what-if analysis
 */

import {
  Scenario,
  Initiative,
  Assumption,
  CashForecast,
  RunwayAnalysis,
  calculateCashForecast,
  calculateRunwayAnalysis,
} from './strategicPlanning';

// =====================================================
// SCENARIO COMPARISON
// =====================================================

export interface ScenarioComparison {
  scenarios: Array<{
    scenario: Scenario;
    runway: RunwayAnalysis;
    forecast: CashForecast;
  }>;
  differences: Array<{
    metric: string;
    base: number;
    compared: number;
    variance: number;
    variancePercent: number;
  }>;
}

/**
 * Compare multiple scenarios
 */
export function compareScenarios(
  scenarios: Scenario[],
  currentCash: number,
  currentDate: Date,
  historicalCash?: Array<{ date: string; cash: number }>
): ScenarioComparison {
  const results = scenarios.map(scenario => {
    const runway = calculateRunwayAnalysis(
      currentCash,
      currentDate,
      scenario.initiatives,
      scenario.assumptions,
      historicalCash
    );
    
    const forecast = calculateCashForecast(
      currentCash,
      currentDate,
      scenario.initiatives,
      scenario.assumptions,
      24
    );
    
    return {
      scenario,
      runway,
      forecast,
    };
  });
  
  // Find base scenario
  const baseScenario = scenarios.find(s => s.type === 'base') || scenarios[0];
  const baseResult = results.find(r => r.scenario.id === baseScenario.id) || results[0];
  
  // Calculate differences
  const differences = results
    .filter(r => r.scenario.id !== baseScenario.id)
    .map(compared => ({
      metric: 'Runway (months)',
      base: baseResult.runway.runwayMonths,
      compared: compared.runway.runwayMonths,
      variance: compared.runway.runwayMonths - baseResult.runway.runwayMonths,
      variancePercent: baseResult.runway.runwayMonths > 0
        ? ((compared.runway.runwayMonths - baseResult.runway.runwayMonths) / baseResult.runway.runwayMonths) * 100
        : 0,
    }));
  
  return {
    scenarios: results,
    differences,
  };
}

/**
 * Find divergence point between scenarios
 */
export function findDivergencePoint(
  forecast1: CashForecast,
  forecast2: CashForecast
): string | null {
  const minLength = Math.min(forecast1.projected.length, forecast2.projected.length);
  
  for (let i = 0; i < minLength; i++) {
    const diff = Math.abs(
      forecast1.projected[i].cash - forecast2.projected[i].cash
    );
    
    // Consider diverged if difference is > 5% of cash
    const threshold = Math.max(
      forecast1.projected[i].cash,
      forecast2.projected[i].cash
    ) * 0.05;
    
    if (diff > threshold) {
      return forecast1.projected[i].date;
    }
  }
  
  return null;
}

/**
 * Clone a scenario with modifications
 */
export function cloneScenario(
  scenario: Scenario,
  modifications: {
    name?: string;
    nameEn?: string;
    type?: Scenario['type'];
    assumptions?: Assumption[];
    initiatives?: Initiative[];
  }
): Scenario {
  return {
    ...scenario,
    id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: modifications.name || scenario.name,
    nameEn: modifications.nameEn || scenario.nameEn,
    type: modifications.type || scenario.type,
    assumptions: modifications.assumptions || [...scenario.assumptions],
    initiatives: modifications.initiatives || [...scenario.initiatives],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isLocked: false,
  };
}

/**
 * Create optimistic scenario from base
 */
export function createOptimisticScenario(base: Scenario): Scenario {
  const optimisticAssumptions = base.assumptions.map(assumption => {
    if (assumption.category === 'revenue') {
      return {
        ...assumption,
        scenarioValue: assumption.baseValue * 1.2, // 20% increase
      };
    } else if (assumption.category === 'expense') {
      return {
        ...assumption,
        scenarioValue: assumption.baseValue * 0.9, // 10% decrease
      };
    }
    return assumption;
  });
  
  return cloneScenario(base, {
    name: 'Scénario optimiste',
    nameEn: 'Optimistic Scenario',
    type: 'optimistic',
    assumptions: optimisticAssumptions,
  });
}

/**
 * Create pessimistic scenario from base
 */
export function createPessimisticScenario(base: Scenario): Scenario {
  const pessimisticAssumptions = base.assumptions.map(assumption => {
    if (assumption.category === 'revenue') {
      return {
        ...assumption,
        scenarioValue: assumption.baseValue * 0.8, // 20% decrease
      };
    } else if (assumption.category === 'expense') {
      return {
        ...assumption,
        scenarioValue: assumption.baseValue * 1.1, // 10% increase
      };
    }
    return assumption;
  });
  
  return cloneScenario(base, {
    name: 'Scénario pessimiste',
    nameEn: 'Pessimistic Scenario',
    type: 'pessimistic',
    assumptions: pessimisticAssumptions,
  });
}

/**
 * Apply what-if changes to a scenario
 */
export function applyWhatIf(
  scenario: Scenario,
  changes: {
    assumptionId?: string;
    assumptionValue?: number;
    initiativeId?: string;
    initiativeChanges?: Partial<Initiative>;
  }
): Scenario {
  let updatedAssumptions = [...scenario.assumptions];
  let updatedInitiatives = [...scenario.initiatives];
  
  if (changes.assumptionId && changes.assumptionValue !== undefined) {
    updatedAssumptions = updatedAssumptions.map(assumption =>
      assumption.id === changes.assumptionId
        ? { ...assumption, scenarioValue: changes.assumptionValue! }
        : assumption
    );
  }
  
  if (changes.initiativeId && changes.initiativeChanges) {
    updatedInitiatives = updatedInitiatives.map(initiative =>
      initiative.id === changes.initiativeId
        ? { ...initiative, ...changes.initiativeChanges }
        : initiative
    );
  }
  
  return {
    ...scenario,
    assumptions: updatedAssumptions,
    initiatives: updatedInitiatives,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate scenario sensitivity
 */
export function calculateSensitivity(
  baseScenario: Scenario,
  currentCash: number,
  currentDate: Date,
  assumptionId: string,
  variancePercent: number = 10
): {
  assumption: Assumption;
  impact: {
    runwayChange: number;
    zeroDateChange: number; // days
    cashAt6Months: number;
    cashAt12Months: number;
  };
} {
  const assumption = baseScenario.assumptions.find(a => a.id === assumptionId);
  if (!assumption) {
    throw new Error(`Assumption ${assumptionId} not found`);
  }
  
  // Calculate base
  const baseRunway = calculateRunwayAnalysis(
    currentCash,
    currentDate,
    baseScenario.initiatives,
    baseScenario.assumptions
  );
  
  const baseForecast = calculateCashForecast(
    currentCash,
    currentDate,
    baseScenario.initiatives,
    baseScenario.assumptions,
    12
  );
  
  // Calculate with variance
  const variedAssumptions = baseScenario.assumptions.map(a =>
    a.id === assumptionId
      ? { ...a, scenarioValue: a.scenarioValue * (1 + variancePercent / 100) }
      : a
  );
  
  const variedRunway = calculateRunwayAnalysis(
    currentCash,
    currentDate,
    baseScenario.initiatives,
    variedAssumptions
  );
  
  const variedForecast = calculateCashForecast(
    currentCash,
    currentDate,
    baseScenario.initiatives,
    variedAssumptions,
    12
  );
  
  return {
    assumption,
    impact: {
      runwayChange: variedRunway.runwayMonths - baseRunway.runwayMonths,
      zeroDateChange: Math.round(
        (new Date(variedRunway.zeroDate).getTime() -
         new Date(baseRunway.zeroDate).getTime()) /
        (1000 * 60 * 60 * 24)
      ),
      cashAt6Months: variedForecast.projected[5]?.cash - baseForecast.projected[5]?.cash || 0,
      cashAt12Months: variedForecast.projected[11]?.cash - baseForecast.projected[11]?.cash || 0,
    },
  };
}
