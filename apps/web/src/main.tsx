import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@travada-books/ui/globals.css"
import { App } from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@travada-books/ui/components/tooltip"
import { AuthProvider } from "@/contexts/auth-context.tsx"
import { Toaster } from "sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <App />
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
)
