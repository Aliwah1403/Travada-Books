import { NavLink } from "react-router";
import {
  Invoice01Icon,
  FileEditIcon,
  User02Icon,
  Wallet01Icon,
  InboxIcon,
  Timer01Icon,
  SafeIcon,
  Settings02Icon,
} from "@travada-books/ui/icons";
import { Separator } from "@travada-books/ui/components/separator";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import { NavItem } from "./nav-item";

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
  { icon: InboxIcon, label: "Inbox", to: "/inbox", comingSoon: true },
  { icon: Timer01Icon, label: "Tracker", to: "/tracker", comingSoon: true },
  { icon: SafeIcon, label: "Vault", to: "/vault", comingSoon: true },
];

export function Sidebar() {
  return (
    <aside className='flex h-screen w-56 shrink-0 flex-col border-r bg-background'>
      {/* Logo */}
      <div className='flex h-14 items-center gap-2 px-4'>
        <div className='flex size-6 items-center justify-center rounded-md bg-foreground text-background'>
          <span className='text-xs font-bold'>TB</span>
        </div>
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
        <NavLink to='/account/profile'>
          <div className='flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'>
            <Avatar className='size-5'>
              <AvatarFallback className='text-[10px]'>JD</AvatarFallback>
            </Avatar>
            <span>John Doe</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
