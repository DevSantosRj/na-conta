import Link from "next/link";
import { supabaseServidor } from "@/lib/supabase/servidor";
import ui from "@/components/ui.module.css";
import { deixarDeSeguir, seguir } from "./acoes";
import styles from "./parlamentar.module.css";

// Lê a sessão do leitor: por isso fica dentro de um <Suspense> e o resto da página continua em cache.
export async function Seguir({ id, nome }: { id: string; nome: string }) {
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href={`/entrar?proximo=${encodeURIComponent(`/parlamentar/${id}`)}`} className={`${ui.botao} ${styles.seguir}`}>
        Me avise quando votar
      </Link>
    );
  }

  const { data } = await supabase.from("seguindo").select("parlamentar_id").eq("parlamentar_id", id).maybeSingle();

  if (data) {
    return (
      <form action={deixarDeSeguir} className={styles.seguindo}>
        <input type="hidden" name="parlamentar_id" value={id} />
        <span className={styles.seguindoTexto} role="status">
          ✓ Você segue {nome}
        </span>
        <button type="submit" className={ui.botaoSecundario}>
          Deixar de seguir
        </button>
      </form>
    );
  }

  return (
    <form action={seguir}>
      <input type="hidden" name="parlamentar_id" value={id} />
      <button type="submit" className={`${ui.botao} ${styles.seguir}`}>
        Me avise quando votar
      </button>
    </form>
  );
}
