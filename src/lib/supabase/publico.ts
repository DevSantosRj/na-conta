import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente sem sessão, só para dados públicos (o mesmo para qualquer leitor), por isso pode ir para o cache.
export const supabasePublico = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
