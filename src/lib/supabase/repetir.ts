// Leituras do banco com nova tentativa: falhas de rede e respostas 5xx/429 repetem até 2 vezes
// (0,3 s e 0,9 s). Escritas (POST/PATCH/DELETE) nunca repetem, para não gravar duas vezes;
// a exceção são as funções de só leitura chamadas por POST.
const ESPERAS = [300, 900];
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fetchComRepeticao: typeof fetch = async (entrada, init) => {
  const metodo = (init?.method ?? (entrada instanceof Request ? entrada.method : "GET")).toUpperCase();
  const url = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  // As funções do banco chamadas por POST (busca, concordância) só leem: também podem repetir
  const leitura = metodo === "GET" || metodo === "HEAD" || /\/rest\/v1\/rpc\/(buscar_proposicoes|concordancia)\b/.test(url);
  for (let tentativa = 0; ; tentativa++) {
    try {
      const r = await fetch(entrada, init);
      const transitorio = r.status >= 500 || r.status === 429;
      if (!leitura || !transitorio || tentativa >= ESPERAS.length) return r;
    } catch (e) {
      if (!leitura || tentativa >= ESPERAS.length || init?.signal?.aborted) throw e;
    }
    await espera(ESPERAS[tentativa]);
  }
};
