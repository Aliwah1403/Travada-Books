import {
  Invoice01Icon,
  FileEditIcon,
  User02Icon,
  Wallet01Icon,
  Timer01Icon,
  SafeIcon,
  Settings02Icon,
} from "@travada-books/ui/icons";
import { Separator } from "@travada-books/ui/components/separator";
import { NavItem } from "./nav-item";
import { useTheme } from "@/components/theme-provider";
import LogoGreen from "@/assets/Logo-Green.svg";
import LogoLime from "@/assets/Logo-Lime.svg";

const salesNav = [
  { icon: Invoice01Icon, label: "Invoices", to: "/invoices" },
  { icon: FileEditIcon, label: "Quotes", to: "/quotes" },
];

const mainNav = [
  { icon: User02Icon, label: "Customers", to: "/customers" },
  {
    icon: Wallet01Icon,
    label: "Transactions",
    to: "/transactions",
    comingSoon: true,
  },
  { icon: Timer01Icon, label: "Tracker", to: "/tracker", comingSoon: true },
  { icon: SafeIcon, label: "Vault", to: "/vault", comingSoon: true },
];

export function Sidebar() {
  const { theme } = useTheme();
  const logo = theme === "dark" ? LogoLime : LogoGreen;

  return (
    <aside className='flex h-screen w-56 shrink-0 flex-col border-r bg-background'>
      {/* Logo */}
      <div className='flex h-14 items-center gap-2 px-4'>
        <img src={logo} alt='Travada Books' className='size-6' />
        <span className='text-sm font-semibold'>Travada Books</span>
      </div>

      <Separator />

      {/* Main nav */}
      <nav className='flex flex-1 flex-col overflow-y-auto px-2 py-3'>
        {/* Sales group — Invoices + Quotes */}
        <div className='flex flex-col gap-0.5'>
          {salesNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              comingSoon={item.comingSoon}
            />
          ))}
        </div>

        <div className='my-2 border-t' />

        {/* Everything else */}
        <div className='flex flex-col gap-0.5'>
          {mainNav.map((item) => (
            <NavItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              comingSoon={item.comingSoon}
            />
          ))}
        </div>
      </nav>

      <Separator />

      {/* Bottom nav */}
      <div className='flex flex-col gap-0.5 px-2 py-3'>
        <NavItem icon={Settings02Icon} label='Settings' to='/settings' />
      </div>
    </aside>
  );
}
