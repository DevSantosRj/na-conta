"use client";

import { useEffect, useState } from "react";
import styles from "./Conexao.module.css";

// Registra o modo sem internet e avisa quando a conexão cai
export function Conexao() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);
  if (online) return null;
  return (
    <p className={styles.aviso} role="status">
      Sem conexão com a internet. Você está vendo a última versão guardada neste aparelho.
    </p>
  );
}
