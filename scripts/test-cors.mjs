import { applyCors } from '../lib/cors.mjs';

function mockRes() {
  const headers = {};
  return {
    statusCode: 0,
    setHeader(k, v) {
      headers[k.toLowerCase()] = v;
    },
    end() {},
    headers,
  };
}

const req = { method: 'OPTIONS', headers: { origin: 'http://127.0.0.1:38492' } };
const res = mockRes();
const handled = applyCors(req, res);

console.log('OPTIONS handled:', handled);
console.log('status:', res.statusCode);
console.log('allow-origin:', res.headers['access-control-allow-origin']);
console.log(handled && res.statusCode === 204 ? 'CORS OK' : 'CORS FAIL');
