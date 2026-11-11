# Modo oscuro y vistas por rol (F3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un selector visual Cliente/Administrador y un tema claro/oscuro persistente a la app F3, sin login ni cambios de backend.

**Architecture:** `App.tsx` se convierte en el shell que mantiene tema y rol. Las preferencias viven en `localStorage` y se aplican con `data-theme` en `<html>`; los layouts de cliente y administrador reutilizan los componentes existentes. El tema oscuro se implementa con variables CSS y overrides semánticos, no con colores nuevos dentro de cada componente.

**Tech Stack:** React 18, TypeScript, Vite 6, CSS propio. Sin dependencias nuevas, sin router, sin autenticación.

**Spec:** `docs/superpowers/specs/2026-11-10-roles-dark-mode-design.md`

## Global Constraints

- Rama de trabajo: `feature/f3-andres-roles-dark`; base: `feature/f3-propuesta`.
- No tocar `backend/`, endpoints, `acceptanceF1.py`, `acceptanceF2.py` ni el contrato F3.
- No agregar login, sesiones, permisos reales ni router.
- No agregar dependencias nuevas.
- Rol inicial: `cliente`; valores válidos: `cliente` y `administrador`.
- Tema inicial: preferencia guardada, si no `prefers-color-scheme`; valores válidos: `light` y `dark`.
- Claves exactas de `localStorage`: `cc-theme` y `cc-role`.
- Cliente no debe renderizar `Ledger`; administrador debe renderizar los cuatro paneles.
- Mantener el fetch real al backend; cero lógica de grafo en TypeScript.
- Verificación de frontend: `cd frontend; npm run build`.
- No existe runner de tests de frontend; no agregar uno. La verificación visual es manual en navegador.

## Review Focus

1. **Primer render oscuro:** si el usuario guardó `dark`, no debe aparecer un flash claro antes de montar React. El script de `index.html` debe fijar `data-theme` antes del módulo.
2. **Contraste en superficies amarillas/azules:** botones, opción de rol activa, cabecera de Mostrador y nodos del grafo deben seguir legibles en oscuro; no alcanza con invertir `--tinta`.
3. **Aislamiento del cliente:** `Ledger` no debe existir en el DOM cuando el rol es `cliente`, ni siquiera oculto con CSS.
4. **Storage inválido o bloqueado:** valores desconocidos o `localStorage` que lanza excepción no deben romper la app; se usan los defaults.
5. **Cambio de rol con consulta en curso:** la vista nueva no debe conservar un resultado viejo como si perteneciera al rol nuevo; el remontaje de paneles debe reiniciar su estado local.

---

### Task 1: Preferencias y control de tema

**Files:**
- Create: `frontend/src/lib/preferences.ts`
- Create: `frontend/src/components/ThemeToggle.tsx`
- Modify: `frontend/index.html`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: `export type Theme = "light" | "dark";`
- Produces: `export function initialTheme(): Theme;`
- Produces: `export function persistTheme(theme: Theme): void;`
- Produces: `export default function ThemeToggle(props: { theme: Theme; onToggle: () => void }): JSX.Element;`

- [ ] **Step 1: Crear `preferences.ts` con lectura segura y defaults**

Implementar las funciones tipadas. `initialTheme()` debe revisar primero `document.documentElement.dataset.theme` (puesto por el bootstrap), luego `localStorage.getItem("cc-theme")`, luego `matchMedia("(prefers-color-scheme: dark)")`; si todo falla, `light`. `persistTheme()` debe escribir `data-theme`, `document.documentElement.style.colorScheme` y `localStorage`, envolviendo storage en `try/catch`.

- [ ] **Step 2: Agregar bootstrap de tema en `index.html`**

Insertar un script inline en `<head>`, antes de los estilos o del módulo, que lea `cc-theme` y, si no es válido, use `prefers-color-scheme`; debe fijar `document.documentElement.dataset.theme`. Envolver en `try/catch` y dejar `light` como fallback.

- [ ] **Step 3: Crear `ThemeToggle.tsx`**

Botón `type="button"` con clase `theme-toggle`, `aria-pressed={theme === "dark"}` y texto visible `Modo oscuro` cuando está claro / `Modo claro` cuando está oscuro. Incluir un icono decorativo `aria-hidden` (sol/luna) y `title` descriptivo. No usar emojis como única etiqueta.

- [ ] **Step 4: Cablear el tema en `App.tsx`**

Importar `initialTheme` y `persistTheme`; agregar `const [theme, setTheme] = useState<Theme>(initialTheme);` y un `useEffect` que llame `persistTheme(theme)`. Colocar `<ThemeToggle theme={theme} onToggle={...} />` en la cabecera junto al estado de API. No cambiar aún el layout de roles.

- [ ] **Step 5: Estilos mínimos del control**

Agregar `.masthead-controls` y `.theme-toggle` en `styles.css`: `display:flex`, `flex-wrap:wrap`, `gap:10px`; el botón usa `color: var(--sobre-azul)`, `background: rgba(0,0,0,0.16)`, `border: 2px solid var(--amarillo)` y texto legible en la cabecera. No agregar todavía la paleta oscura completa.

