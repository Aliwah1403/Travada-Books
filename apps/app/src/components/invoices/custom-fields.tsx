import { useEffect, useRef } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { PlusSignIcon, Delete01Icon } from "@travada-books/ui/icons";
import {
  type CustomField,
  MAX_CUSTOM_FIELDS,
  normalizeCustomFields,
} from "@/lib/custom-fields";

export type { CustomField } from "@/lib/custom-fields";
export {
  MAX_CUSTOM_FIELDS,
  normalizeCustomFields,
  parseCustomFields,
  fieldsFromLabels,
} from "@/lib/custom-fields";

export function CustomFieldsEditor({
  fields,
  onChange,
}: {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}) {
  const lastAddedId = useRef<string | null>(null);
  const labelInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (lastAddedId.current) {
      labelInputRefs.current[lastAddedId.current]?.focus();
      lastAddedId.current = null;
    }
  }, [fields]);

  function addField() {
    const id = crypto.randomUUID();
    lastAddedId.current = id;
    onChange([...fields, { id, label: "", value: "" }]);
  }

  function removeField(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function updateField(id: string, key: "label" | "value", val: string) {
    onChange(fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  }

  const atMax = fields.length >= MAX_CUSTOM_FIELDS;

  if (fields.length === 0) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs text-muted-foreground"
        onClick={addField}
      >
        <PlusSignIcon size={12} />
        Add field
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Additional fields
      </p>
      {fields.map((field) => (
        <div key={field.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_32px] gap-2">
          <Input
            ref={(el) => {
              labelInputRefs.current[field.id] = el;
            }}
            placeholder="Label, e.g. Container No."
            value={field.label}
            onChange={(e) => updateField(field.id, "label", e.target.value)}
            maxLength={40}
            className="text-xs"
          />
          <Input
            placeholder="Value"
            value={field.value}
            onChange={(e) => updateField(field.id, "value", e.target.value)}
            maxLength={120}
            className="text-xs"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => removeField(field.id)}
            aria-label="Remove field"
          >
            <Delete01Icon size={12} />
          </Button>
        </div>
      ))}
      {atMax ? (
        <p className="text-[11px] text-muted-foreground">Maximum of 8 fields</p>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1 text-xs text-muted-foreground"
          onClick={addField}
        >
          <PlusSignIcon size={12} />
          Add field
        </Button>
      )}
    </div>
  );
}

export function CustomFieldsPreview({ fields }: { fields: CustomField[] }) {
  const visible = normalizeCustomFields(fields);

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
      {visible.map((field) => (
        <div key={field.id} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{field.label}:</span>
          <span className="min-w-0 text-right font-medium break-words">{field.value}</span>
        </div>
      ))}
    </div>
  );
}
