import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "travada-sidebar-collapsed"

// Browser storage can throw in private windows or with site data blocked; the
// sidebar then just starts expanded.
export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)

  const toggle = useCallback(() => setCollapsed((value) => !value), [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // Remembered for this page load only.
    }
  }, [collapsed])

  // ⌘B / Ctrl+B, left alone inside text fields where it can mean bold.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "b") return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      toggle()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  return { collapsed, toggle }
}
