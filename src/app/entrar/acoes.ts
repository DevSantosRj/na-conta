"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseServidor } from "@/lib/supabase/servidor";

export type EstadoEnvio = { ok: boolean; mensagem: string; email?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const resumo = (v: string) => createHash("sha256").update(`na-conta:${v}`).digest("hex");
const SUCESSO = "Confira seu e-mail: enviamos um link que vale por 1 hora.";

export async function enviarLink(_anterior: EstadoEnvio, dados: FormData): Promise<EstadoEnvio> {
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const aceite = dados.get("aceite") === "on";
  const pedido = String(dados.get("proximo") ?? "");
  const proximo = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/alertas";

  if (!EMAIL.test(email)) return { ok: false, mensagem: "Digite um e-mail válido.", email };
  if (!aceite) return { ok: false, mensagem: "Para receber alertas, aceite a política de privacidade.", email };
  // Campo invisível para pessoas: robôs que preenchem tudo recebem a mesma resposta, mas nada é enviado
  if (String(dados.get("site") ?? "") !== "") return { ok: true, mensagem: SUCESSO, email };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconhecido";
  const origem = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await supabaseServidor();
  // Limite próprio: 3 links por e-mail e 10 por conexão a cada hora (só guarda o resumo, nunca o e-mail ou o IP)
  const { data: liberado, error: erroLimite } = await supabase.rpc("pode_enviar_link", { email_hash: resumo(email), ip_hash: resumo(ip) });
  if (erroLimite) return { ok: false, mensagem: "Não conseguimos enviar o link agora. Tente de novo em instantes.", email };
  if (!liberado) return { ok: false, mensagem: "Muitos pedidos de link para este e-mail ou esta conexão. Tente de novo em 1 hora.", email };

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
  return { ok: true, mensagem: SUCESSO, email };
}
