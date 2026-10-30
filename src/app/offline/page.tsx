import type { Metadata } from "next";
import { Topo } from "@/components/Topo";
import { TelaErro } from "@/components/TelaErro";
import ui from "@/components/ui.module.css";
import { Recarregar } from "./Recarregar";

export const metadata: Metadata = { title: "Sem conexão", robots: { index: false } };

// Página guardada no aparelho: aparece quando o leitor abre o site sem internet
export default function SemConexao() {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <TelaErro
          titulo="Sem conexão com a internet"
          texto="O Na Conta precisa de internet para mostrar os dados mais recentes. As páginas que você já abriu neste aparelho continuam disponíveis."
        >
          <Recarregar />
        </TelaErro>
      </main>
    </>
  );
}
