import { BadRequestException } from '@nestjs/common';
import type { UpdateOrganizationSettingsInput } from '@infrastructure/persistence/postgres/postgres-organization-settings.repository';
import type { UpdateUserSettingsInput } from '@infrastructure/persistence/postgres/postgres-user-settings.repository';

const organizationFields = ['thresholdSettings', 'brandingSettings', 'notificationIntegrations', 'analyticsConfig', 'generalSettings'];
const userFields = ['notificationPreferences', 'uiPreferences', 'featurePreferences', 'chartPreferences', 'dashboardConfig', 'savedViews', 'aiPins', 'recentItems'];
const numericThresholds = ['varianceWarning', 'varianceCritical', 'currentRatioMin', 'currentRatioMax', 'quickRatioMin', 'debtToEquityMax', 'trendConsecutivePeriods', 'trendPercentageChange', 'receivablesAgingWarning', 'receivablesAgingCritical', 'payablesAgingWarning', 'largeTransactionAmount', 'roundNumberThreshold'];
const booleanThresholds = ['negativeBalanceCheck', 'unusualHoursCheck'];
function invalid(field: string): never { throw new BadRequestException(`Invalid or unsupported settings field: ${field}`); }
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  return value as Record<string, unknown>;
}
function fields(value: unknown, allowed: readonly string[], section: string): Record<string, unknown> {
  const object = record(value, section);
  for (const key of Object.keys(object)) if (!allowed.includes(key)) invalid(`${section}.${key}`);
  return object;
}
function boundedJson(value: unknown, path = 'settings', depth = 0): void {
  if (depth > 12) invalid(`${path}: nested too deeply`);
  if (value === null || typeof value === 'boolean' || typeof value === 'undefined') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) invalid(path); return; }
  if (typeof value === 'string') { if (value.length > 30000) invalid(path); return; }
  if (Array.isArray(value)) {
    if (value.length > 1000) invalid(`${path}: too many entries`);
    value.forEach((item) => boundedJson(item, path, depth + 1)); return;
  }
  const object = record(value, path);
  if (Object.keys(object).length > 1000) invalid(`${path}: too many fields`);
  for (const [key, item] of Object.entries(object)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key) || key.length > 255) invalid(path);
    boundedJson(item, `${path}.${key}`, depth + 1);
  }
}
function size(value: unknown) {
  boundedJson(value);
  if (Buffer.byteLength(JSON.stringify(value)) > 256 * 1024) invalid('settings exceed 256 KiB');
}
function validateThresholds(value: unknown) {
  const object = fields(value, [...numericThresholds, ...booleanThresholds], 'thresholdSettings');
  for (const [key, item] of Object.entries(object)) {
    if (booleanThresholds.includes(key)) { if (typeof item !== 'boolean') invalid(`thresholdSettings.${key}`); }
    else if (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > Number.MAX_SAFE_INTEGER) invalid(`thresholdSettings.${key}`);
  }
  for (const [lower, upper] of [['varianceWarning', 'varianceCritical'], ['currentRatioMin', 'currentRatioMax'], ['receivablesAgingWarning', 'receivablesAgingCritical']]) {
    if (typeof object[lower] === 'number' && typeof object[upper] === 'number' && object[lower] > object[upper]) invalid(`thresholdSettings.${lower} exceeds ${upper}`);
  }
  if (object.trendConsecutivePeriods !== undefined && (!Number.isSafeInteger(object.trendConsecutivePeriods) || (object.trendConsecutivePeriods as number) < 1)) invalid('thresholdSettings.trendConsecutivePeriods');
}
function validateGeneral(value: unknown) {
  const object = fields(value, ['fiscalYearEndMonth', 'province', 'currency', 'industry', 'timezone', 'dateFormat', 'currencyFormat'], 'generalSettings');
  for (const [key, item] of Object.entries(object)) {
    if (key === 'fiscalYearEndMonth') {
      if (!Number.isInteger(item) || (item as number) < 1 || (item as number) > 12) invalid(`generalSettings.${key}`);
    } else if (typeof item !== 'string' || item.length > 100) invalid(`generalSettings.${key}`);
  }
  if (object.currency !== undefined && !/^[A-Z]{3}$/.test(object.currency as string)) invalid('generalSettings.currency');
  if (object.timezone !== undefined) {
    try { new Intl.DateTimeFormat('en', { timeZone: object.timezone as string }); } catch { invalid('generalSettings.timezone'); }
  }
}
export function validateOrganizationSettings(input: unknown): asserts input is UpdateOrganizationSettingsInput {
  size(input); const object = fields(input, organizationFields, 'organization');
  for (const [key, value] of Object.entries(object)) {
    if (value === undefined) continue;
    record(value, key);
    if (key === 'thresholdSettings') validateThresholds(value);
    if (key === 'generalSettings') validateGeneral(value);
    if (key === 'brandingSettings') fields(value, ['logo', 'primaryColor', 'secondaryColor', 'customCss'], key);
    if (key === 'notificationIntegrations') fields(value, ['slack', 'teams'], key);
    if (key === 'analyticsConfig') fields(value, ['powerBI'], key);
  }
}
export function validateUserSettings(input: unknown): asserts input is UpdateUserSettingsInput {
  size(input); const object = fields(input, userFields, 'user');
  for (const [key, value] of Object.entries(object)) if (value !== undefined) record(value, key);
  if (object.uiPreferences) {
    const ui = fields(object.uiPreferences, ['theme', 'language', 'timezone', 'dateFormat', 'currencyFormat', 'sidebarCollapsed', 'dashboardLayout'], 'uiPreferences');
    for (const [key, value] of Object.entries(ui)) {
      if (key === 'sidebarCollapsed' ? typeof value !== 'boolean' : typeof value !== 'string' || value.length > 100) invalid(`uiPreferences.${key}`);
    }
  }
  if (object.notificationPreferences) fields(object.notificationPreferences, ['enabled', 'channels', 'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd', 'emailDigest', 'integrations'], 'notificationPreferences');
}
