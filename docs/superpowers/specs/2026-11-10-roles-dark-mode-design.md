# Diseño: modo oscuro y vistas por rol (F3)

**Fecha:** 2026-11-10  
**Estado:** propuesta aprobada para implementación  
**Rama prevista:** `feature/f3-andres-roles-dark` (base: `feature/f3-propuesta`)  
**Alcance:** prototipo visual de frontend, sin autenticación real.

## 1. Propósito

Mostrar dos formas de usar ComercioConecta sin cambiar el backend:

- **Administrador:** carga productos y relaciones, y además consulta la red, el explorador y las propuestas.
- **Cliente:** consulta la red, explora productos y recibe propuestas, sin acceso al mostrador de carga.

Además, permitir cambiar entre tema claro y oscuro conservando la identidad visual de "letrero de tienda de barrio".

La separación es **de vista**, no de seguridad. El selector no protege datos ni implementa login. La interfaz debe decirlo explícitamente para no confundir la demostración con control de acceso real.

## 2. Decisiones de alcance

| Decisión | Elección |
|---|---|
| Autenticación | No. Solo estado de UI. |
| Backend | Sin cambios. No se agregan usuarios, sesiones ni permisos. |
| Navegación | Sin router ni rutas nuevas. Un selector de rol en la cabecera. |
| Persistencia | `localStorage` para rol y tema. |
| Tema inicial | Preferencia del sistema (`prefers-color-scheme`), salvo que exista una elección guardada. |
| Rol inicial | `cliente`, salvo que exista una elección guardada. |
| Alcance de módulos | Mostrador solo para administrador; red, explorador y propuestas para ambos. |

## 3. Experiencia

### 3.1 Cabecera

La cabecera conserva marca, estado de la API y toldo. Se agregan dos controles:

- **Selector de rol:** grupo segmentado `Cliente / Administrador`, con `aria-pressed` en la opción activa.
- **Botón de tema:** sol/luna + texto `Modo oscuro` o `Modo claro`, con `aria-pressed`.

Debajo del selector se muestra una ayuda breve: `Vista de demostración: cambia lo que ves, no tus permisos.`

### 3.2 Vista Cliente

Sin `Ledger`.

```
[ cabecera: marca | API | tema | Cliente/Admin ]

[ La red del barrio ]  (ancho completo)

[ Explora la red ] [ Propuesta comercial ]  (dos columnas en escritorio)
```

- La red es el primer contenido y ocupa todo el ancho.
- Explorador y propuestas se muestran debajo, lado a lado en escritorio y apilados en móvil.
- El cliente no ve formularios de alta ni la tabla de relaciones.

### 3.3 Vista Administrador

Conserva el layout actual de dos columnas:

```
[ cabecera: marca | API | tema | Cliente/Admin ]

[ Mostrador ]       [ La red del barrio ]
                    [ Explora la red     ]
                    [ Propuesta comercial]
```

- El administrador ve todo lo del cliente y además el mostrador.
- No se duplican componentes: se reutilizan `Ledger`, `NetworkCanvas`, `Explorer` y `Recommend`.
- Cambiar de rol no debe requerir recargar la página.

### 3.4 Modo oscuro

El tema oscuro no es una inversión automática de colores. Se redefine la paleta para que siga pareciendo un letrero de tienda de noche:

- Fondo general profundo, paneles oscuros y texto marfil.
- Azul de fachada más nocturno.
- Amarillo y rojo se mantienen como acentos.
- Bordes y sombras duras se adaptan para conservar el lenguaje gráfico.
- El canvas del grafo mantiene contraste entre nodos, etiquetas y aristas.

Se aplica con `data-theme="light|dark"` en `<html>` y variables CSS. No se usan colores nuevos hardcodeados dentro de los componentes.

## 4. Estado y persistencia

- `cc-theme`: `light` o `dark`.
- `cc-role`: `cliente` o `administrador`.
- Si el valor guardado es inválido, se usa el valor por defecto.
- El tema se aplica antes del primer render para evitar un destello de tema incorrecto; si se necesita, se agrega un bootstrap mínimo en `index.html`.
- Cambiar de rol no llama al backend ni modifica el grafo. Los componentes que se montan de nuevo vuelven a consultar los datos reales con su `refreshToken` habitual.
- El botón de tema y el selector de rol deben funcionar con teclado y mostrar foco visible.

## 5. Cambios técnicos previstos

- `frontend/src/App.tsx`: estado de tema/rol, cabecera y layouts por rol.
- `frontend/src/components/RoleSwitch.tsx`: selector segmentado accesible.
- `frontend/src/components/ThemeToggle.tsx`: botón de tema accesible.
- `frontend/src/styles.css`: tokens de tema oscuro, controles nuevos, layout cliente y ajustes responsive.
- `frontend/index.html` (solo si hace falta): bootstrap de tema para evitar flash.
- `frontend/src/api/client.ts`: sin cambios.
- `backend/`: sin cambios.
- `README.md` y `docs/aiLog.md`: se actualizan si la propuesta se integra; no son requisito para revisar el prototipo.

## 6. Manejo de errores y estados

- La lógica de API y los mensajes de error existentes no cambian.
- Si el usuario cambia de rol mientras hay una consulta en curso, la vista nueva no debe mostrar resultados de la vista anterior como si fueran propios; el montaje/desmontaje natural de los paneles reinicia su estado local.
- Si `localStorage` no está disponible, la aplicación sigue funcionando con los valores por defecto y no muestra un error técnico al usuario.
- El selector de rol no debe presentarse como login ni como control de seguridad.

## 7. Verificación

- `cd frontend; npm run build` debe pasar.
- Revisión manual en navegador:
  - Cliente no ve `Mostrador`; administrador sí.
  - La red, el explorador y las propuestas siguen consultando la API real.
  - El tema claro y oscuro se ven completos en ambos roles.
  - Recargar conserva tema y rol.
  - Sin preferencia guardada, el tema sigue `prefers-color-scheme` y el rol inicia en `cliente`.
  - Navegación por teclado y foco visible en ambos controles.
  - Vista móvil: controles de cabecera y paneles se apilan sin desbordes.
- No se modifican `acceptanceF1.py`, `acceptanceF2.py` ni el contrato de F3; la regresión de backend no debería cambiar.

## 8. Fuera de alcance

- Login, sesiones, tokens, permisos reales o roles en backend.
- Nuevas rutas, router o URLs compartibles por rol.
- Cambios en el grafo, BFS, recomendador o endpoints.
- Persistencia de datos de usuario.
- Reemplazar el plan oficial F1-F4 o sus tabs; esta rama es una propuesta visual revisable dentro de la entrega F3.
