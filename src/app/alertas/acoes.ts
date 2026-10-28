"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/servidor";

export async function mudarFrequencia(dados: FormData) {
  const frequencia = dados.get("frequencia");
  if (frequencia !== "diario" && frequencia !== "semanal") return;
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  // A regra RLS "dono altera" garante que só a linha do próprio assinante muda.
  await supabase.from("perfis").update({ frequencia }).eq("user_id", user.id);
  revalidatePath("/alertas");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/");
}
