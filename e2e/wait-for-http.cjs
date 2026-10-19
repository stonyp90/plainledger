const target = process.argv[2];
if (!target || !['localhost', '127.0.0.1'].includes(new URL(target).hostname)) {
  throw new Error('This isolated-stack helper accepts loopback HTTP targets only.');
}
async function main() {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        if (target.endsWith('/health/ready')) {
          const value = await response.json();
          if (!['ok', 'ready', 'healthy'].includes(value.status)) throw new Error('Service is not ready');
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
