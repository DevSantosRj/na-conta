import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para o servidor, com a sessão do leitor guardada em cookies.
// Usa só a chave pública: o que cada leitor pode ver é decidido pelas regras RLS do banco.
export async function supabaseServidor() {
  const loja = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
