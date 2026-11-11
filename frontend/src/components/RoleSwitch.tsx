import type { Role } from "../lib/preferences";

const OPTIONS: { value: Role; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "administrador", label: "Administrador" },
];

type Props = {
  role: Role;
  onChange: (role: Role) => void;
};

export default function RoleSwitch({ role, onChange }: Props) {
  return (
    <div className="role-switch" role="group" aria-label="Vista por rol">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="role-option"
          aria-pressed={role === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
