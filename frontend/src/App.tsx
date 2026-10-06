import { useEffect, useState } from "react";
import { apiGet } from "./api/client";

type Health = { status: string };

export default function App() {
  const [health, setHealth] = useState<string>("conectando...");
  const [error, setError] = useState<string | null>(null);

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
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>ComercioConecta — conecta backend</h1>
      <p>
        Backend <code>http://localhost:8000</code> — estado: <strong>{health}</strong>
      </p>
      {error !== null && (
        <p role="alert">
          No se pudo alcanzar el backend. Arranca con{" "}
          <code>uvicorn app.main:app --port 8000</code> desde <code>backend/</code>. Detalle:{" "}
          {error}
        </p>
      )}
    </main>
  );
}
