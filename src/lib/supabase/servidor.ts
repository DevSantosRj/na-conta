import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para o servidor, com a sessão do leitor guardada em cookies.
// Usa só a chave pública: o que cada leitor pode ver é decidido pelas regras RLS do banco.
export async function supabaseServidor() {
  const loja = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => loja.set(name, value, options));
        } catch {
          // Em componentes de servidor não dá para gravar cookie; o proxy renova a sessão.
        }
      },
    },
  });
}
