const fs = require('node:fs');
const path = require('node:path');
const fixture = require('../fixtures/auth/isolated-e2e.json');
const sourceRealm = require('../keycloak/realms/plainledger-realm.json');
const productionRealm = require('../keycloak/realms/plainledger-production-realm.json');
const profileProvider = 'org.keycloak.userprofile.UserProfileProvider';

function buildIsolatedRealm(source = sourceRealm, production = productionRealm) {
  const machines = production.users.filter(user => user.serviceAccountClientId === 'plainledger-api');
  if (machines.length !== 1) {
    throw new Error('The production realm must contain exactly one plainledger-api machine identity');
  }
  const profiles = production.components?.[profileProvider];
  const profileConfig = profiles?.[0]?.config?.['kc.user.profile.config'];
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0]?.providerId !== 'declarative-user-profile'
      || !Array.isArray(profileConfig) || profileConfig.length !== 1 || typeof profileConfig[0] !== 'string') {
    throw new Error('The production realm must contain exactly one reviewed user-profile configuration');
  }
  const realm = structuredClone(source);
  realm.components = { ...realm.components, [profileProvider]: structuredClone(profiles) };
  realm.identityProviders = [];
  realm.smtpServer = {};
  realm.verifyEmail = false;
  realm.registrationAllowed = false;
  realm.users = [
    {
      id: fixture.userId, username: fixture.username, email: fixture.username, enabled: true, emailVerified: true,
      firstName: 'Isolated', lastName: 'Test', requiredActions: [],
      credentials: [{ type: 'password', value: fixture.password, temporary: false }],
      attributes: { organization: [fixture.organization], locale: ['en'] },
      realmRoles: ['owner', 'user'],
      // Realm imports skip the default roles assigned to newly created users.
      clientRoles: { account: ['manage-account', 'view-profile'] },
    },
    // Separate first-attempt/retry identities prevent a consumed invitation or
    // deactivated membership from being reused by a browser retry.
    ...fixture.invitees.map((invitee, index) => ({
      id: invitee.userId, username: invitee.username, email: invitee.username,
      enabled: true, emailVerified: true, firstName: 'Invited', lastName: `Test ${index}`,
      requiredActions: [],
      credentials: [{ type: 'password', value: fixture.password, temporary: false }],
      attributes: { organization: [invitee.organization], locale: ['en'] },
      realmRoles: ['user'],
      clientRoles: { account: ['manage-account', 'view-profile'] },
    })),
    // Exercise the reviewed production permissions, including view-realm for
    // registration role lookup, without development client administration.
    structuredClone(machines[0]),
  ];
  for (const client of realm.clients) {
    if (client.clientId === 'plainledger-api') client.secret = fixture.apiSecret;
    if (client.clientId === 'plainledger-web') {
      client.redirectUris = ['http://localhost:5173/*'];
      client.webOrigins = ['http://localhost:5173'];
      client.directAccessGrantsEnabled = false;
    }
  }
  return realm;
}

if (require.main === module) {
  const directory = path.join(__dirname, '.runtime/realms');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'plainledger-realm.json'), JSON.stringify(buildIsolatedRealm(), null, 2));
  console.log(`Prepared isolated Keycloak realm with one owner and ${fixture.invitees.length} unassigned synthetic invitees.`);
}

module.exports = { buildIsolatedRealm };
