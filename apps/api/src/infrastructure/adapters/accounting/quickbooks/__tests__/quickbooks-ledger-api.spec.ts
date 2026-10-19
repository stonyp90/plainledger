import { ConfigService } from '@nestjs/config';
import { QuickBooksService } from '../quickbooks.service';
import { ledgerFixture } from '@__fixtures__/providers/quickbooks/ledger-fixture';

describe('QuickBooks ledger HTTP contract', () => {
  let fetchMock: jest.SpyInstance, service: QuickBooksService;
  const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });
  beforeEach(() => {
    service = new QuickBooksService(new ConfigService({}));
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());
  it('paginates beyond 1,000 active and inactive accounts with the explicit environment', async () => {
    const account = ledgerFixture().accounts[0];
    const first = Array.from({ length: 1000 }, (_, index) => ({ ...account, Id: String(index + 1) }));
    fetchMock.mockResolvedValueOnce(response({ QueryResponse: { Account: first, startPosition: 1, maxResults: 1000 } }))
      .mockResolvedValueOnce(response({ QueryResponse: { Account: [{ ...account, Id: '1001', Active: false }], startPosition: 1001, maxResults: 1 } }));
    const accounts = await service.getLedgerAccounts('fixture-access', '123', false);
    expect(accounts).toHaveLength(1001); expect(accounts[1000].Active).toBe(false);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^https:\/\/quickbooks\.api\.intuit\.com\/v3\/company\/123\/query/);
      expect(new URL(url).searchParams.get('query')).toContain('Active IN (true, false)');
      expect(options).toMatchObject({ redirect: 'error', headers: { Authorization: 'Bearer fixture-access', Accept: 'application/json' } });
    }
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('query')).toContain('STARTPOSITION 1001');
  });
  it('requests one additional page when the prior page exactly hits the limit', async () => {
    const account = ledgerFixture().accounts[0];
    fetchMock.mockResolvedValueOnce(response({ QueryResponse: { Account: Array.from({ length: 1000 }, (_, index) => ({ ...account, Id: String(index + 1) })) } }))
      .mockResolvedValueOnce(response({ QueryResponse: {} }));
    expect(await service.getLedgerAccounts('fixture-access', '123', true)).toHaveLength(1000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('rejects duplicate/repeated pagination instead of returning partial accounts', async () => {
    const account = ledgerFixture().accounts[0];
    fetchMock.mockResolvedValueOnce(response({ QueryResponse: { Account: Array.from({ length: 1000 }, (_, index) => ({ ...account, Id: String(index + 1) })) } }))
      .mockResolvedValueOnce(response({ QueryResponse: { Account: [account], startPosition: 1001 } }));
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.toThrow('repeated');
  });
  it('fails a mid-pagination provider outage without acknowledging prior pages', async () => {
    const account = ledgerFixture().accounts[0];
    fetchMock.mockResolvedValueOnce(response({ QueryResponse: { Account: Array.from({ length: 1000 }, (_, index) => ({ ...account, Id: String(index + 1) })) } }))
      .mockResolvedValueOnce(new Response('private provider body', { status: 503 }));
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.toThrow('HTTP 503');
  });
  it.each([{ QueryResponse: { Account: {} } }, { QueryResponse: { Account: [], startPosition: 5 } }, { QueryResponse: { Account: [], maxResults: 1000 } }, {}])('rejects malformed account pages %p', async (data) => {
    fetchMock.mockResolvedValue(response(data));
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.toThrow();
  });
  it('uses exact accrual report names, dates and both native/home debit-credit columns', async () => {
    fetchMock.mockResolvedValue(response(ledgerFixture().generalLedger));
    await service.getGeneralLedger('fixture-access', '123', '1900-01-01', '2026-10-19', true);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.hostname).toBe('sandbox-quickbooks.api.intuit.com');
    expect(url.pathname).toBe('/v3/company/123/reports/GeneralLedger');
    expect(url.searchParams.get('accounting_method')).toBe('Accrual');
    expect(url.searchParams.get('start_date')).toBe('1900-01-01');
    expect(url.searchParams.get('end_date')).toBe('2026-10-19');
    expect(url.searchParams.get('columns')).toContain('debt_home_amt,credit_home_amt');
  });
  it('uses an independent trial-balance request with the same scope', async () => {
    fetchMock.mockResolvedValue(response(ledgerFixture().trial));
    await service.getTrialBalance('fixture-access', '123', '1900-01-01', '2026-10-19', true);
    expect(new URL(fetchMock.mock.calls[0][0]).pathname).toBe('/v3/company/123/reports/TrialBalance');
  });
  it.each(['2026-02-30', "2026-01-01' OR 1=1", 'invalid'])('rejects invalid date %s before any request', async (date) => {
    await expect(service.getGeneralLedger('fixture-access', '123', date, '2026-10-19', true)).rejects.toThrow('dates');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('does not allow realm IDs to alter the provider URL path', async () => {
    await expect(service.getLedgerAccounts('fixture-access', '../other-company', true)).rejects.toThrow('Invalid accounting');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([undefined, { MultiCurrencyEnabled: false }, { HomeCurrency: { value: 'CAD' } }, { HomeCurrency: { value: 'cad' }, MultiCurrencyEnabled: false }])('requires verified currency preferences %p', async (CurrencyPrefs) => {
    fetchMock.mockResolvedValue(response({ Preferences: { CurrencyPrefs } }));
    await expect(service.getAccountingPreferences('fixture-access', '123', true)).rejects.toThrow('currency preferences');
  });
  it('returns explicit multicurrency settings', async () => {
    fetchMock.mockResolvedValue(response({ Preferences: { CurrencyPrefs: { HomeCurrency: { value: 'CAD' }, MultiCurrencyEnabled: true } } }));
    expect(await service.getAccountingPreferences('fixture-access', '123', true)).toEqual({ homeCurrency: 'CAD', multiCurrency: true });
  });
  it('redacts raw failure payloads and network errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('fixture-secret access token and customer name', { status: 401 }))
      .mockRejectedValueOnce(new Error('fixture-secret transport credentials'));
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.toThrow('HTTP 401');
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.not.toThrow('fixture-secret');
  });
  it.each([new Response('{invalid', { status: 200 }), response({ Fault: { Error: [{ Message: 'private detail' }] } }), new Response(null, { status: 200 })])('rejects malformed, fault and absent response bodies', async (body) => {
    fetchMock.mockResolvedValue(body);
    await expect(service.getLedgerAccounts('fixture-access', '123', true)).rejects.toThrow();
  });
  it('rejects advertised oversized reports before reading them', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { headers: { 'content-length': String(33 * 1024 * 1024) } }));
    await expect(service.getGeneralLedger('fixture-access', '123', '1900-01-01', '2026-10-19', true)).rejects.toThrow('supported size');
  });
});
