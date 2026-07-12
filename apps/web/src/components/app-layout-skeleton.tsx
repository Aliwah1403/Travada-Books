import { Separator } from "@travada-books/ui/components/separator";
import { useTheme } from "@/components/theme-provider";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";

export function AppLayoutSkeleton() {
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;

  return (
    <div className='flex h-screen overflow-hidden'>
      <aside className='flex h-screen w-56 shrink-0 flex-col border-r bg-background'>
        {/* Logo */}
        <div className='flex h-14 items-center gap-2 px-4'>
          <img src={logo} alt='Travada Books' className='size-6' />
          <span className='text-sm font-semibold'>Travada Books</span>
        </div>

        <Separator />

        {/* Nav skeleton */}
        <nav className='flex flex-1 flex-col gap-1 px-2 py-3'>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className='h-8 w-full animate-pulse rounded-md bg-muted' />
          ))}
        </nav>

        <Separator />

        {/* Org switcher skeleton */}
        <div className='px-2 py-3'>
          <div className='flex items-center gap-2.5 px-2 py-2'>
            <div className='size-6 shrink-0 animate-pulse rounded-md bg-muted' />
            <div className='h-3.5 flex-1 animate-pulse rounded bg-muted' />
          </div>
        </div>
      </aside>

      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Header skeleton */}
        <header className='flex h-14 shrink-0 items-center justify-between border-b px-6'>
          <div className='h-4 w-32 animate-pulse rounded bg-muted' />
          <div className='flex items-center gap-3'>
            <div className='size-7 animate-pulse rounded-md bg-muted' />
            <div className='size-7 animate-pulse rounded-full bg-muted' />
          </div>
        </header>

        {/* Main content skeleton */}
        <main className='flex-1 overflow-y-auto'>
          <div className='flex flex-col gap-6 p-6'>
            <div className='grid grid-cols-4 gap-4'>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className='h-24 rounded-lg border bg-muted/40 animate-pulse'
                />
              ))}
            </div>
            <div className='rounded-lg border overflow-hidden'>
              <div className='h-12 border-b bg-muted/20' />
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className='h-14 border-b bg-muted/10 animate-pulse last:border-b-0'
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
