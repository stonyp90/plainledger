import { authenticatedOrganization, parseReportDate, reportPagination, validateFinancialFilter } from '../validation/financial-query-validation';

describe('Financial query input boundaries', () => {
  it.each([{ page: 0 }, { page: -1 }, { page: 1.1 }, { page: Infinity }, { pageSize: 0 }, { pageSize: -1 }, { pageSize: 251 }, { pageSize: NaN }, { page: Number.MAX_SAFE_INTEGER, pageSize: 250 }])('rejects unsafe pagination %j', (input) => {
    expect(() => reportPagination(input)).toThrow();
  });
  it('supports normal and high-page empty results without unsafe offsets', () => {
    expect(reportPagination()).toEqual({ page: 1, pageSize: 20 });
    expect(reportPagination({ page: 10000, pageSize: 250 })).toEqual({ page: 10000, pageSize: 250 });
  });
  it.each(['2026-02-30', '2026-13-01', '2026-00-01', 'not-a-date', '2026-2-1', '2026-01-01T00:00:00Z'])('rejects invalid calendar date %s', (value) => {
    expect(() => parseReportDate(value)).toThrow();
  });
  it('accepts a leap date and rejects a non-leap date', () => {
    expect(parseReportDate('2024-02-29').toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(() => parseReportDate('2025-02-29')).toThrow();
  });
  it.each([{ search: 'x'.repeat(201) }, { minAmount: -1 }, { maxAmount: Infinity }, { minAmount: 100, maxAmount: 10 }])('rejects invalid filters %j', (filter) => {
    expect(() => validateFinancialFilter(filter)).toThrow();
  });
  it('never uses a shared default tenant for a missing identity', () => {
    expect(() => authenticatedOrganization()).toThrow();
    expect(authenticatedOrganization({ req: { user: { organizationId: 'our-company' } } })).toBe('our-company');
  });
});
