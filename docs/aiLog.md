# Bitácora de uso responsable de IA — ComercioConecta

| Decisión o pieza | Herramienta/objetivo de IA | Propuesta recibida | Acepté o rechacé y por qué | Cómo la verifiqué |
|---|---|---|---|---|
| Reversión a grafo NO-DIRIGIDO simétrico (`adj[A][B]=adj[B][A]`) | Análisis IA del cambio dirigido + adaptación del plan | Revertir a simétrico, reservar dirigido como ADR de F4 | Acepté — es tienda de barrio, no hay un orden claro de compra como en tecnología; lo pensé bien y me di cuenta de mi error | Revisión con equipo |
| Peso = frecuencia co-compra `int>0` default 1, `409` duplicado, `422` inválido, sin auto-+1 | Revisión IA de semántica REST + brief F1 | Rechazar `+1` silencioso, exigir `409`/`422` completas | Acepté porque ya entendimos lo que pedía el proyecto y de 1 en 1 no tiene sentido ya que esto no es una probabilidad; no tenía lógica ingresar 5 veces los mismos productos para aumentar el peso | Revisión con el equipo |
