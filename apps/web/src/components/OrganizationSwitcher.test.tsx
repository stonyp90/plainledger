import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamMembersSection } from './OrganizationSwitcher';
import type { TenantInvitation } from '../contexts/TenantContext';

const mocks = vi.hoisted(() => ({
  tenant: { currentTenant: { id: 'tenant-a' }, canManageMembers: true, getMembers: vi.fn(), getInvitations: vi.fn(), inviteMember: vi.fn(), resendInvitation: vi.fn(), revokeInvitation: vi.fn(), updateMemberRole: vi.fn(), removeMember: vi.fn() },
  auth: { user: { id: 'user-a' } }, toast: vi.fn(), clipboard: vi.fn(),
}));
vi.mock('../contexts/TenantContext', () => ({ useTenant: () => mocks.tenant }));
vi.mock('../lib/keycloak', () => ({ useAuth: () => mocks.auth }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ showToast: mocks.toast }) }));
vi.mock('../lib/i18n', () => ({ useI18n: () => ({ language: 'en' }) }));
const invite = { id: 'invitation-1', email: 'member@example.test', role: 'member', status: 'pending', tenantId: 'tenant-a', expiresAt: '2026-12-01T00:00:00Z', invitedAt: '2026-01-01T00:00:00Z', invitedBy: 'user-a', inviteUrl: 'https://app.example.test/join?token=new-token', deliveryStatus: 'unsent' } as TenantInvitation;
async function create() {
  fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'member@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
  await screen.findByText(/Pending invitations/);
}
beforeEach(() => {
  mocks.tenant.currentTenant = { id: 'tenant-a' }; mocks.tenant.canManageMembers = true; mocks.auth.user = { id: 'user-a' };
  mocks.tenant.getMembers.mockReset().mockResolvedValue([]); mocks.tenant.getInvitations.mockReset().mockResolvedValue([]);
  mocks.tenant.inviteMember.mockReset().mockResolvedValue(invite); mocks.tenant.resendInvitation.mockReset().mockResolvedValue({ ...invite, inviteUrl: 'https://app.example.test/join?token=rotated' });
  mocks.tenant.revokeInvitation.mockReset().mockResolvedValue(undefined); mocks.tenant.updateMemberRole.mockReset().mockResolvedValue(undefined); mocks.tenant.removeMember.mockReset().mockResolvedValue(undefined);
  mocks.toast.mockReset(); mocks.clipboard.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: mocks.clipboard } });
});

describe('Durable team invitation state (membership API mocked)', () => {
  it('shows an unsent invitation as a pending link and copies the actual returned URL', async () => {
    render(<TeamMembersSection />); await screen.findByText('No team members were returned.'); await create();
    expect(screen.getByText('Email has not been sent. Share the invitation link.')).toBeVisible();
    expect(mocks.toast).toHaveBeenCalledWith('success', expect.stringContaining('Invitation link ready'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(mocks.clipboard).toHaveBeenCalledWith(invite.inviteUrl));
    expect(screen.getByLabelText('Invitation link for member@example.test')).toHaveValue(invite.inviteUrl);
  });
  it('retains a durable pending record and share link when email delivery fails', async () => {
    mocks.tenant.inviteMember.mockResolvedValueOnce({ ...invite, deliveryStatus: 'failed', deliveryMessage: 'Email provider refused delivery' });
    render(<TeamMembersSection />); await screen.findByText('No team members were returned.'); await create();
    expect(screen.getByRole('alert')).toHaveTextContent('Email provider refused delivery');
    expect(screen.getByLabelText('Invitation link for member@example.test')).toHaveValue(invite.inviteUrl);
    expect(mocks.toast).toHaveBeenCalledWith('error', 'Email provider refused delivery');
  });
  it('distinguishes queued delivery from a confirmed sent message', async () => {
    mocks.tenant.inviteMember.mockResolvedValueOnce({ ...invite, deliveryStatus: 'queued' });
    render(<TeamMembersSection />); await screen.findByText('No team members were returned.'); await create();
    expect(screen.getByText('Email delivery is queued.')).toBeVisible();
    expect(mocks.toast).toHaveBeenCalledWith('success', 'Invitation queued for email delivery.');
  });
  it('replaces a rotated token and explains that the earlier link is invalid', async () => {
    mocks.tenant.getInvitations.mockResolvedValueOnce([invite]);
    render(<TeamMembersSection />); await screen.findByRole('button', { name: 'Create new link' });
    fireEvent.click(screen.getByRole('button', { name: 'Create new link' }));
    await waitFor(() => expect(screen.getByLabelText('Invitation link for member@example.test')).toHaveValue('https://app.example.test/join?token=rotated'));
    expect(screen.getByText('Creating a new link invalidates the previous link.')).toBeVisible();
    expect(mocks.tenant.resendInvitation).toHaveBeenCalledWith('invitation-1');
  });
  it('retains the form and shows server rejection without a success message', async () => {
    mocks.tenant.inviteMember.mockRejectedValueOnce(new Error('Member limit reached'));
    render(<TeamMembersSection />); await screen.findByText('No team members were returned.');
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'member@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Member limit reached');
    expect(screen.getByLabelText('Email address')).toHaveValue('member@example.test');
    expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('clears user-scoped invitation links and ignores an old request after switching organizations', async () => {
    let resolve!: (value: TenantInvitation) => void;
    mocks.tenant.inviteMember.mockImplementationOnce(() => new Promise(resolvePromise => { resolve = resolvePromise; }));
    const { rerender } = render(<TeamMembersSection />); await screen.findByText('No team members were returned.');
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'member@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create invitation' }));
    mocks.tenant.currentTenant = { id: 'tenant-b' }; mocks.auth.user = { id: 'user-b' }; rerender(<TeamMembersSection />);
    await act(async () => { resolve(invite); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Pending invitations/)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(invite.inviteUrl!)).not.toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
  it('surfaces a failed membership load and retries without claiming empty data', async () => {
    mocks.tenant.getMembers.mockRejectedValueOnce(new Error('Membership service unavailable'));
    render(<TeamMembersSection />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Membership service unavailable');
    expect(screen.queryByText('No team members were returned.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No team members were returned.')).toBeVisible();
  });
});
