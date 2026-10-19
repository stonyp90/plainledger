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
