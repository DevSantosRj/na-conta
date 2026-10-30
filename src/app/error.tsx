"use client";

import { useEffect } from "react";
import { Topo } from "@/components/Topo";
import { TelaErro } from "@/components/TelaErro";
import ui from "@/components/ui.module.css";

export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  const codigo = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";
  const semInternet = typeof navigator !== "undefined" && !navigator.onLine;
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <TelaErro
          titulo={semInternet ? "Sem conexão com a internet" : "Não foi possível carregar esta página"}
          texto={
            semInternet
              ? "Verifique o Wi-Fi ou os dados móveis e tente de novo. Nada do que você fez foi perdido."
              : "Pode ser uma instabilidade passageira nas fontes ou no nosso banco de dados. Tente de novo em alguns segundos."
          }
          codigo={codigo || undefined}
        >
          <button type="button" className={ui.botao} onClick={() => retry()}>
            Tentar de novo
          </button>
        </TelaErro>
      </main>
    </>
  );
}
