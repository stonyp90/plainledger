import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DecisionsController } from '../decisions.controller';
import { CaptureDecisionInput, CaptureDecisionUseCase } from '../../use-cases/capture-decision.use-case';
import { OutcomeTrackingService } from '../../services/outcome-tracking.service';
import { IDecisionRepository } from '../../ports/outbound/IDecisionRepository';

const ORGANIZATION = '11111111-1111-4111-8111-111111111111';
const actor = { user: { sub: 'verified-user', organizationId: 'verified-tenant' } };
const input = (): CaptureDecisionInput => ({ organizationId: 'verified-tenant', industry: 'retail', businessSize: 'small',
  trigger: { metric: 'revenue', currentValue: 80, benchmarkValue: 100, gapPercentage: -20 },
  decision: { actionType: 'custom', description: 'Review supplier terms', expectedImpact: 0, confidence: 'medium' } });

const profile = { findOne: jest.fn() };
const repository = { findById: jest.fn(), findByOrganization: jest.fn(), save: jest.fn() };
const capture = { execute: jest.fn() };
const outcomes = { recordOutcome: jest.fn(), getOutcomeStatistics: jest.fn() };
const database = { getRepository: jest.fn(() => profile) };
const record = { id: 'decision-current', organizationId: ORGANIZATION, industry: 'retail', createdAt: new Date('2026-01-01'),
  toJSON: jest.fn(() => ({ id: 'decision-current', organizationId: ORGANIZATION })), outcome: { success: true, variance: 0 }, getROI: () => 1 };
const controller = new DecisionsController(capture as unknown as CaptureDecisionUseCase, outcomes as unknown as OutcomeTrackingService,
  repository as unknown as IDecisionRepository, database as unknown as DataSource);

beforeEach(() => {
  jest.clearAllMocks();
  profile.findOne.mockResolvedValue({ id: 'verified-user', isActive: true, role: 'member', organizationId: ORGANIZATION, organization: { id: ORGANIZATION, tenantId: 'verified-tenant', deletedAt: null } });
  capture.execute.mockResolvedValue(record);
  repository.findById.mockResolvedValue(record);
  repository.findByOrganization.mockResolvedValue([record]);
  outcomes.recordOutcome.mockResolvedValue(record);
  outcomes.getOutcomeStatistics.mockResolvedValue({ totalDecisions: 1 });
});

describe('Decision controller tenant isolation and persistence contract (repositories mocked)', () => {
  it('resolves a verified tenant slug to its database UUID before persisting', async () => {
    expect(await controller.captureDecision(input(), actor)).toMatchObject({ success: true, data: { id: record.id, organizationId: ORGANIZATION, reminderScheduled: false } });
    expect(capture.execute).toHaveBeenCalledWith(expect.objectContaining({ organizationId: ORGANIZATION, trigger: expect.objectContaining({ gapPercentage: -20 }) }));
  });
  it('rejects a body-selected foreign organization before capture', async () => {
    await expect(controller.captureDecision({ ...input(), organizationId: 'other-tenant' }, actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(capture.execute).not.toHaveBeenCalled();
  });
  it('does not report persistence success when the repository path fails', async () => {
    capture.execute.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(controller.captureDecision(input(), actor)).rejects.toThrow('database unavailable');
  });
  it('rejects unauthenticated and revoked memberships before reading decisions', async () => {
    await expect(controller.getDecisions({})).rejects.toBeInstanceOf(UnauthorizedException);
    profile.findOne.mockResolvedValueOnce(null);
    await expect(controller.getDecisions(actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.findByOrganization).not.toHaveBeenCalled();
  });
  it.each(['viewer', 'suspended'])('does not allow a %s to write despite JWT role claims', async role => {
    profile.findOne.mockResolvedValueOnce({ isActive: true, role, organizationId: ORGANIZATION, organization: { id: ORGANIZATION, tenantId: 'verified-tenant' } });
    await expect(controller.captureDecision(input(), actor)).rejects.toBeInstanceOf(ForbiddenException);
    expect(capture.execute).not.toHaveBeenCalled();
  });
  it('rejects a stale tenant claim when the database membership moved', async () => {
    profile.findOne.mockResolvedValueOnce({ isActive: true, role: 'member', organizationId: ORGANIZATION, organization: { id: ORGANIZATION, tenantId: 'new-tenant' } });
    await expect(controller.getDecisions(actor)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('scopes history and statistics to the database organization UUID', async () => {
    await controller.getDecisions(actor); await controller.getStatistics(actor);
    expect(repository.findByOrganization).toHaveBeenCalledWith(ORGANIZATION);
    expect(outcomes.getOutcomeStatistics).toHaveBeenCalledWith(ORGANIZATION);
  });
  it('hides missing and foreign decision records with the same404', async () => {
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...record, organizationId: 'other-organization' });
    await expect(controller.getDecision('missing', actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getDecision('foreign', actor)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rejects an outcome for another tenant before invoking the outcome service', async () => {
    repository.findById.mockResolvedValueOnce({ ...record, organizationId: 'other-organization' });
    await expect(controller.recordOutcome('foreign', { actualImpact: 10, success: true }, actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(outcomes.recordOutcome).not.toHaveBeenCalled();
  });
  it('passes verified ownership and a parsed measurement date into the outcome write', async () => {
    await controller.recordOutcome(record.id, { actualImpact: 0, success: false, measuredAt: '2026-01-01' }, actor);
    expect(outcomes.recordOutcome).toHaveBeenCalledWith(expect.objectContaining({ decisionId: record.id, organizationId: ORGANIZATION, actualImpact: 0, success: false, measuredAt: new Date('2026-01-01') }));
  });
  it.each([NaN, Infinity, '20', null, 1e16])('rejects invalid or oversized monetary input %s', async amount => {
    const body = input(); body.decision.expectedImpact = amount as number;
    await expect(controller.captureDecision(body, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(capture.execute).not.toHaveBeenCalled();
  });
  it('recomputes the percentage gap instead of trusting a supplied value', async () => {
    const body = input(); body.trigger.gapPercentage = 700;
    await controller.captureDecision(body, actor);
    expect(capture.execute).toHaveBeenCalledWith(expect.objectContaining({ trigger: expect.objectContaining({ gapPercentage: -20 }) }));
  });
  it('rejects a zero reference and percentages outside the database range', async () => {
    const body = input(); body.trigger.benchmarkValue = 0;
    await expect(controller.captureDecision(body, actor)).rejects.toBeInstanceOf(BadRequestException);
    body.trigger.benchmarkValue = .001;
    await expect(controller.captureDecision(body, actor)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['invalid', '2999-01-01'])('rejects invalid or future outcome date %s', async measuredAt => {
    await expect(controller.recordOutcome(record.id, { actualImpact: 1, success: true, measuredAt }, actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(outcomes.recordOutcome).not.toHaveBeenCalled();
  });
  it('provides current-database membership metadata on every exposed route', () => {
    for (const name of ['captureDecision', 'getStatistics', 'getDecisions', 'recordOutcome', 'getDecision'] as const) {
      expect(Reflect.getMetadata('roles', DecisionsController.prototype[name]).roles.length).toBeGreaterThan(0);
    }
  });
});
