import http from 'k6/http';
import { sleep, check } from 'k6';

let vus = __ENV.VUS;
export let options = {
  stages: [
    { duration: "30s", target: vus }, // simulate ramp-up of traffic from 1 to max users over 30 s.
    { duration: "120s", target: vus }, // stay at max users for 30 s
  ],
  thresholds: {
    'http_req_duration': ['p(99)<100'], // 99% of requests must complete below 100ms
  }
};

const refIds = ['A', 'B', 'C', 'D'];

export default function() {
  var refId = refIds[Math.floor(refIds.length * Math.random())];
  let userId = __VU;

  postContributeEvent(refId, userId);

  if (__ITER % 100 === 0 && __VU % 50 === 0) {
    postRedemptionEvent(refId, userId);
  }

  let url = 'http://127.0.0.1:3000/jackpots';
  let res = http.get(url);
  check(res, {
    'get jackpots returns 200': (r) => r.status === 200,
  });

  sleep(1);
}

function postEvent(event) {
  let headers = {'Content-Type': 'application/json'};
  let url = 'http://127.0.0.1:3000/events';
  return http.post(url, JSON.stringify(event), {headers: headers});
}

function postContributeEvent(refId, userId) {
  let contributeEvent = {
    "refId": refId,
    "userId": userId,
    "type": "contribute",
    "value": Math.round(100 * Math.random())
  };

  let res = postEvent(contributeEvent);

  check(res, {
    'post contribute event returns 201': (r) => r.status === 201,
  });
}

function postRedemptionEvent(refId, userId) {
  let redemptionEvent = {
    "refId": refId,
    "userId": userId,
    "type": "redeem"
  };

  let res = postEvent(redemptionEvent);
  
  check(res, {
    'post redemption event returns 201': (r) => r.status === 201,
  });
}