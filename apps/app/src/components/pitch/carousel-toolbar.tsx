import { useEffect } from "react"

import { Button } from "@travada-books/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@travada-books/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@travada-books/ui/components/tooltip"
import { useCarousel } from "@travada-books/ui/components/carousel"
import { cn } from "@travada-books/ui/lib/utils"
import {
  Calendar01Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
  XIcon,
} from "@travada-books/ui/icons"

import { CopyInput } from "./copy-input"

const PITCH_URL = "https://books.travadasys.com/pitch"

export function CarouselToolbar() {
  const { api, canScrollPrev, canScrollNext, scrollPrev, scrollNext } = useCarousel()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") scrollNext()
      if (event.key === "ArrowLeft") scrollPrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [scrollNext, scrollPrev])

  function handleJumpToBook() {
    const count = api?.scrollSnapList().length ?? 0
    api?.scrollTo(count - 1)
  }

  function handleShareOnX() {
    const text = encodeURIComponent("Check out the Travada Books pitch deck")
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(PITCH_URL)}`,
      "share",
      "width=600,height=400"
    )
  }

  return (
    <Dialog>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 z-40 -translate-x-1/2",
          "animate-in fade-in-0 slide-in-from-bottom-4 duration-300 [animation-timing-function:var(--ease-out)]"
        )}
      >
        <TooltipProvider delay={20}>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur-md">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={handleJumpToBook}
                >
                  <Calendar01Icon size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Get started</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                  >
                    <ShareIcon size={16} />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>

            <div className="mx-1 h-5 w-px bg-border" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  disabled={!canScrollPrev}
                  onClick={scrollPrev}
                >
                  <ChevronLeftIcon size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous slide</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  disabled={!canScrollNext}
                  onClick={scrollNext}
                >
                  <ChevronRightIcon size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next slide</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share this pitch</DialogTitle>
          <DialogDescription>
            Thanks for sharing the Travada Books pitch deck.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <CopyInput value={PITCH_URL} />
          <Button
            type="button"
            className="w-full gap-1.5"
            onClick={handleShareOnX}
          >
            Share on
            <XIcon size={13} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