- [ ] **Step 6: Verificar compilación y persistencia**

Run: `cd frontend; npm run build`  
Expected: PASS.

Abrir la app, alternar el tema, recargar y comprobar en DevTools que `<html data-theme="dark">` persiste. Confirmar que un valor corrupto en `cc-theme` no rompe la app.

- [ ] **Step 7: Commit**

```bash
git add frontend/index.html frontend/src/lib/preferences.ts frontend/src/components/ThemeToggle.tsx frontend/src/App.tsx frontend/src/styles.css
git commit -m "feat(f3): agrega preferencia y control de tema"
```

---

### Task 2: Selector de rol y layouts Cliente/Administrador

**Files:**
- Create: `frontend/src/components/RoleSwitch.tsx`
- Modify: `frontend/src/lib/preferences.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: `export type Role = "cliente" | "administrador";`
- Produces: `export function initialRole(): Role;`
- Produces: `export function persistRole(role: Role): void;`
- Produces: `export default function RoleSwitch(props: { role: Role; onChange: (role: Role) => void }): JSX.Element;`

- [ ] **Step 1: Extender `preferences.ts` con rol**

Agregar `Role`, lectura segura de `cc-role`, default `cliente` para valores ausentes o inválidos, y `persistRole()` con `try/catch`.

- [ ] **Step 2: Crear `RoleSwitch.tsx`**

Grupo `role="group"` con `aria-label="Vista por rol"` y dos botones `type="button"`: `Cliente` y `Administrador`. Cada botón usa `aria-pressed` y llama `onChange` con su valor. Mantener el control visible en la cabecera y usable con teclado.

- [ ] **Step 3: Cablear rol y layouts en `App.tsx`**

Agregar estado `role`, `useEffect` de persistencia y `const isAdmin = role === "administrador"`. Renderizar:
- Admin: `Ledger` en la columna izquierda; `NetworkCanvas`, `Explorer` y `Recommend` en la derecha.
- Cliente: `NetworkCanvas` a ancho completo; debajo un `client-grid` con `Explorer` y `Recommend`.
- Debajo de la cabecera: aviso visible `Vista de demostración: cambia lo que ves, no tus permisos.` y una etiqueta de la vista activa.

No duplicar los componentes en ambos árboles de forma simultánea.

- [ ] **Step 4: Estilos de roles y layout de cliente**

Agregar estilos para `.role-switch`, `.role-option`, `.role-note` y `.client-grid`. `.role-option` usa `color: var(--sobre-azul)`; la opción activa (`aria-pressed="true"`) usa `background: var(--amarillo)` y `color: var(--sobre-amarillo)`. En escritorio, `client-grid` usa dos columnas; en `max-width: 980px` pasa a una columna. El layout admin conserva `.workspace` actual. Asegurar que el aviso de rol no parezca un login.

- [ ] **Step 5: Verificar visibilidad y persistencia**

Run: `cd frontend; npm run build`  
Expected: PASS.

En navegador:
- Cliente: no aparece el texto `Mostrador` ni el formulario de alta; sí red, explorador y propuestas.
- Administrador: aparece `Mostrador` y los otros tres paneles.
- Recargar conserva el rol.
- Poner `cc-role` en un valor inválido y recargar: inicia en `cliente`.
- Probar el layout a 640 px: no hay desbordes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/preferences.ts frontend/src/components/RoleSwitch.tsx frontend/src/App.tsx frontend/src/styles.css
git commit -m "feat(f3): separa vistas de cliente y administrador"
```

---

### Task 3: Paleta oscura completa y contraste

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/lib/preferences.ts` (solo `theme-color` si se implementa)
- Modify: `frontend/index.html` (solo `meta theme-color` inicial si se implementa)

**Interfaces:**
- Consumes: `data-theme="light|dark"` en `<html>` y las variables existentes.
- Produces: tokens semánticos usados por los componentes; no cambia props ni APIs.

- [ ] **Step 1: Agregar tokens semánticos claros**

En `:root`, agregar tokens con los valores actuales: `--superficie: #fff`, `--sobre-azul: #fbf7ec`, `--sobre-amarillo: #16202a`, `--azul-texto: var(--azul)`, `--puntos: rgba(22, 32, 42, 0.07)`, `--hover-suave: rgba(22, 32, 42, 0.06)`, `--propuesta-suave: #e3eaf4`, `--aviso-ok: #edf4ec`, `--aviso-error: #fbeae5`, `--grupo-1: #fdf1c9`, `--grupo-2: #e2eee6`, `--grupo-3: #f7e3dc`, `--grupo-4: #e3eaf4`, `--chip-via: #fdf1c9`, `--canvas-texto: #fbf7ec`, `--nodo-relleno: #fbf7ec` y `--canvas-punto: rgba(251, 247, 236, 0.1)`.

- [ ] **Step 2: Reemplazar hardcodes por tokens**

