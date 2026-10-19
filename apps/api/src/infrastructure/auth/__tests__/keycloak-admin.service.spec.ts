import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { KeycloakAdminService } from '../keycloak-admin.service';

const USER_ID = '00000000-0000-4000-8000-000000000010';
const REALM = 'plainledger';
const input = {
  email: 'isolated-signup@example.test', firstName: 'Isolated', lastName: 'Signup',
  password: 'Disposable-test-only-2026!', emailVerified: false,
  requiredActions: ['VERIFY_EMAIL'], roles: ['owner', 'user'],
};
const createAdminClient = () => ({
  users: {
    create: jest.fn().mockResolvedValue({ id: USER_ID }),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    addRealmRoleMappings: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([{ id: 'pre-existing-user', email: input.email }]),
  },
  roles: {
    find: jest.fn().mockResolvedValue([
      { id: 'role-owner', name: 'owner' }, { id: 'role-user', name: 'user' },
    ]),
  },
});

describe('Keycloak user creation compensation', () => {
  let client: ReturnType<typeof createAdminClient>;
  let service: KeycloakAdminService;
  let errorLog: jest.SpyInstance;
  let warningLog: jest.SpyInstance;

  beforeEach(() => {
    client = createAdminClient();
    service = new KeycloakAdminService(new ConfigService({ KEYCLOAK_REALM: REALM }), {} as SESAdapter);
    // Inject the outbound client without opening a real realm or starting refresh timers.
    Object.assign(service, { adminClient: client, isConfigured: true });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    warningLog = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns a new identity only after password and requested role assignment succeed', async () => {
    await expect(service.createUser(input)).resolves.toMatchObject({ id: USER_ID, email: input.email, enabled: true, emailVerified: false });
    expect(client.users.create).toHaveBeenCalledWith(expect.objectContaining({ realm: REALM, requiredActions: ['VERIFY_EMAIL'], emailVerified: false }));
    expect(client.users.resetPassword).toHaveBeenCalledWith({ realm: REALM, id: USER_ID, credential: { type: 'password', value: input.password, temporary: false } });
    expect(client.users.addRealmRoleMappings).toHaveBeenCalledWith({ realm: REALM, id: USER_ID, roles: [{ id: 'role-owner', name: 'owner' }, { id: 'role-user', name: 'user' }] });
    expect(client.users.del).not.toHaveBeenCalled();
    expect(client.users.update).not.toHaveBeenCalled();
  });

  it.each(['password', 'role lookup', 'role mapping'] as const)('removes the newly created identity after %s failure and preserves the original error', async (stage) => {
    const failure = new Error(`${stage} rejected by Keycloak`);
    const failingOperation = stage === 'password' ? client.users.resetPassword
      : stage === 'role lookup' ? client.roles.find : client.users.addRealmRoleMappings;
    failingOperation.mockRejectedValueOnce(failure);

    await expect(service.createUser(input)).rejects.toBe(failure);
    expect(client.users.del).toHaveBeenCalledTimes(1);
    expect(client.users.del).toHaveBeenCalledWith({ realm: REALM, id: USER_ID });
    expect(client.users.update).not.toHaveBeenCalled();
    if (stage === 'password') expect(client.roles.find).not.toHaveBeenCalled();
    if (stage !== 'role mapping') expect(client.users.addRealmRoleMappings).not.toHaveBeenCalled();
  });

  it('disables an incomplete identity if removal fails and reports that removal is still required', async () => {
    const failure = new Error('role mapping denied');
    client.users.addRealmRoleMappings.mockRejectedValueOnce(failure);
    client.users.del.mockRejectedValueOnce(new Error('delete unavailable'));

    await expect(service.createUser(input)).rejects.toBe(failure);
    expect(client.users.update).toHaveBeenCalledWith({ realm: REALM, id: USER_ID }, { enabled: false });
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining(`Could not remove incomplete user ${USER_ID}: delete unavailable`));
    expect(warningLog).toHaveBeenCalledWith(`Incomplete user ${USER_ID} was disabled and still requires removal.`);
  });

  it('reports failed removal and disabling without replacing the original provisioning error', async () => {
    const failure = new Error('role lookup denied');
    client.roles.find.mockRejectedValueOnce(failure);
    client.users.del.mockRejectedValueOnce(new Error('delete unavailable'));
    client.users.update.mockRejectedValueOnce(new Error('disable unavailable'));

    await expect(service.createUser(input)).rejects.toBe(failure);
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining(`Could not remove incomplete user ${USER_ID}`));
    expect(errorLog).toHaveBeenCalledWith(`Incomplete user ${USER_ID} could not be removed or disabled; manual cleanup is required: disable unavailable`);
  });

  it('does not attempt cleanup or downstream mutations when initial creation fails', async () => {
    const failure = new Error('identity server unavailable');
    client.users.create.mockRejectedValueOnce(failure);
    await expect(service.createUser(input)).rejects.toBe(failure);
    expect(client.users.resetPassword).not.toHaveBeenCalled();
    expect(client.roles.find).not.toHaveBeenCalled();
    expect(client.users.del).not.toHaveBeenCalled();
    expect(client.users.update).not.toHaveBeenCalled();
  });

  it('never adopts or deletes a pre-existing identity after a concurrent duplicate-create conflict', async () => {
    const conflict = Object.assign(new Error('email already exists'), { response: { status: 409 } });
    client.users.create.mockRejectedValueOnce(conflict);
    await expect(service.createUser(input)).rejects.toBe(conflict);
    expect(client.users.find).not.toHaveBeenCalled();
    expect(client.users.resetPassword).not.toHaveBeenCalled();
    expect(client.users.del).not.toHaveBeenCalled();
    expect(client.users.update).not.toHaveBeenCalled();
  });

  it('preserves verification requirements when a new user must set their own password', async () => {
    await expect(service.createUser({ ...input, password: undefined })).resolves.toMatchObject({ id: USER_ID, emailVerified: false });
    expect(client.users.create).toHaveBeenCalledWith(expect.objectContaining({ requiredActions: ['VERIFY_EMAIL', 'UPDATE_PASSWORD'] }));
    expect(client.users.resetPassword).not.toHaveBeenCalled();
    expect(client.users.addRealmRoleMappings).toHaveBeenCalled();
    expect(client.users.del).not.toHaveBeenCalled();
  });

  it('rejects before creating an identity when the admin client is unavailable', async () => {
    Object.assign(service, { isConfigured: false });
    await expect(service.createUser(input)).rejects.toThrow('Keycloak Admin Service not configured');
    expect(client.users.create).not.toHaveBeenCalled();
  });
});
