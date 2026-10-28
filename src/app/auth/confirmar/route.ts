import { NextResponse, type NextRequest } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

// O link mágico do e-mail cai aqui com um código de uso único; trocamos por uma sessão
// e devolvemos o leitor para onde ele estava (só caminhos internos).
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  const pedido = request.nextUrl.searchParams.get("proximo") ?? "";
  const proximo = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : "/alertas";
  if (codigo) {
    const supabase = await supabaseServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(proximo, request.url));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", request.url));
}
