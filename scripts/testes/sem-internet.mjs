// Teste da etapa 5: abrir o site com o "celular em modo avião".
// 1) Visita páginas com internet (o site guarda cópias no aparelho).
// 2) Corta a internet e reabre: páginas já vistas aparecem; uma nunca vista mostra "Sem conexão".
import { chromium, devices } from "playwright";

const BASE = process.env.BASE ?? "https://na-conta-mu.vercel.app";
const navegador = await chromium.launch();
const ctx = await navegador.newContext({ ...devices["Pixel 7"] });
const pag = await ctx.newPage();
const linhas = [];
const ok = (nome, cond, extra = "") => linhas.push(`${cond ? "PASSOU" : "FALHOU"} · ${nome}${extra ? ` · ${extra}` : ""}`);

await pag.goto(`${BASE}/`, { waitUntil: "networkidle" });
await pag.waitForFunction(() => navigator.serviceWorker?.controller != null || navigator.serviceWorker?.ready, null, { timeout: 15000 }).catch(() => {});
await pag.reload({ waitUntil: "networkidle" }); // a partir daqui o service worker controla a página
await pag.goto(`${BASE}/estado/rj`, { waitUntil: "networkidle" });
const controlado = await pag.evaluate(() => !!navigator.serviceWorker?.controller);
ok("service worker ativo", controlado);

await ctx.setOffline(true);
await pag.goto(`${BASE}/estado/rj`).catch(() => {});
const t1 = await pag.locator("h1").first().textContent().catch(() => "");
ok("sem internet: página já vista abre", /Rio de Janeiro/.test(t1 ?? ""), `título "${t1}"`);
const aviso = await pag.getByText("Sem conexão com a internet").first().isVisible().catch(() => false);
ok("sem internet: aviso no topo", aviso);

await pag.goto(`${BASE}/estado/ac`).catch(() => {});
const t2 = await pag.locator("h1").first().textContent().catch(() => "");
ok("sem internet: página nunca vista mostra 'Sem conexão'", /Sem conexão/.test(t2 ?? ""), `título "${t2}"`);

await pag.goto(`${BASE}/alertas`).catch(() => {});
const t3 = await pag.locator("h1").first().textContent().catch(() => "");
ok("sem internet: Meus alertas não fica guardado", !/alertas/i.test(t3 ?? "") || /Sem conexão/.test(t3 ?? ""), `título "${t3}"`);

await ctx.setOffline(false);
await pag.goto(`${BASE}/estado/ac`, { waitUntil: "networkidle" });
const t4 = await pag.locator("h1").first().textContent().catch(() => "");
ok("internet de volta: página carrega", /Acre/.test(t4 ?? ""), `título "${t4}"`);

await navegador.close();
console.log(linhas.join("\n"));
