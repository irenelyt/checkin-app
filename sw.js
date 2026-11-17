/* 双计划打卡台 · Service Worker：网络优先，离线兜底 */
const CACHE = "checkin-v3";
const ASSETS = ["./daily-checkin.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin !== location.origin) return; // 外部资源走网络
  // HTML 页面：网络优先（保证更新立刻可见），断网才用缓存
  if (e.request.mode === "navigate" || (e.request.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./daily-checkin.html")))
    );
    return;
  }
  // 其他静态资源：缓存优先（图标等基本不变）
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(res => {
        if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
        return res;
      })
    )
  );
});
