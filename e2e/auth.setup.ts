import { test as setup } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { signIn } from './helpers/real-auth';

setup('authenticate through Keycloak with PKCE', async ({ page }) => {
  await signIn(page);
  await mkdir('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
