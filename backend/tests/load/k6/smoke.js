import { check, sleep } from 'k6';
import http from 'k6/http';
import {
  BASE_URL,
  browseCafes,
  getFirstCafeId,
  login,
} from './helpers.js';

export const options = {
  vus: Number(__ENV.SMOKE_VUS || 3),
  duration: __ENV.SMOKE_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const tokens = login();
  const cafeId = getFirstCafeId();
  return { accessToken: tokens.accessToken, cafeId };
}

export default function (data) {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health returns 200': (res) => res.status === 200,
  });

  const cafes = browseCafes(12);
  check(cafes, {
    'browse cafes returns 200': (res) => res.status === 200,
    'browse cafes payload is paginated': (res) =>
      res.status === 200 && Array.isArray(res.json('data.items')),
  });

  const me = http.get(`${BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${data.accessToken}`,
    },
  });
  check(me, {
    'auth/me returns 200': (res) => res.status === 200,
  });

  const detail = http.get(`${BASE_URL}/api/v1/cafes/${data.cafeId}`);
  check(detail, {
    'cafe detail returns 200': (res) => res.status === 200,
  });

  sleep(1);
}
