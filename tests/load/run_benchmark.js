/**
 * Automated High-Concurrency Benchmark Runner
 * Measures RPS, p50, p95, p99 latencies, and error rates.
 */
const http = require('http');

const BASE_URL = 'http://localhost:4000';

function makeRequest(options, postData = null) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1e6;
        resolve({
          statusCode: res.statusCode,
          latencyMs,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      const latencyMs = Number(end - start) / 1e6;
      resolve({
        statusCode: 500,
        latencyMs,
        error: err.message,
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runScenario(name, count, concurrency, requestFn) {
  console.log(`\n=== Running Benchmark: ${name} (${count} requests, ${concurrency} concurrent) ===`);
  const latencies = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();
  let index = 0;

  async function worker() {
    while (index < count) {
      const current = index++;
      const result = await requestFn(current);
      latencies.push(result.latencyMs);
      if (result.statusCode >= 200 && result.statusCode < 400) {
        successful++;
      } else {
        failed++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const totalDurationSec = (Date.now() - startTime) / 1000;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1);
  const rps = count / totalDurationSec;

  console.log(`Duration:       ${totalDurationSec.toFixed(2)}s`);
  console.log(`Throughput:     ${rps.toFixed(1)} req/s`);
  console.log(`Success Rate:   ${((successful / count) * 100).toFixed(1)}% (${successful}/${count})`);
  console.log(`Latency Avg:    ${avg.toFixed(2)} ms`);
  console.log(`Latency p50:    ${p50.toFixed(2)} ms`);
  console.log(`Latency p90:    ${p90.toFixed(2)} ms`);
  console.log(`Latency p95:    ${p95.toFixed(2)} ms`);
  console.log(`Latency p99:    ${p99.toFixed(2)} ms`);

  return { name, count, concurrency, rps, avg, p50, p90, p95, p99, successful, failed };
}

async function main() {
  console.log('Testing connection to Whispr backend...');
  const healthCheck = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/health',
    method: 'GET',
  });

  if (healthCheck.statusCode !== 200) {
    console.error('Whispr API is not running on localhost:4000. Start backend server first.');
    process.exit(1);
  }

  // 1. Health Probe Benchmark
  const healthResults = await runScenario('Health Check Probes (DB + Redis Ping)', 300, 20, () =>
    makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/health',
      method: 'GET',
    })
  );

  // 2. Obtain Alice Token
  const loginRes = await makeRequest(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    JSON.stringify({ identifier: 'alice', password: 'Password123!' })
  );

  const loginData = JSON.parse(loginRes.body);
  const token = loginData?.data?.accessToken;

  let profileResults = null;
  let channelsResults = null;

  if (token) {
    // 3. Cached Profile Lookup
    profileResults = await runScenario('Cached User Profile (/api/v1/users/profile/me)', 300, 20, () =>
      makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/users/profile/me',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    // 4. Public Channel Discovery with Indexed Joins
    channelsResults = await runScenario('Public Channel Discovery (/api/v1/groups/channels/public)', 200, 15, () =>
      makeRequest({
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/groups/channels/public',
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    );
  }

  console.log('\n=============================================');
  console.log('BENCHMARK RUN COMPLETE');
  console.log('=============================================');
}

main().catch(console.error);
