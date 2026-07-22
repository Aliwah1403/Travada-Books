import { useTheme } from "@/components/theme-provider"
import LogoGreen from "@/assets/Logo-Green.svg"
import LogoLime from "@/assets/Logo-Lime.svg"

import { Grid } from "./ui"

export function SectionStart() {
  const { theme } = useTheme()
  const logo = theme === "dark" ? LogoLime : LogoGreen

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-between px-6 py-16 text-center md:px-16 lg:px-24">
      <Grid />

      <span className="text-sm text-muted-foreground">Pitch / 2026</span>

      <div className="flex flex-col items-center gap-8">
        <img src={logo} alt="" className="size-16 md:size-24" />
        <h1 className="font-heading text-[15vw] leading-[0.85] font-medium tracking-tight text-foreground md:text-[11vw]">
          Travada
          <br />
          Books
        </h1>
        <p className="max-w-md text-base text-muted-foreground md:text-xl">
          Set it once. It runs every month.
        </p>
      </div>

      <span className="text-sm text-muted-foreground">books.travadasys.com</span>
    </div>
  )
}
