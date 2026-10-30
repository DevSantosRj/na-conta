import Link from "next/link";
import { Topo } from "@/components/Topo";
import { TelaErro } from "@/components/TelaErro";
import ui from "@/components/ui.module.css";

export default function NaoEncontrada() {
  return (
    <>
      <Topo />
      <main className={ui.pagina}>
        <title>Página não encontrada · Na Conta</title>
        <TelaErro
          titulo="Página não encontrada"
          texto="O endereço pode estar errado, ou o parlamentar, a votação ou o município não existe no nosso banco."
        >
          <Link href="/busca" className={ui.botao}>
            Procurar
          </Link>
        </TelaErro>
      </main>
    </>
  );
}
