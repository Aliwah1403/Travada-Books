import * as React from "react"
import { motion, AnimatePresence } from "motion/react"

const CSS = `
.cp{
  --cp-glass:linear-gradient(180deg,rgba(255,255,255,0.78),rgba(255,255,255,0.62));
  --cp-border:rgba(0,0,0,0.06);
  --cp-shadow:0 0 1px rgba(0,0,0,0.04),0 2px 8px rgba(0,0,0,0.04),inset 0 1px 0 rgba(255,255,255,0.8);
  --cp-dim:rgba(0,0,0,0.42);
  --cp-mid:rgba(0,0,0,0.55);
  --cp-hi:rgba(0,0,0,0.88);
  --cp-sep:rgba(0,0,0,0.06);
  --cp-input-bg:rgba(0,0,0,0.04);
  --cp-input-border:rgba(0,0,0,0.1);
  --cp-btn:rgba(0,0,0,0.05);
  --cp-btn-h:rgba(0,0,0,0.10)
}
.dark .cp,[data-theme="dark"] .cp{
  --cp-glass:linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02));
  --cp-border:rgba(255,255,255,0.07);
  --cp-shadow:0 1px 3px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.04);
  --cp-dim:rgba(255,255,255,0.28);
  --cp-mid:rgba(255,255,255,0.5);
  --cp-hi:rgba(255,255,255,0.88);
  --cp-sep:rgba(255,255,255,0.06);
  --cp-input-bg:rgba(255,255,255,0.06);
  --cp-input-border:rgba(255,255,255,0.12);
  --cp-btn:rgba(255,255,255,0.05);
  --cp-btn-h:rgba(255,255,255,0.10)
}`

const MONO = "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace"

export const COLOR_PALETTE = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
]

function isValidHex(v: string) {
  return /^#[0-9a-fA-F]{6}$/.test(v)
}

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

const STYLE_ID = "travada-color-picker-styles"

function useInjectStyles() {
  React.useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement("style")
    el.id = STYLE_ID
    el.textContent = CSS
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])
}

export function ColorPicker({ color, onChange }: ColorPickerProps) {
  useInjectStyles()
  const [hexInput, setHexInput] = React.useState(color.toUpperCase())
  const [inputError, setInputError] = React.useState(false)

  React.useEffect(() => {
    setHexInput(color.toUpperCase())
    setInputError(false)
  }, [color])

  function selectColor(c: string) {
    onChange(c)
  }

  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value
    if (!v.startsWith("#")) v = "#" + v
    setHexInput(v.toUpperCase())
    setInputError(false)
  }

  function handleHexSave() {
    if (isValidHex(hexInput)) {
      onChange(hexInput)
      setInputError(false)
    } else {
      setInputError(true)
    }
  }

  function handleHexKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleHexSave()
  }

  return (
    <motion.div
        className="cp"
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          borderRadius: 14,
          background: "var(--cp-glass)",
          border: "1px solid var(--cp-border)",
          boxShadow: "var(--cp-shadow)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          overflow: "hidden",
          width: 248,
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--cp-hi)" }}>Pick a color</span>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              border: "1px solid var(--cp-border)",
              backgroundColor: color,
              transition: "background-color 0.15s",
            }}
          />
        </div>

        <div style={{ height: 1, background: "var(--cp-sep)" }} />

        {/* swatches */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 7, padding: "12px 14px" }}>
          {COLOR_PALETTE.map((c) => (
            <motion.button
              key={c}
              onClick={() => selectColor(c)}
              whileTap={{ scale: 0.82 }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c,
                border: "none",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnimatePresence>
                {color.toLowerCase() === c.toLowerCase() && (
                  <motion.svg
                    key="check"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    width={12}
                    height={12}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                  >
                    <path d="M3 8.5l3.5 3.5L13 5" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>

        <div style={{ height: 1, background: "var(--cp-sep)" }} />

        {/* hex input + save */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px" }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: isValidHex(hexInput) ? hexInput : color,
              border: "1px solid var(--cp-input-border)",
              flexShrink: 0,
              transition: "background-color 0.1s",
            }}
          />
          <input
            value={hexInput}
            onChange={handleHexChange}
            onKeyDown={handleHexKeyDown}
            maxLength={7}
            spellCheck={false}
            style={{
              flex: 1,
              fontSize: 12,
              fontFamily: MONO,
              background: "var(--cp-input-bg)",
              border: inputError ? "1px solid #f43f5e" : "1px solid var(--cp-input-border)",
              borderRadius: 6,
              padding: "4px 7px",
              color: "var(--cp-hi)",
              outline: "none",
              minWidth: 0,
            }}
          />
          <motion.button
            onClick={handleHexSave}
            whileTap={{ scale: 0.88 }}
            style={{
              height: 26,
              paddingInline: 10,
              borderRadius: 7,
              border: "none",
              background: "var(--cp-btn)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--cp-mid)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--cp-btn-h)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--cp-btn)" }}
          >
            Apply
          </motion.button>
        </div>
      </motion.div>
  )
}
