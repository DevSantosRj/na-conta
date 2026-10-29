import { CONTORNOS } from "@/dados/contornos";
import { ESTADOS, FAIXAS, faixaDe } from "@/dados/estados";
import styles from "./MapaBrasil.module.css";

// Estados pequenos demais para a sigla caber dentro: rótulo fora, com linha guia.
const ROTULO_FORA: Record<string, [number, number]> = {
  RN: [616, 166],
  PB: [616, 188],
  PE: [616, 210],
  AL: [616, 232],
  SE: [616, 254],
  ES: [556, 396],
  RJ: [526, 462],
  DF: [436, 300],
};

const porUF = new Map(ESTADOS.map((e) => [e.uf, e]));

export function MapaBrasil() {
  return (
    <figure className={styles.figura}>
      <svg
        viewBox="0 0 640 639"
        role="img"
        aria-label="Mapa do Brasil por estado, colorido pelo número de deputados federais. Toque em um estado para ver a bancada."
        className={styles.mapa}
      >
        {CONTORNOS.map((c) => {
          const estado = porUF.get(c.uf)!;
          const faixa = faixaDe(estado.deputados);
          return (
            <a key={c.uf} href={`/estado/${c.uf.toLowerCase()}`} className={styles.estado} aria-label={`${estado.nome}: ${estado.deputados} deputados. Ver a bancada`}>
              <path d={c.d} fill={faixa.fundo} stroke="#ffffff" strokeWidth={1} strokeLinejoin="round">
                <title>{`${estado.nome}: ${estado.deputados} deputados`}</title>
              </path>
            </a>
          );
        })}
        <g aria-hidden="true" className={styles.siglas}>
          {CONTORNOS.map((c) => {
            const estado = porUF.get(c.uf)!;
            const fora = ROTULO_FORA[c.uf];
            if (fora) {
              return (
                <g key={c.uf}>
                  <line x1={c.cx} y1={c.cy} x2={fora[0] - 4} y2={fora[1] - 4} stroke="#5b6068" strokeWidth={0.8} />
                  <text x={fora[0]} y={fora[1]} fontSize={12} fill="#15171a">
                    {c.uf}
                  </text>
                </g>
              );
            }
            return (
              <text
                key={c.uf}
                x={c.cx}
                y={c.cy}
                fontSize={c.area > 5000 ? 15 : 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={faixaDe(estado.deputados).sigla}
              >
                {c.uf}
              </text>
            );
          })}
        </g>
      </svg>
      <nav aria-label="Estados" className={styles.listaEstados}>
        {ESTADOS.map((e) => (
          <a key={e.uf} href={`/estado/${e.uf.toLowerCase()}`}>
            {e.uf}
          </a>
        ))}
      </nav>
      <figcaption className={styles.legenda}>
        <span className={styles.legendaTitulo}>Deputados federais:</span>
        {FAIXAS.map((f) => (
          <span key={f.rotulo} className={styles.legendaItem}>
            <span className={styles.amostra} style={{ background: f.fundo }} />
            {f.rotulo}
          </span>
        ))}
      </figcaption>
      <p className={styles.fonte}>
        Fonte: Câmara dos Deputados, 57ª legislatura · Mapa base:{" "}
        <a href="https://github.com/VictorCazanave/svg-maps">svg-maps</a> (CC BY 4.0)
      </p>
    </figure>
  );
}
