import { useEffect, useState } from "react";
import { apiGet } from "./api/client";
import ClientShowcase from "./components/ClientShowcase";
import Ledger from "./components/Ledger";
import NetworkCanvas from "./components/NetworkCanvas";
import Explorer from "./components/Explorer";
import Recommend from "./components/Recommend";
import RoleSwitch from "./components/RoleSwitch";
import ThemeToggle from "./components/ThemeToggle";
import {
  initialRole,
  initialTheme,
  persistRole,
  persistTheme,
  type Role,
  type Theme,
} from "./lib/preferences";

type Health = { status: string };

export default function App() {
  const [health, setHealth] = useState<"conectando" | "ok" | "error">(
    "conectando",
  );
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [role, setRole] = useState<Role>(initialRole);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    persistRole(role);
  }, [role]);

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

  const isAdmin = role === "administrador";

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

          <div className="masthead-controls">
            <div className="status" role="status">
              <span
                className="status-dot"
                data-state={health}
                aria-hidden="true"
              />
              <span>
                {estado}
                <small>127.0.0.1:8000</small>
              </span>
            </div>
            <RoleSwitch role={role} onChange={setRole} />
            <ThemeToggle
              theme={theme}
              onToggle={() =>
                setTheme((actual) => (actual === "dark" ? "light" : "dark"))
              }
            />
          </div>
        </div>
      </header>

      <div className="awning" aria-hidden="true" />

      <main className="page" id="contenido">
        <p className="role-note" role="status">
          <strong>{isAdmin ? "Vista administrador" : "Vista cliente"}</strong>
          <span>
            {isAdmin
              ? "Gestión del mostrador y consulta de la red."
              : "Descubre qué se compra junto en el barrio."}
          </span>
          <span className="role-note__hint">
            Vista de demostración: cambia lo que ves, no tus permisos.
          </span>
        </p>

        {error !== null && (
          <p className="notice notice--error" role="alert">
            <strong>No se pudo hablar con el backend.</strong> Arráncalo desde{" "}
            <code>backend/</code> con{" "}
            <code>uvicorn app.main:app --port 8000</code>. Detalle: {error}
          </p>
        )}

        {isAdmin ? (
          <div className="workspace workspace--admin">
            <div className="column">
              <Ledger onChanged={() => setToken((t) => t + 1)} />
            </div>

            <div className="column">
              <NetworkCanvas refreshToken={token} />
              <Explorer refreshToken={token} />
              <Recommend refreshToken={token} />
            </div>
          </div>
        ) : (
          <ClientShowcase refreshToken={token} />
        )}
      </main>

      <footer className="footer">
        <p>
          Datos sintéticos de barrio: no hay clientes reales, precios ni
          campañas. Las relaciones viven en el backend; esta pantalla solo
          consulta y muestra.
        </p>
      </footer>
    </>
  );
}
