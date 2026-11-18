import { useEffect, useState, type KeyboardEvent } from "react";
import { apiErrorMessage, apiGet } from "./api/client";
import ClientShowcase from "./components/ClientShowcase";
import Explorer from "./components/Explorer";
import Ledger from "./components/Ledger";
import Panel from "./components/Panel";
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

type AdminTab = "red" | "explora" | "propuesta" | "panel";

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
  { id: "red", label: "Red" },
  { id: "explora", label: "Explora" },
  { id: "propuesta", label: "Propuesta" },
  { id: "panel", label: "Panel" },
];

function tabId(id: AdminTab): string {
  return `admin-tab-${id}`;
}

function tabPanelId(id: AdminTab): string {
  return `admin-tabpanel-${id}`;
}

export default function App() {
  const [health, setHealth] = useState<"conectando" | "ok" | "error">(
    "conectando",
  );
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [role, setRole] = useState<Role>(initialRole);
  // La entrada al panel de administración abre en la vista completa.
  const [adminTab, setAdminTab] = useState<AdminTab>("panel");

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
        setError(apiErrorMessage(e));
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

  function onAdminTabKeyDown(
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const total = ADMIN_TABS.length;
    let nextIndex: number | null = null;

    if (e.key === "ArrowRight") nextIndex = (index + 1) % total;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + total) % total;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = total - 1;

    if (nextIndex === null) return;

    e.preventDefault();
    const next = ADMIN_TABS[nextIndex];
    setAdminTab(next.id);
    requestAnimationFrame(() => {
      document.getElementById(tabId(next.id))?.focus();
    });
  }

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
          <section className="admin-tabs" aria-label="Secciones del panel">
            <div
              className="admin-tablist"
              role="tablist"
              aria-label="Secciones del panel de administración"
            >
              {ADMIN_TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  id={tabId(tab.id)}
                  className="admin-tab"
                  type="button"
                  role="tab"
                  aria-selected={adminTab === tab.id}
                  aria-controls={tabPanelId(tab.id)}
                  tabIndex={adminTab === tab.id ? 0 : -1}
                  onClick={() => setAdminTab(tab.id)}
                  onKeyDown={(e) => onAdminTabKeyDown(e, index)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {ADMIN_TABS.map((tab) => {
              const active = adminTab === tab.id;

              return (
                <div
                  key={tab.id}
                  className={`admin-tabpanel${
                    tab.id === "panel" ? "" : " admin-tabpanel--single"
                  }`}
                  id={tabPanelId(tab.id)}
                  role="tabpanel"
                  aria-labelledby={tabId(tab.id)}
                  hidden={!active}
                  tabIndex={active ? 0 : undefined}
                >
                  {active && tab.id === "red" && (
                    <Ledger
                      refreshToken={token}
                      onChanged={() => setToken((t) => t + 1)}
                    />
                  )}

                  {active && tab.id === "explora" && (
                    <Explorer refreshToken={token} />
                  )}

                  {active && tab.id === "propuesta" && (
                    <Recommend refreshToken={token} />
                  )}

                  {active && tab.id === "panel" && (
                    <Panel
                      refreshToken={token}
                      onChanged={() => setToken((t) => t + 1)}
                    />
                  )}
                </div>
              );
            })}
          </section>
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
