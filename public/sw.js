// Na Conta — funcionamento sem internet.
// Páginas: busca na rede primeiro; sem rede, usa a última cópia guardada ou a página "Sem conexão".
// Arquivos de /_next/static (nomes mudam a cada versão): guardados na primeira visita.
// Páginas com dados pessoais (login, alertas) nunca são guardadas.
const VERSAO = "na-conta-v2";
const OFFLINE = "/offline";
const PESSOAIS = /^\/(alertas|entrar|auth)(\/|$)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.add(new Request(OFFLINE, { cache: "reload" }))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((r) => {
            if (r.ok) caches.open(VERSAO).then((c) => c.put(req, r.clone()));
            return r;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    const pessoal = PESSOAIS.test(url.pathname);
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r.ok && !pessoal) {
            const copia = r.clone();
            e.waitUntil(caches.open(VERSAO).then((c) => c.put(url.pathname + url.search, copia)));
          }
          return r;
        })
        .catch(
          async () =>
            (!pessoal && (await caches.match(url.pathname + url.search, { ignoreVary: true }))) ||
            (await caches.match(OFFLINE, { ignoreVary: true })) ||
            Response.error(),
        ),
    );
  }
});
