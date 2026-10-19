const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildIsolatedRealm } = require('./prepare-real-stack.cjs');
const fixture = require('../fixtures/auth/isolated-e2e.json');
const sourceRealm = require('../keycloak/realms/plainledger-realm.json');
const productionRealm = require('../keycloak/realms/plainledger-production-realm.json');

const isApiMachine = user => user.serviceAccountClientId === 'plainledger-api';

test('isolated API machine uses reviewed production registration permissions', () => {
  const realm = buildIsolatedRealm();
  const machines = realm.users.filter(isApiMachine);
  assert.equal(machines.length, 1);
  assert.deepEqual(machines[0], productionRealm.users.find(isApiMachine));
  const roles = machines[0].clientRoles['realm-management'];
  assert.ok(roles.includes('view-realm'), 'realm role lookup must be authorized');
  assert.ok(roles.includes('manage-users'), 'user creation and role mapping must be authorized');
  assert.ok(!roles.includes('realm-admin'));
  assert.ok(!roles.includes('manage-clients'));
  assert.equal(machines[0].credentials, undefined);
});

test('isolated realm keeps synthetic humans and loopback clients without outbound mail', () => {
  const realm = buildIsolatedRealm();
  const humans = realm.users.filter(user => !user.serviceAccountClientId);
  assert.deepEqual(humans.map(user => user.id), [fixture.userId, ...fixture.invitees.map(user => user.userId)]);
  for (const human of humans) {
    assert.equal(human.emailVerified, true);
    assert.equal(human.credentials[0].value, fixture.password);
  }
  assert.deepEqual(realm.identityProviders, []);
  assert.deepEqual(realm.smtpServer, {});
  assert.equal(realm.registrationAllowed, false);
  const api = realm.clients.find(client => client.clientId === 'plainledger-api');
  assert.equal(api.secret, fixture.apiSecret);
  const web = realm.clients.find(client => client.clientId === 'plainledger-web');
  assert.deepEqual(web.redirectUris, ['http://localhost:5173/*']);
  assert.deepEqual(web.webOrigins, ['http://localhost:5173']);
  assert.equal(web.directAccessGrantsEnabled, false);
});

test('imported humans have only standard own-account client roles', () => {
  const humans = buildIsolatedRealm().users.filter(user => !user.serviceAccountClientId);
  for (const human of humans) {
    assert.deepEqual(human.clientRoles, { account: ['manage-account', 'view-profile'] }, human.username);
  }
});

test('isolated overrides do not mutate either checked-in realm', () => {
  const source = structuredClone(sourceRealm);
  const production = structuredClone(productionRealm);
  const realm = buildIsolatedRealm(source, production);
  realm.users.find(isApiMachine).clientRoles['realm-management'].push('unreviewed-role');
  assert.deepEqual(source, sourceRealm);
  assert.deepEqual(production, productionRealm);
});

test('missing or ambiguous production machine identity fails before creating a realm', () => {
  const production = structuredClone(productionRealm);
  const machine = production.users.find(isApiMachine);
  for (const users of [[], [machine, structuredClone(machine)]]) {
    assert.throws(
      () => buildIsolatedRealm(sourceRealm, { ...production, users }),
      /exactly one plainledger-api machine identity/,
    );
  }
});

test('isolated user-profile policy is exactly the reviewed production import', () => {
  const provider = 'org.keycloak.userprofile.UserProfileProvider';
  const realm = buildIsolatedRealm();
  assert.deepEqual(realm.components[provider], productionRealm.components[provider]);
  const profile = JSON.parse(realm.components[provider][0].config['kc.user.profile.config'][0]);
  assert.deepEqual(profile, require('../keycloak/user-profile.json'));
  assert.equal(profile.unmanagedAttributePolicy, undefined);
  for (const name of ['organization', 'organizationName', 'demoMode', 'invitedBy', 'invitedAt']) {
    assert.deepEqual(profile.attributes.find(attribute => attribute.name === name).permissions,
      { view: ['admin'], edit: ['admin'] });
  }
  realm.components[provider][0].config['kc.user.profile.config'][0] = '{}';
  assert.notDeepEqual(realm.components[provider], productionRealm.components[provider]);
});

test('missing or ambiguous production user-profile configuration fails before realm import', () => {
  const provider = 'org.keycloak.userprofile.UserProfileProvider';
  const profile = productionRealm.components[provider][0];
  for (const profiles of [undefined, [], [profile, structuredClone(profile)], [{ providerId: 'other' }]]) {
    assert.throws(() => buildIsolatedRealm(sourceRealm, {
      ...productionRealm, components: { [provider]: profiles },
    }), /exactly one reviewed user-profile configuration/);
  }
});


test('isolated account console uses the same restricted native clients and role scopes as production', () => {
  const realm = buildIsolatedRealm();
  for (const name of ['account', 'account-console']) {
    const client = realm.clients.find(client => client.clientId === name);
    assert.deepEqual(client, productionRealm.clients.find(client => client.clientId === name));
    assert.equal(client.fullScopeAllowed, false);
    assert.equal(client.serviceAccountsEnabled, false);
    assert.ok(client.defaultClientScopes.includes('roles'));
    assert.ok(!client.defaultClientScopes.includes('organization'));
    assert.ok(!client.defaultClientScopes.includes('plainledger-api-audience'));
  }
  assert.deepEqual(realm.roles.client.account, productionRealm.roles.client.account);
  assert.deepEqual(realm.clientScopeMappings.account, [
    { client: 'account-console', roles: ['manage-account', 'view-groups'] },
  ]);
});
