"use server";

import { headers } from "next/headers";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type EstadoEnvio = { ok: boolean; mensagem: string; email?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function enviarLink(_anterior: EstadoEnvio, dados: FormData): Promise<EstadoEnvio> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const aceite = dados.get("aceite") === "on";
  const pedido = String(dados.get("proximo") ?? "");
  const proximo = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/alertas";

  if (!EMAIL.test(email)) return { ok: false, mensagem: "Digite um e-mail válido.", email };
  if (!aceite) return { ok: false, mensagem: "Para receber alertas, aceite a política de privacidade.", email };

  const h = await headers();
  const origem = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origem}/auth/confirmar?proximo=${encodeURIComponent(proximo)}`, shouldCreateUser: true },
  });

  if (error) {
    const limite = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      ok: false,
      mensagem: limite ? "Muitas tentativas. Espere 1 minuto e tente de novo." : "Não conseguimos enviar o link agora. Tente de novo em instantes.",
      email,
    };
  }
  return { ok: true, mensagem: "Confira seu e-mail: enviamos um link que vale por 1 hora.", email };
}
