"use client";

import ui from "@/components/ui.module.css";

export function Recarregar() {
  return (
    <button type="button" className={ui.botao} onClick={() => location.reload()}>
      Tentar de novo
    </button>
  );
}
