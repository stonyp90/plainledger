import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DecisionCapture from './DecisionCapture';
const mocks = vi.hoisted(() => ({ capture: vi.fn(), onSave: vi.fn(), onClose: vi.fn(), auth: { authenticated: true, user: { id: 'user-1' } } }));
vi.mock('../lib/i18n', () => ({ useI18n: () => ({ language: 'en' }) }));
vi.mock('../lib/keycloak', () => ({ useAuth: () => mocks.auth }));
vi.mock('../lib/intelligence-api', () => ({ intelligenceApi: { captureDecision: mocks.capture } }));
const properties = { isOpen: true, onSave: mocks.onSave, onClose: mocks.onClose, organizationId: 'tenant-slug', industry: 'retail' as const,
  trigger: { metricType: 'revenue' as const, currentValue: 80, benchmarkValue: 100 } };
function fill() {
  fireEvent.change(screen.getByLabelText('Business size'), { target: { value: 'small' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Review supplier terms' } });
  fireEvent.change(screen.getByLabelText('Expected impact (CAD)'), { target: { value: '0' } });
}
beforeEach(() => {
  mocks.capture.mockReset().mockResolvedValue({ data: { id: 'persisted-id', organizationId: 'organization-uuid', createdAt: '2026-01-01T00:00:00Z' } });
  mocks.onSave.mockReset(); mocks.onClose.mockReset(); mocks.auth.authenticated = true;
});
describe('Decision capture save contract (API mocked)', () => {
  it('requires explicit business size and records a true zero impact with the persisted ID', async () => {
    render(<DecisionCapture {...properties} />);
    expect(screen.getByLabelText('Business size')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await waitFor(() => expect(mocks.onSave).toHaveBeenCalledOnce());
    expect(mocks.capture).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'tenant-slug', businessSize: 'small', decision: expect.objectContaining({ expectedImpact: 0 }) }));
    expect(mocks.onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'persisted-id', organizationId: 'organization-uuid', createdAt: '2026-01-01T00:00:00Z', reminderScheduled: false }));
    expect(mocks.onClose).toHaveBeenCalledOnce();
  });
  it('keeps the form and user values after failed persistence and supports retry', async () => {
    mocks.capture.mockRejectedValueOnce(new Error('Service unavailable'));
    render(<DecisionCapture {...properties} />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
    expect(mocks.onSave).not.toHaveBeenCalled(); expect(mocks.onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Description')).toHaveValue('Review supplier terms');
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    await waitFor(() => expect(mocks.onSave).toHaveBeenCalledOnce());
  });
  it('does not treat a malformed successful response as saved', async () => {
    mocks.capture.mockResolvedValueOnce({ data: {} });
    render(<DecisionCapture {...properties} />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('did not confirm');
    expect(mocks.onSave).not.toHaveBeenCalled();
  });
  it('retries dashboard notification without duplicating an already persisted decision', async () => {
    mocks.onSave.mockRejectedValueOnce(new Error('Refresh failed'));
    render(<DecisionCapture {...properties} />); fill(); fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('decision was saved');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
    await waitFor(() => expect(mocks.onClose).toHaveBeenCalledOnce());
    expect(mocks.capture).toHaveBeenCalledOnce();
  });
  it('does not permit missing, invalid, or zero reference values to become fake percentage gaps', () => {
    render(<DecisionCapture {...properties} />); fill();
    fireEvent.change(screen.getByLabelText('Reference value'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reference value'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
    expect(mocks.capture).not.toHaveBeenCalled();
  });
  it('does not save without an authenticated session', () => {
    mocks.auth.authenticated = false;
    render(<DecisionCapture {...properties} />); fill();
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in');
    expect(screen.getByRole('button', { name: 'Save decision' })).toBeDisabled();
  });
});
