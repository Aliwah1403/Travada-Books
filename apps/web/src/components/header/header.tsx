import { HugeiconsIcon } from "@hugeicons/react"
import { Notification01Icon, Moon01Icon, Sun01Icon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar"
import { Button } from "@travada-books/ui/components/button"
import { Separator } from "@travada-books/ui/components/separator"
import { useTheme } from "@/components/theme-provider"

type HeaderProps = {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : theme === "light" ? "dark" : "dark")
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
      <h1 className="text-sm font-medium">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
          <HugeiconsIcon
            icon={theme === "dark" ? Sun01Icon : Moon01Icon}
            size={16}
            color="currentColor"
            strokeWidth={1.5}
          />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <HugeiconsIcon icon={Notification01Icon} size={16} color="currentColor" strokeWidth={1.5} />
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Avatar className="size-7 cursor-pointer">
          <AvatarFallback className="text-xs">JD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
