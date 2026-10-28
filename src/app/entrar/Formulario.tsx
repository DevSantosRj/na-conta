"use client";

import { useActionState } from "react";
import { enviarLink, type EstadoEnvio } from "./acoes";
import styles from "./entrar.module.css";

const inicial: EstadoEnvio = { ok: false, mensagem: "" };

export function Formulario({ proximo }: { proximo: string }) {
  const [estado, enviar, enviando] = useActionState(enviarLink, inicial);

  if (estado.ok) {
    return (
      <p className={styles.sucesso} role="status">
        {estado.mensagem}
      </p>
    );
  }

  return (
    <form action={enviar} className={styles.form} noValidate>
      <input type="hidden" name="proximo" value={proximo} />
      <label htmlFor="email" className={styles.rotulo}>
        Seu e-mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.email}
        className={styles.campo}
        aria-invalid={!!estado.mensagem && !estado.ok}
        aria-describedby={estado.mensagem ? "erro" : undefined}
      />
      <label className={styles.aceite}>
        <input type="checkbox" name="aceite" />
        <span>
          Li e aceito a <a href="/privacidade">política de privacidade</a>. Guardamos só o seu e-mail e quem você segue.
        </span>
      </label>
      {estado.mensagem && (
        <p id="erro" className={styles.erro} role="alert">
          {estado.mensagem}
        </p>
      )}
      <button type="submit" className={styles.botao} disabled={enviando}>
        {enviando ? "Enviando…" : "Enviar link de acesso"}
      </button>
    </form>
  );
}
