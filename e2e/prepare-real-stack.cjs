const fs = require('node:fs');
const path = require('node:path');
const fixture = require('../fixtures/auth/isolated-e2e.json');
const realm = require('../keycloak/realms/plainledger-realm.json');
const directory = path.join(__dirname, '.runtime/realms');
fs.mkdirSync(directory, { recursive: true });
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
  })),
  ...realm.users.filter(user => user.serviceAccountClientId === 'plainledger-api'),
];
for (const client of realm.clients) {
  if (client.clientId === 'plainledger-api') client.secret = fixture.apiSecret;
  if (client.clientId === 'plainledger-web') {
    client.redirectUris = ['http://localhost:5173/*'];
    client.webOrigins = ['http://localhost:5173'];
    client.directAccessGrantsEnabled = false;
  }
}
fs.writeFileSync(path.join(directory, 'plainledger-realm.json'), JSON.stringify(realm, null, 2));
console.log(`Prepared isolated Keycloak realm with one owner and ${fixture.invitees.length} unassigned synthetic invitees.`);
