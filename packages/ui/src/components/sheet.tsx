import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@travada-books/ui/lib/utils";
import { Button } from "@travada-books/ui/components/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

// Below `md` (the width where the app's sidebar turns into a menu) a sheet
// becomes a bottom drawer you can swipe down to dismiss. Read synchronously so
// a sheet that opens on first render never flashes in from the side.
const PHONE_QUERY = "(max-width: 767px)";

function subscribePhone(onChange: () => void) {
  const mql = window.matchMedia(PHONE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function useIsPhone() {
  return React.useSyncExternalStore(
    subscribePhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );
}

const SheetDrawerContext = React.createContext(false);

/**
 * `mobileDrawer` (default true): on phones, render as a bottom drawer instead
 * of a side sheet. Pass false for sheets that must keep their side, like the
 * mobile nav menu.
 */
function Sheet({
  mobileDrawer = true,
  ...props
}: SheetPrimitive.Root.Props & { mobileDrawer?: boolean }) {
  const isPhone = useIsPhone();
  const asDrawer = mobileDrawer && isPhone;

  return (
    <SheetDrawerContext.Provider value={asDrawer}>
      {asDrawer ?
        <DrawerPrimitive.Root
          data-slot='sheet'
          swipeDirection='down'
          {...(props as DrawerPrimitive.Root.Props)}
        />
      : <SheetPrimitive.Root data-slot='sheet' {...props} />}
    </SheetDrawerContext.Provider>
  );
}

function SheetDrawerContent({
  className,
  children,
  showCloseButton,
  ...props
}: SheetPrimitive.Popup.Props & { showCloseButton: boolean }) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop
        data-slot='sheet-overlay'
        className='fixed inset-0 z-50 bg-black/80 opacity-[calc(1-var(--drawer-swipe-progress,0))] transition-opacity duration-200 [transition-timing-function:var(--ease-drawer)] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0 data-swiping:duration-0 supports-backdrop-filter:backdrop-blur-xs'
      />
      <DrawerPrimitive.Viewport className='fixed inset-0 z-50 flex items-end'>
        <DrawerPrimitive.Popup
          data-slot='sheet-content'
          data-side='bottom'
          data-variant='drawer'
          className={cn(
            "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t bg-popover bg-clip-padding pb-[env(safe-area-inset-bottom)] text-xs/relaxed text-popover-foreground shadow-lg outline-none",
            "translate-y-[var(--drawer-swipe-movement-y,0px)] transition-transform duration-200 [transition-timing-function:var(--ease-drawer)] data-swiping:duration-0 data-starting-style:translate-y-full data-ending-style:translate-y-full data-ending-style:duration-150",
            className,
            // Desktop sheets size themselves sideways (w-[520px], sm:max-w-md…);
            // a drawer always spans the screen.
            "h-auto! w-full! max-w-none!",
          )}
          {...(props as DrawerPrimitive.Popup.Props)}
        >
          <div
            aria-hidden
            className='mx-auto mt-2 mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30'
          />
          {children}
          {showCloseButton && (
            <SheetPrimitive.Close
              data-slot='sheet-close'
              render={
                <Button
                  variant='ghost'
                  className='absolute top-4 right-4'
                  size='icon-sm'
                />
              }
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className='sr-only'>Close</span>
            </SheetPrimitive.Close>
          )}
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot='sheet-trigger' {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot='sheet-close' {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot='sheet-portal' {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot='sheet-overlay'
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  variant = "inset",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  variant?: "default" | "inset";
  showCloseButton?: boolean;
}) {
  const asDrawer = React.useContext(SheetDrawerContext);
  if (asDrawer) {
    return (
      <SheetDrawerContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </SheetDrawerContent>
    );
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot='sheet-content'
        data-side={side}
        data-variant={variant}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition duration-200 [transition-timing-function:var(--ease-drawer)] data-ending-style:duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-full data-[side=right]:sm:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-[680px] data-[side=right]:sm:max-w-[680px]",
          variant === "inset" && [
            "data-[side=right]:sm:inset-y-3 data-[side=right]:sm:right-3 data-[side=right]:sm:rounded-2xl data-[side=right]:sm:border",
            "data-[side=left]:sm:inset-y-3 data-[side=left]:sm:left-3 data-[side=left]:sm:rounded-2xl data-[side=left]:sm:border",
            "data-[side=bottom]:sm:inset-x-3 data-[side=bottom]:sm:bottom-3 data-[side=bottom]:sm:rounded-t-2xl data-[side=bottom]:sm:border",
            "data-[side=top]:sm:inset-x-3 data-[side=top]:sm:top-3 data-[side=top]:sm:rounded-b-2xl data-[side=top]:sm:border",
          ],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot='sheet-close'
            render={
              <Button
                variant='ghost'
                className='absolute top-4 right-4'
                size='icon-sm'
              />
            }
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className='sr-only'>Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='sheet-header'
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot='sheet-footer'
      className={cn(
        "mt-auto flex flex-col gap-2 p-6",
        "in-[[data-slot=sheet-content][data-variant=inset]]:sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
        "in-[[data-slot=sheet-content][data-variant=drawer]]:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot='sheet-title'
      className={cn(
        "font-heading text-sm font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot='sheet-description'
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
