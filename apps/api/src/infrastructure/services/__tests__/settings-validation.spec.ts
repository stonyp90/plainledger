import { Repository } from 'typeorm';
import { validateOrganizationSettings, validateUserSettings } from '../settings-validation';
import { PostgresOrganizationSettingsRepository, UpdateOrganizationSettingsInput } from '@infrastructure/persistence/postgres/postgres-organization-settings.repository';
import { PostgresUserSettingsRepository, UpdateUserSettingsInput } from '@infrastructure/persistence/postgres/postgres-user-settings.repository';
import { OrganizationSettingsEntity } from '@infrastructure/persistence/postgres/entities/organization-settings.entity';
import { UserSettingsEntity } from '@infrastructure/persistence/postgres/entities/user-settings.entity';

describe('Settings validation and immutable ownership', () => {
  const repository = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks(); repository.findOne.mockResolvedValue(null);
    repository.create.mockImplementation((value) => value); repository.save.mockImplementation(async (value) => value);
  });
  it.each(['organizationId', 'organization', 'createdAt', 'updatedAt', 'userId', 'unexpected'])('rejects organization identity or unknown field %s before database writes', async (field) => {
    const service = new PostgresOrganizationSettingsRepository(repository as unknown as Repository<OrganizationSettingsEntity>);
    await expect(service.upsert('owned-org', { [field]: 'foreign-org' } as UpdateOrganizationSettingsInput)).rejects.toMatchObject({ status: 400 });
    expect(repository.findOne).not.toHaveBeenCalled(); expect(repository.save).not.toHaveBeenCalled();
  });
  it.each(['userId', 'user', 'organizationId', 'createdAt', 'unexpected'])('rejects user identity or unknown field %s before database writes', async (field) => {
    const service = new PostgresUserSettingsRepository(repository as unknown as Repository<UserSettingsEntity>);
    await expect(service.upsert('owned-user', { [field]: 'foreign-user' } as UpdateUserSettingsInput)).rejects.toMatchObject({ status: 400 });
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('creates organization settings only with the caller-bound identifier and declared fields', async () => {
    const service = new PostgresOrganizationSettingsRepository(repository as unknown as Repository<OrganizationSettingsEntity>);
    await expect(service.upsert('owned-org', { generalSettings: { currency: 'CAD' } })).resolves.toMatchObject({ organizationId: 'owned-org', generalSettings: { currency: 'CAD' } });
  });
  it('creates user settings only with the caller-bound identifier', async () => {
    const service = new PostgresUserSettingsRepository(repository as unknown as Repository<UserSettingsEntity>);
    await expect(service.upsert('owned-user', { uiPreferences: { language: 'fr' } })).resolves.toMatchObject({ userId: 'owned-user', uiPreferences: { language: 'fr' } });
  });
  it.each(['100', NaN, Infinity, -1, null, false])('rejects wrong threshold value %s', (value) => {
    expect(() => validateOrganizationSettings({ thresholdSettings: { varianceWarning: value } })).toThrow(/Invalid/);
  });
  it.each([{ unknownThreshold: 10 }, { varianceWarning: 20, varianceCritical: 10 }, { currentRatioMin: 3, currentRatioMax: 2 }, { trendConsecutivePeriods: 1.5 }, { negativeBalanceCheck: 'yes' }])('rejects invalid threshold schema %j', (thresholds) => {
    expect(() => validateOrganizationSettings({ thresholdSettings: thresholds })).toThrow();
  });
  it('accepts legitimate zero thresholds and boolean preferences', () => {
    expect(() => validateOrganizationSettings({ thresholdSettings: { varianceWarning: 0, varianceCritical: 10, negativeBalanceCheck: false } })).not.toThrow();
  });
  it.each([{ fiscalYearEndMonth: 13 }, { currency: 'US dollars' }, { timezone: 'Invalid/Timezone' }, { organizationId: 'foreign' }])('rejects invalid general settings %j', (generalSettings) => {
    expect(() => validateOrganizationSettings({ generalSettings })).toThrow();
  });
  it('bounds nested arrays, nonfinite JSON and payload size', () => {
    expect(() => validateUserSettings({ featurePreferences: { entries: Array(1001).fill(1) } })).toThrow();
    expect(() => validateUserSettings({ chartPreferences: { display: { currencyDecimals: NaN } } })).toThrow();
    expect(() => validateUserSettings({ savedViews: Object.fromEntries(Array.from({ length: 20 }, (_, index) => [String(index), { content: 'x'.repeat(20000) }])) })).toThrow();
  });
  it('rejects JSON prototype keys without modifying object prototypes', () => {
    expect(() => validateUserSettings(JSON.parse('{"uiPreferences":{"__proto__":{"polluted":true}}}'))).toThrow();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('propagates persistence failures rather than reporting saved settings', async () => {
    repository.save.mockRejectedValueOnce(new Error('Database unavailable'));
    const service = new PostgresUserSettingsRepository(repository as unknown as Repository<UserSettingsEntity>);
    await expect(service.upsert('owned-user', { uiPreferences: { theme: 'dark' } })).rejects.toThrow('Database unavailable');
  });
});
