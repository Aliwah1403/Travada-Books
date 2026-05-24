import { Link } from "react-router";
import {
  Notification01Icon,
  Moon01Icon,
  Sun01Icon,
  UserIcon,
  LockPasswordIcon,
} from "@travada-books/ui/icons";
import { Avatar, AvatarFallback } from "@travada-books/ui/components/avatar";
import { Button } from "@travada-books/ui/components/button";
import { Separator } from "@travada-books/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(
      theme === "dark" ? "light"
      : theme === "light" ? "dark"
      : "dark",
    );
  };

  return (
    <header className='flex h-14 shrink-0 items-center justify-between border-b px-6'>
      <h1 className='text-sm font-medium'>{title}</h1>
      <div className='flex items-center gap-2'>
        <Button variant='ghost' size='icon-lg' onClick={toggleTheme}>
          {theme === "dark" ?
            <Sun01Icon size={32} />
          : <Moon01Icon size={32} />}
        </Button>
        <Button variant='ghost' size='icon-lg'>
          <Notification01Icon size={16} />
        </Button>
        <Separator orientation='vertical' className='h-7' />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Avatar className='size-7 cursor-pointer ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' />
            }
          >
            <AvatarFallback className='text-xs'>JD</AvatarFallback>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-52'>
            <DropdownMenuGroup>
              <DropdownMenuLabel className='flex flex-col gap-0.5'>
                <span className='text-xs font-medium'>John Doe</span>
                <span className='text-[10px] font-normal text-muted-foreground'>
                  john@example.com
                </span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to='/account/profile' />}>
                <UserIcon size={14} className='shrink-0' />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to='/account/security' />}>
                <LockPasswordIcon size={14} className='shrink-0' />
                Security
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to='/account/notifications' />}>
                <Notification01Icon size={14} className='shrink-0' />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
