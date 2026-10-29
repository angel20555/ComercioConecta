import { useEffect, useState } from "react";
import { apiGet } from "./api/client";
import Ledger from "./components/Ledger";
import NetworkCanvas from "./components/NetworkCanvas";
import Explorer from "./components/Explorer";

type Health = { status: string };

export default function App() {
  const [health, setHealth] = useState<"conectando" | "ok" | "error">(
    "conectando",
  );
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    let vivo = true;
    apiGet<Health>("/health")
      .then((data) => {
        if (!vivo) return;
        setHealth(data.status === "ok" ? "ok" : "error");
        setError(null);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        setHealth("error");
        setError(e instanceof Error ? e.message : "error desconocido");
      });
    return () => {
      vivo = false;
    };
  }, []);

  const estado =
    health === "ok"
      ? "API conectada"
      : health === "error"
        ? "API sin conexión"
        : "Conectando con la API";

  return (
    <>
      <a className="skip-link" href="#contenido">
        Ir al contenido
      </a>

      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 60 60" aria-hidden="true">
              <path
                d="M19 39 42 37M19 39 27 21M36 20 45 33"
                stroke="#fbf7ec"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="14" cy="44" r="8" fill="#f4c442" />
              <circle cx="46" cy="40" r="8" fill="#fbf7ec" />
              <circle cx="30" cy="14" r="8" fill="#d2452f" />
            </svg>
            <div>
              <h1>ComercioConecta</h1>
              <p>La red de co-compra de las tiendas de barrio</p>
            </div>
          </div>

          <div className="status" role="status">
            <span className="status-dot" data-state={health} aria-hidden="true" />
            <span>
              {estado}
              <small>127.0.0.1:8000</small>
            </span>
          </div>
        </div>
      </header>

      <div className="awning" aria-hidden="true" />

      <main className="page" id="contenido">
        {error !== null && (
          <p className="notice notice--error" role="alert">
            <strong>No se pudo hablar con el backend.</strong> Arráncalo desde{" "}
            <code>backend/</code> con{" "}
            <code>uvicorn app.main:app --port 8000</code>. Detalle: {error}
          </p>
        )}

        <div className="workspace">
          <div className="column">
            <Ledger onChanged={() => setToken((t) => t + 1)} />
          </div>

          <div className="column">
            <NetworkCanvas refreshToken={token} />
            <Explorer />
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>
          Datos sintéticos de barrio: no hay clientes reales, precios ni
          campañas. El grafo y sus recorridos viven en el backend; esta pantalla
          solo consulta y dibuja.
        </p>
      </footer>
    </>
  );
}