Cambiar exactamente estos usos en `styles.css`:
- `.input`, `.select`, `.picker-list`, `.picker-empty`, `.chip`, `.segmented`, `.group`, `.rec-card` → `background: var(--superficie)`.
- `.notice` → `var(--aviso-ok)`; `.notice--error` → `var(--aviso-error)`.
- `.group:nth-child(4n + 1..4)` → `var(--grupo-1..4)`.
- `.chip--via` → `var(--chip-via)`.
- `.panel-head--propuesta` → `var(--propuesta-suave)`; su `.hint` → `var(--gris)`.
- `.masthead` y `.brand h1` → `color: var(--sobre-azul)`.
- `.btn`, `.skip-link`, `.panel-head--registro`, `.picker-option[data-active]` y `.rec-rank` → `color: var(--sobre-amarillo)`.
- `.seg[aria-pressed="true"]` → `color: var(--sobre-azul)`.
- `.dist-label` y `.rec-score` → `color: var(--azul-texto)`.
- `.btn-quiet` → `color: var(--tinta)`; `.btn-quiet:hover` → `background: var(--hover-suave)`.
- `.node circle` → `var(--nodo-relleno)`; `.node text`, `.canvas-empty strong` → `var(--canvas-texto)`.
- `body` background-image → `var(--puntos)`; `.canvas-body` background-image → `var(--canvas-punto)`.

Mantener el mismo aspecto en claro.

- [ ] **Step 3: Definir `html[data-theme="dark"]`**

Agregar un bloque con estos valores exactos:

```css
html[data-theme="dark"] {
  color-scheme: dark;
  --tinta: #f2ead9;
  --papel: #15222e;
  --papel-hondo: #0a141d;
  --azul: #0d2c50;
  --azul-noche: #06131f;
  --amarillo: #f4c442;
  --rojo: #f07a64;
  --verde: #5bbd91;
  --verde-suave: #163326;
  --gris: #b9b3a5;
  --linea: rgba(242, 234, 217, 0.18);
  --sombra: 7px 7px 0 #050b11;
  --superficie: #1b2a37;
  --sobre-azul: #fbf7ec;
  --sobre-amarillo: #16202a;
  --azul-texto: #9ecbff;
  --puntos: rgba(242, 234, 217, 0.06);
  --hover-suave: rgba(242, 234, 217, 0.08);
  --propuesta-suave: #1b2d42;
  --aviso-ok: #173326;
  --aviso-error: #3a211c;
  --grupo-1: #3b3117;
  --grupo-2: #173326;
  --grupo-3: #3a211c;
  --grupo-4: #1b2d42;
  --chip-via: #3b3117;
  --canvas-texto: #fbf7ec;
  --nodo-relleno: #fbf7ec;
  --canvas-punto: rgba(251, 247, 236, 0.12);
}
```

Asegurar además:
- `.masthead` y textos sobre azul usan `--sobre-azul`.
- `.btn`, `.skip-link`, `.panel-head--registro`, `.role-option[aria-pressed]`, `.picker-option[data-active]` y `.rec-rank` usan `--sobre-amarillo`.
- `.node circle` usa `--nodo-relleno` y `.node text`/`.canvas-empty strong` usan `--canvas-texto`.
- Inputs, picker, segmented, chips, grupos, avisos y tarjetas usan superficies oscuras con texto legible.
- `meta[name="theme-color"]` se actualiza al cambiar el tema o se deja un valor oscuro coherente.

- [ ] **Step 4: Verificar contraste en ambos roles**

Run: `cd frontend; npm run build`  
Expected: PASS.

En navegador, revisar en claro y oscuro:
- Mostrador (solo admin), red, explorador y propuestas.
- Botones primarios y secundarios, selects, inputs, picker abierto, chips y avisos.
- Nodos, etiquetas y aristas del grafo.
- Cliente y administrador; escritorio y 640 px.

Anotar cualquier texto ilegible o superficie blanca residual y corregirlo antes de cerrar la tarea.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles.css frontend/src/lib/preferences.ts frontend/index.html
git commit -m "feat(f3): completa el tema oscuro de la interfaz"
```

---

### Task 4: Verificación final y publicación de la rama

**Files:**
- No crear archivos nuevos.

- [ ] **Step 1: Verificar build final**

Run: `cd frontend; npm run build`  
Expected: PASS sin warnings de TypeScript.

- [ ] **Step 2: Ejecutar checklist manual del spec**

Comprobar:
- Tema inicial según sistema sin preferencia guardada.
- Persistencia de tema y rol tras recargar.
- Cliente no renderiza `Ledger`; admin sí.
- Cambio de rol con una consulta en curso no muestra el resultado viejo en la vista nueva.
- Navegación por teclado y foco visible en selector de rol y botón de tema.
- Sin desbordes en móvil.
- No se modificaron backend ni acceptance scripts.

- [ ] **Step 3: Revisar el diff**

Run: `git diff --stat feature/f3-propuesta...HEAD`  
Expected: solo `frontend/` y el spec ya commiteado; ningún archivo backend.

- [ ] **Step 4: Publicar**

```bash
git status --short
git push -u origin feature/f3-andres-roles-dark
```

Expected: rama remota actualizada; sin cambios sin commitear.
