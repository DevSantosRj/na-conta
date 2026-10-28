"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/servidor";

const ID = /^[CS]-\d+$/;

export async function seguir(dados: FormData) {
  const id = String(dados.get("parlamentar_id") ?? "");
  if (!ID.test(id)) return;
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?proximo=${encodeURIComponent(`/parlamentar/${id}`)}`);
  // A regra RLS "dono segue" só aceita a linha do próprio assinante.
  await supabase.from("seguindo").upsert({ user_id: user.id, parlamentar_id: id }, { onConflict: "user_id,parlamentar_id" });
  revalidatePath(`/parlamentar/${id}`);
  revalidatePath("/alertas");
}

export async function deixarDeSeguir(dados: FormData) {
  const id = String(dados.get("parlamentar_id") ?? "");
  if (!ID.test(id)) return;
  const supabase = await supabaseServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  await supabase.from("seguindo").delete().eq("user_id", user.id).eq("parlamentar_id", id);
  revalidatePath(`/parlamentar/${id}`);
  revalidatePath("/alertas");
}
