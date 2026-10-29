import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

type Props = {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Si es true, el texto escrito se conserva aunque no sea una opción. */
  allowFreeText?: boolean;
};

export default function ProductPicker({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Elige un producto",
  disabled = false,
  allowFreeText = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);

  const term = query.trim().toLowerCase();
  const filtered =
    term === ""
      ? options
      : options.filter((o) => o.toLowerCase().includes(term));

  const listId = `${id}-lista`;

  useEffect(() => {
    if (!open || active < 0) return;
    const item = listRef.current?.children[active];
    if (item instanceof HTMLElement) item.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function abrir(): void {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActive(-1);
  }

  function elegir(option: string): void {
    onChange(option);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActive(0);
        return;
      }
      setActive((a) => (filtered.length === 0 ? -1 : (a + 1) % filtered.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setQuery("");
        setActive(filtered.length - 1);
        return;
      }
      setActive((a) =>
        filtered.length === 0 ? -1 : (a - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (e.key === "Enter" && open) {
      if (active >= 0 && filtered[active] !== undefined) {
        e.preventDefault();
        elegir(filtered[active]);
      } else if (!allowFreeText && filtered.length > 0) {
        e.preventDefault();
        elegir(filtered[0]);
      } else {
        setOpen(false);
        setQuery("");
        if (!allowFreeText) e.preventDefault();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setActive(-1);
    }
  }

  function onBlur(e: FocusEvent<HTMLDivElement>): void {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setOpen(false);
      setQuery("");
      setActive(-1);
    }
  }

  return (
    <div className="field picker" onBlur={onBlur}>
      <label className="picker-label" htmlFor={id}>
        {label}
      </label>

      <div className="picker-control">
        <input
          id={id}
          className="input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={
            open && active >= 0 && filtered[active] !== undefined
              ? `${id}-opcion-${active}`
              : undefined
          }
          autoComplete="off"
          value={allowFreeText || !open ? value : query}
          placeholder={open ? "Buscar…" : placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (allowFreeText) onChange(e.target.value);
            setQuery(e.target.value);
            setOpen(true);
            setActive(allowFreeText ? -1 : 0);
          }}
          onClick={() => {
            if (!open) abrir();
          }}
          onFocus={abrir}
          onKeyDown={onKeyDown}
        />
        <span className="picker-caret" aria-hidden="true">
          ▾
        </span>
      </div>

      {open && filtered.length === 0 && (
        <p className="picker-empty" role="status">
          {options.length === 0
            ? "No hay productos registrados."
            : "Sin coincidencias."}
        </p>
      )}

      <ul
        className="picker-list"
        id={listId}
        role="listbox"
        ref={listRef}
        hidden={!open || filtered.length === 0}
      >
        {filtered.map((option, index) => (
          <li
            key={option}
            id={`${id}-opcion-${index}`}
            className="picker-option"
            role="option"
            aria-selected={option === value}
            data-active={index === active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(index)}
            onClick={() => elegir(option)}
          >
            {option}
          </li>
        ))}
      </ul>
    </div>
  );
}
