"use strict";

/* Sliding-window per-key rate limiter (in-memory — fine for one box). */
function createRateLimiter(opts) {
  const options = Object.assign({ windowMs: 15 * 60 * 1000, max: 5 }, opts);
  const hits = new Map();
  const timer = setInterval(function () {
    const now = Date.now();
    const it = hits.entries();
    let cur = it.next();
    while (!cur.done) {
      const fresh = cur.value[1].filter(function (t) { return now - t < options.windowMs; });
      if (fresh.length) hits.set(cur.value[0], fresh); else hits.delete(cur.value[0]);
      cur = it.next();
    }
  }, options.windowMs);
  if (timer.unref) timer.unref();

  function getFreshHits(key, now) {
    return (hits.get(key) || []).filter(function (t) { return now - t < options.windowMs; });
  }

  return {
    isLimited: function (key) {
      const now = Date.now();
      const arr = getFreshHits(key, now);
      arr.push(now);
      hits.set(key, arr);
      return arr.length > options.max;
    },
    checkLimit: function (key) {
      const now = Date.now();
      const arr = getFreshHits(key, now);
      return arr.length >= options.max;
    },
    recordFailure: function (key) {
      const now = Date.now();
      const arr = getFreshHits(key, now);
      arr.push(now);
      hits.set(key, arr);
      return arr.length >= options.max;
    },
    reset: function (key) {
      if (key) {
        hits.delete(key);
      } else {
        hits.clear();
      }
    },
    getRemainingSeconds: function (key) {
      const now = Date.now();
      const arr = getFreshHits(key, now);
      if (arr.length === 0) return 0;
      const oldest = arr[0];
      const remainingMs = Math.max(0, options.windowMs - (now - oldest));
      return Math.ceil(remainingMs / 1000);
    },
    setOptions: function (newOpts) {
      if (newOpts.windowMs !== undefined) options.windowMs = newOpts.windowMs;
      if (newOpts.max !== undefined) options.max = newOpts.max;
    },
    stop: function () { clearInterval(timer); }
  };
}

module.exports = { createRateLimiter: createRateLimiter };

