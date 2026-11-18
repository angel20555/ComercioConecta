import { useEffect, useState } from "react";
import type { RecommendationsRes } from "../api/client";
import Explorer from "./Explorer";
import Ledger from "./Ledger";
import NetworkCanvas from "./NetworkCanvas";
import Recommend from "./Recommend";

type Props = {
  refreshToken: number;
  onChanged: () => void;
};

export default function Panel({ refreshToken, onChanged }: Props) {
  const [recommendation, setRecommendation] =
    useState<RecommendationsRes | null>(null);

  useEffect(() => {
    // Un alta en el mostrador invalida la propuesta anterior.
    setRecommendation(null);
  }, [refreshToken]);

  return (
    <section className="panel-demo" aria-labelledby="panel-demo-titulo">
      <header className="panel-demo-head">
        <div className="panel-demo-copy">
          <p className="panel-demo-kicker">Panel comercial</p>
          <h2 id="panel-demo-titulo">
            El encargado consulta pan y entiende por qué
          </h2>
          <p className="panel-demo-lede">
            Registra la red, consulta un producto y mira la propuesta resaltada
            en el canvas. Todo sale de la API real; el frontend solo pinta.
          </p>
        </div>

        <ol className="panel-demo-flow" aria-label="Flujo de la demostración">
          <li>
            <span aria-hidden="true">1</span> Registra
          </li>
          <li>
            <span aria-hidden="true">2</span> Consulta
          </li>
          <li>
            <span aria-hidden="true">3</span> Propone
          </li>
        </ol>
      </header>

      <div className="panel-demo-grid">
        <div className="panel-demo-column panel-demo-column--left">
          <Ledger onChanged={onChanged} />
        </div>

        <div className="panel-demo-stage">
          <NetworkCanvas
            refreshToken={refreshToken}
            recommendation={recommendation}
          />

          <aside className="panel-demo-note" aria-label="Cómo leer el canvas">
            <h3>Qué mirar</h3>
            <p>
              El canvas se actualiza con el mostrador y resalta la propuesta.
              Si un producto no tiene relaciones, el panel lo dice sin inventar
              conexiones.
            </p>
          </aside>
        </div>

        <div className="panel-demo-column panel-demo-column--right">
          <Explorer refreshToken={refreshToken} />
          <Recommend refreshToken={refreshToken} onResult={setRecommendation} />
        </div>
      </div>
    </section>
  );
}
