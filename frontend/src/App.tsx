import { useEffect, useState } from "react";
import { apiGet } from "./api/client";
import Ledger from "./components/Ledger";
import NetworkCanvas from "./components/NetworkCanvas";

type Health = { status: string };

const VERDE = "#1B7A3D";
const PAPEL = "#FAF6EF";
const TINTA = "#1E1B16";

export default function App() {
  const [health, setHealth] = useState<string>("conectando...");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    apiGet<Health>("/health")
      .then((data) => {
        setHealth(data.status);
        setError(null);
      })
      .catch((e: unknown) => {
        setHealth("sin conexión");
        setError(e instanceof Error ? e.message : "error desconocido");
      });
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", background: PAPEL, color: TINTA, minHeight: "100vh", padding: "1rem" }}>
      <h1 style={{ color: VERDE, margin: "0 0 4px" }}>ComercioConecta — red inicial</h1>
      <p style={{ margin: "0 0 12px" }}>
        Backend <code>http://localhost:8000</code> — estado: <strong>{health}</strong>
      </p>
      {error !== null && (
        <p role="alert">
          No se pudo alcanzar el backend. Arranca con{" "}
          <code>uvicorn app.main:app --port 8000</code> desde <code>backend/</code>. Detalle: {error}
        </p>
      )}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "0 1 360px", minWidth: 300 }}>
          <Ledger onChanged={() => setToken((t) => t + 1)} />
        </div>
        <div style={{ flex: "1 1 420px", minWidth: 320 }}>
          <NetworkCanvas refreshToken={token} />
        </div>
      </div>
    </main>
  );
}
