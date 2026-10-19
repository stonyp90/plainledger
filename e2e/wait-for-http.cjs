const target = process.argv[2];
if (!target || !['localhost', '127.0.0.1'].includes(new URL(target).hostname)) {
  throw new Error('This isolated-stack helper accepts loopback HTTP targets only.');
}
async function main() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
      if (response.status === 200) {
        // MinIO's /minio/health/ready intentionally returns an empty HTTP 200.
        // Only the application's readiness routes have the JSON dependency contract.
        if (['/health/ready', '/api/health/ready'].includes(new URL(target).pathname)) {
          const value = await response.json();
          if (value.status !== 'ready' || value.checks?.database !== 'connected' || value.checks?.cache !== 'connected') {
            throw new Error('Required application dependencies are not ready');
          }
        }
        console.log(`Ready: ${target}`);
        return;
      }
    } catch { /* The next bounded attempt retries startup only. */ }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for ${target}`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
