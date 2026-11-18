import { useState } from "react";

// Hueco aislado para el cambio de requisito docente (F4-B1).
// Contrato mínimo del plan: props { data: any }.
// Reglas: cero lógica de grafo, cero llamadas a la API, no conoce el
// negocio. Solo pinta lo que reciba; si llega un cambio docente se
// implementa AQUÍ, sin tocar Panel, canvas ni recomendador.

type Props = { data: any };

export default function ChangeSlot({ data }: Props) {
  const [abierto, setAbierto] = useState(false);

  // data == null => hueco vacío, listo para el cambio.
  // data != null => se pinta tal cual (JSON plano), sin interpretarlo.
  const hayData = data !== null && data !== undefined;

  return (
    <section
      aria-label="Zona de cambio docente"
      style={{
        border: "1px dashed #1B7A3D",
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        background: "#FAF6EF",
        color: "#1E1B16",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
          Zona de cambio docente
          {hayData ? " — con datos" : " — sin cambios pendientes"}
        </p>
        {hayData && (
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            style={{
              border: "1px solid #1B7A3D",
              background: "#fff",
              color: "#1B7A3D",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {abierto ? "Ocultar" : "Ver"} datos
          </button>
        )}
      </div>

      <p style={{ margin: "6px 0 0", fontSize: 12 }}>
        Aquí se enchufa el cambio docente sin tocar el núcleo: el resto del
        panel no depende de este bloque.
      </p>

      {hayData && abierto && (
        <pre
          style={{
            margin: "8px 0 0",
            padding: 8,
            background: "#fff",
            border: "1px solid #1E1B16",
            borderRadius: 6,
            fontSize: 12,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}
