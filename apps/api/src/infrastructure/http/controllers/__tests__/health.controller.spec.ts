import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from '../health.controller';
import { CacheService } from '@infrastructure/cache/cache.service';
import { IAIService } from '@application/ports/outbound/IAIService';

describe('Required dependency readiness', () => {
  const database = { isInitialized: true, query: jest.fn() };
  const cache = { healthCheck: jest.fn() };
  const controller = new HealthController({} as IAIService, undefined,
    database as unknown as DataSource, cache as unknown as CacheService);

  beforeEach(() => {
    database.isInitialized = true;
    database.query.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    cache.healthCheck.mockReset().mockResolvedValue(true);
  });

  it('only reports ready after a database query and Redis ping succeed', async () => {
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ready', checks: { database: 'connected', cache: 'connected' } });
    expect(database.query).toHaveBeenCalledWith('SELECT 1');
    expect(cache.healthCheck).toHaveBeenCalledTimes(1);
  });

  it.each(['database', 'cache'] as const)('returns 503 when %s is unavailable', async (dependency) => {
    if (dependency === 'database') database.query.mockRejectedValue(new Error('Connection refused'));
    else cache.healthCheck.mockResolvedValue(false);
    const result = controller.ready();
    await expect(result).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(result).rejects.toMatchObject({ status: 503, response: { status: 'not_ready', checks: { [dependency]: 'disconnected' } } });
  });

  it('does not query a database that has not initialized', async () => {
    database.isInitialized = false;
    await expect(controller.ready()).rejects.toMatchObject({ status: 503 });
    expect(database.query).not.toHaveBeenCalled();
  });

  it('bounds a hanging database check to two seconds', async () => {
    jest.useFakeTimers();
    try {
      database.query.mockImplementation(() => new Promise(() => {}));
      const result = expect(controller.ready()).rejects.toMatchObject({ status: 503 });
      await jest.advanceTimersByTimeAsync(2000);
      await result;
      expect(jest.getTimerCount()).toBe(0);
    } finally { jest.useRealTimers(); }
  });
});
