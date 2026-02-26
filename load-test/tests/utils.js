import { check } from 'k6';

/**
 * Assert response status is 200 and optionally log on failure.
 */
export function checkStatus(response) {
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  if (response.status !== 200) {
    console.log(response.url, response.status, response.status_text);
  }
}

/**
 * Assert response status is one of the allowed codes (e.g. 200, 201, 204).
 */
export function checkStatusOk(response, allowed = [200, 201, 204]) {
  const ok = allowed.includes(response.status);
  check(response, { 'status is success': () => ok });
  if (!ok) {
    console.log(response.url, response.status, response.status_text);
  }
}
