/**
 * Formula Parser for Visual Display
 * 
 * Parses formulas into styled segments for rendering with
 * syntax highlighting and driver reference tags
 */

import { type Driver } from './financialModel';

export type FormulaPartType = 'driver' | 'operator' | 'function' | 'text' | 'number' | 'parenthesis';

export interface FormulaPart {
  type: FormulaPartType;
  value: string;
  driverId?: string;
}

// Known formula functions
const FUNCTIONS = ['SUM', 'AVERAGE', 'ROUND', 'MIN', 'MAX', 'IF', 'ABS', 'SQRT', 'POWER', 'COUNT'];

// Operators
const OPERATORS = ['+', '-', '*', '/', '=', '<', '>', '<=', '>=', '<>'];

/**
 * Parse a formula string into displayable parts with syntax highlighting
 */
export function parseFormulaForDisplay(
  formula: string,
  drivers: Record<string, Driver>
): FormulaPart[] {
  if (!formula) return [];
  
  // Remove leading = if present
  let expr = formula.startsWith('=') ? formula.slice(1) : formula;
  const parts: FormulaPart[] = [];
  
  // Build a map of driver names (case-insensitive)
  const driverMap = new Map<string, { id: string; name: string }>();
  Object.values(drivers).forEach(d => {
    driverMap.set(d.name.toUpperCase(), { id: d.id, name: d.name });
    if (d.nameEn) {
      driverMap.set(d.nameEn.toUpperCase(), { id: d.id, name: d.nameEn });
    }
  });
  
  // Sort driver names by length (longest first) to match greedily
  const driverNames = Array.from(driverMap.keys()).sort((a, b) => b.length - a.length);
  
  let i = 0;
  while (i < expr.length) {
    const remaining = expr.slice(i);
    const remainingUpper = remaining.toUpperCase();
    
    // Skip whitespace
    if (/^\s/.test(remaining)) {
      i++;
      continue;
    }
    
    // Check for parentheses
    if (remaining[0] === '(' || remaining[0] === ')') {
      parts.push({ type: 'parenthesis', value: remaining[0] });
      i++;
      continue;
    }
    
    // Check for operators
    let foundOp = false;
    for (const op of OPERATORS) {
      if (remaining.startsWith(op)) {
        parts.push({ type: 'operator', value: op });
        i += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;
    
    // Check for functions
    let foundFunc = false;
    for (const func of FUNCTIONS) {
      if (remainingUpper.startsWith(func) && 
          (remaining.length === func.length || !/[A-Za-z0-9_]/.test(remaining[func.length]))) {
        parts.push({ type: 'function', value: func });
        i += func.length;
        foundFunc = true;
        break;
      }
    }
    if (foundFunc) continue;
    
    // Check for driver names
    let foundDriver = false;
    for (const driverName of driverNames) {
      if (remainingUpper.startsWith(driverName)) {
        // Check word boundary
        const nextChar = remaining[driverName.length];
        if (!nextChar || !/[A-Za-z0-9_]/.test(nextChar)) {
          const driverInfo = driverMap.get(driverName);
          if (driverInfo) {
            parts.push({
              type: 'driver',
              value: driverInfo.name,
              driverId: driverInfo.id,
            });
            i += driverName.length;
            foundDriver = true;
            break;
          }
        }
      }
    }
    if (foundDriver) continue;
    
    // Check for numbers
    const numMatch = remaining.match(/^-?[\d.,]+/);
    if (numMatch) {
      parts.push({ type: 'number', value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }
    
    // Check for comma (argument separator)
    if (remaining[0] === ',') {
      parts.push({ type: 'text', value: ',' });
      i++;
      continue;
    }
    
    // Default: collect as text until next special character
    let textEnd = 1;
    while (textEnd < remaining.length) {
      const char = remaining[textEnd];
      if (/[\s()+\-*/<>=,]/.test(char)) break;
      textEnd++;
    }
    
    const text = remaining.slice(0, textEnd);
    
    // Check if this text is a driver name
    const upperText = text.toUpperCase();
    const driverInfo = driverMap.get(upperText);
    if (driverInfo) {
      parts.push({
        type: 'driver',
        value: driverInfo.name,
        driverId: driverInfo.id,
      });
    } else {
      parts.push({ type: 'text', value: text });
    }
    i += textEnd;
  }
  
  return parts;
}

/**
 * Get color for formula part type
 */
export function getFormulaPartColor(type: FormulaPartType): string {
  switch (type) {
    case 'driver':
      return '#1E40AF'; // Blue for driver references
    case 'function':
      return '#7C3AED'; // Purple for functions
    case 'operator':
      return '#6B7280'; // Gray for operators
    case 'number':
      return '#059669'; // Green for numbers
    case 'parenthesis':
      return '#6B7280'; // Gray for parentheses
    case 'text':
    default:
      return '#374151'; // Dark gray for text
  }
}

/**
 * Get background color for formula part type
 */
export function getFormulaPartBg(type: FormulaPartType): string | undefined {
  switch (type) {
    case 'driver':
      return '#DBEAFE'; // Light blue for driver tags
    default:
      return undefined;
  }
}
