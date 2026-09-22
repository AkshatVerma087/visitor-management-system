const http = require('http');

const API_URL = 'http://localhost:4000/api';
let passed = 0;
let failed = 0;

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (err) {
    return { status: 500, error: err.message };
  }
}

function assert(condition, message, data = null) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    if (data) console.error(`   Data:`, JSON.stringify(data));
    failed++;
  }
}

async function runAudit() {
  console.log('🚀 Starting API Audit...');

  // 1. PUBLIC EMPLOYEE ROUTES
  const officesRes = await request('GET', '/employees/offices');
  assert(officesRes.status === 200, 'GET /employees/offices should return 200', officesRes);
  
  const hostsRes = await request('GET', '/employees/hosts');
  assert(hostsRes.status === 200, 'GET /employees/hosts should return 200', hostsRes);

  // 2. AUTHENTICATION & PROTECTED ROUTES
  // Attempt to hit protected route without auth
  const meUnauthorized = await request('GET', '/auth/me');
  assert(meUnauthorized.status === 401, 'GET /auth/me without token should return 401 Unauthorized', meUnauthorized);

  const adminUnauthorized = await request('GET', '/admin/stats');
  assert(adminUnauthorized.status === 401, 'GET /admin/stats without token should return 401', adminUnauthorized);

  // Register a test user
  const testEmail = `test.audit.${Date.now()}@example.com`;
  const registerRes = await request('POST', '/auth/register', {
    name: 'Audit Test',
    email: testEmail,
    password: 'password123',
    role: 'Admin',
    office_id: officesRes.data[0]?.id || null
  });
  assert(registerRes.status === 201 || registerRes.status === 400, 'POST /auth/register should work or return 400 if exists', registerRes);

  // Login
  const loginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: 'password123'
  });
  assert(loginRes.status === 200 && loginRes.data.token, 'POST /auth/login should return a valid JWT token', loginRes);

  const token = loginRes.data?.token;

  // Protected Route with Token
  const meAuthorized = await request('GET', '/auth/me', null, token);
  assert(meAuthorized.status === 200, 'GET /auth/me with token should return 200 OK', meAuthorized);

  // Admin Route with Admin Token
  const adminStats = await request('GET', '/admin/stats', null, token);
  assert(adminStats.status === 200, 'GET /admin/stats with Admin token should return 200 OK', adminStats);

  const adminEmps = await request('GET', '/admin/employees', null, token);
  assert(adminEmps.status === 200, 'GET /admin/employees with Admin token should return 200 OK', adminEmps);

  // 3. KIOSK PUBLIC ROUTES (Walk-ins)
  const walkInRes = await request('POST', '/visitors/walk-in', {
    visitor_name: 'Walkin Test',
    visitor_email: `walkin.${Date.now()}@example.com`,
    host_id: hostsRes.data[0]?.id || null,
    photo_url: 'http://example.com/photo.jpg',
    duration_hours: 2
  });
  assert(walkInRes.status === 201 || walkInRes.status === 200, 'POST /visitors/walk-in should register visitor', walkInRes);

  console.log(`\n📊 Audit Complete: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runAudit();
