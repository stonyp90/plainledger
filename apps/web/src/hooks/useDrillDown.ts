/**
 * useDrillDown Hook
 * 
 * Integrates semantic layer drill paths with UI for hierarchical drill-down.
 * Allows users to drill down through dimension hierarchies (e.g., Year -> Quarter -> Month -> Day).
 * 
 * Features:
 * - Navigate drill paths from semantic layer
 * - Track drill state (breadcrumbs)
 * - Apply drill filters to queries
 * - Reset drill state
 */

import { useState, useCallback, useMemo } from 'react';
// Semantic layer types (should be exposed via GraphQL or API)
// For now, using simplified types
interface SemanticDimension {
  id: string;
  name: { en: string; fr: string };
  drillPath?: string[];
  hierarchyLevel?: number;
}

interface SemanticView {
  id: string;
  dimensions: SemanticDimension[];
}

export interface DrillState {
  dimensionId: string;
  level: number;
  value: string;
  path: string[]; // Breadcrumb path
}

export interface DrillDownHook {
  currentDrill: DrillState | null;
  drillPath: string[];
  canDrillDown: boolean;
  canDrillUp: boolean;
  drillDown: (dimensionId: string, value: string) => void;
  drillUp: () => void;
  resetDrill: () => void;
  getDrillFilters: () => Array<{
    dimension: string;
    operator: string;
    value: string;
  }>;
}

export function useDrillDown(
  industryId: string,
  viewId: string,
  initialDimension?: string,
): DrillDownHook {
  const [drillState, setDrillState] = useState<DrillState | null>(
    initialDimension
      ? {
          dimensionId: initialDimension,
          level: 0,
          value: '',
          path: [],
        }
      : null
  );

  // Get semantic view
  // TODO: Load from GraphQL API or fetch from backend
  // For now, this is a placeholder that would need to be implemented
  // with actual API calls to fetch semantic model data
  const semanticView = useMemo<SemanticView | null>(() => {
    // This should fetch from API:
    // const response = await fetch(`/api/semantic/views?industryId=${industryId}&viewId=${viewId}`);
    // return response.json();
    return null; // Placeholder - needs API integration
  }, [industryId, viewId]);

  // Get current dimension
  const currentDimension = useMemo(() => {
    if (!semanticView || !drillState) return null;
    return semanticView.dimensions.find((d) => d.id === drillState.dimensionId);
  }, [semanticView, drillState]);

  // Check if can drill down
  const canDrillDown = useMemo(() => {
    if (!currentDimension || !currentDimension.drillPath) return false;
    const nextLevel = (drillState?.level || 0) + 1;
    return currentDimension.drillPath.length > nextLevel;
  }, [currentDimension, drillState]);

  // Check if can drill up
  const canDrillUp = useMemo(() => {
    return drillState !== null && drillState.level > 0;
  }, [drillState]);

  // Drill down to next level
  const drillDown = useCallback(
    (dimensionId: string, value: string) => {
      if (!semanticView) return;

      const dimension = semanticView.dimensions.find((d) => d.id === dimensionId);
      if (!dimension || !dimension.drillPath) return;

      const currentLevel = drillState?.level || 0;
      const nextLevel = currentLevel + 1;

      if (nextLevel >= dimension.drillPath.length) {
        return; // Already at deepest level
      }

      const nextDimensionId = dimension.drillPath[nextLevel];
      const nextDimension = semanticView.dimensions.find(
        (d) => d.id === nextDimensionId
      );

      if (!nextDimension) return;

      setDrillState({
        dimensionId: nextDimensionId,
        level: nextLevel,
        value,
        path: [
          ...(drillState?.path || []),
          `${dimension.name.en || dimension.id}: ${value}`,
        ],
      });
    },
    [semanticView, drillState]
  );

  // Drill up to previous level
  const drillUp = useCallback(() => {
    if (!drillState || !semanticView) return;

    const currentDim = semanticView.dimensions.find(
      (d) => d.id === drillState.dimensionId
    );
    if (!currentDim) return;

    // Find parent dimension
    const parentDimension = semanticView.dimensions.find((d) => {
      return (
        d.drillPath &&
        d.drillPath.includes(currentDim.id) &&
        d.hierarchyLevel === (drillState.level - 1)
      );
    });

    if (!parentDimension) {
      // Reset to root
      setDrillState(null);
      return;
    }

    const newPath = drillState.path.slice(0, -1);

    setDrillState({
      dimensionId: parentDimension.id,
      level: drillState.level - 1,
      value: '',
      path: newPath,
    });
  }, [drillState, semanticView]);

  // Reset drill state
  const resetDrill = useCallback(() => {
    setDrillState(null);
  }, []);

  // Get filters for current drill state
  const getDrillFilters = useCallback(() => {
    if (!drillState || !semanticView) return [];

    const dimension = semanticView.dimensions.find(
      (d) => d.id === drillState.dimensionId
    );
    if (!dimension) return [];

    // Return filter for current drill level
    return [
      {
        dimension: dimension.id,
        operator: 'equals',
        value: drillState.value,
      },
    ];
  }, [drillState, semanticView]);

  return {
    currentDrill: drillState,
    drillPath: drillState?.path || [],
    canDrillDown,
    canDrillUp,
    drillDown,
    drillUp,
    resetDrill,
    getDrillFilters,
  };
}

/**
 * Hook for breadcrumb navigation
 */
export function useDrillBreadcrumbs(drillState: DrillState | null) {
  const breadcrumbs = useMemo(() => {
    if (!drillState) return [];

    return drillState.path.map((label, index) => ({
      label,
      level: index,
      isActive: index === drillState.path.length - 1,
    }));
  }, [drillState]);

  return breadcrumbs;
}
