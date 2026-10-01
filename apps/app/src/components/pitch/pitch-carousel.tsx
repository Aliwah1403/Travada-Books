import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@travada-books/ui/components/carousel"

import { CarouselToolbar } from "./carousel-toolbar"
import { SectionStart } from "./section-start"
import { SectionProblem } from "./section-problem"
import { SectionSolution } from "./section-solution"
import { SectionDemo } from "./section-demo"
import { SectionTraction } from "./section-traction"
import { SectionSubscription } from "./section-subscription"
import { SectionVision } from "./section-vision"
import { SectionNext } from "./section-next"
import { SectionBook } from "./section-book"

export function PitchCarousel() {
  return (
    <Carousel className="min-h-screen w-full bg-background">
      <CarouselContent className="ml-0">
        <CarouselItem className="pl-0">
          <SectionStart />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <SectionProblem />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <SectionSolution />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <SectionDemo />
        </CarouselItem>
        {/* <CarouselItem className="pl-0">
          <SectionTraction />
        </CarouselItem> */}
        {/* <CarouselItem className="pl-0">
          <SectionSubscription />
        </CarouselItem> */}
        <CarouselItem className="pl-0">
          <SectionVision />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <SectionNext />
        </CarouselItem>
        <CarouselItem className="pl-0">
          <SectionBook />
        </CarouselItem>
      </CarouselContent>

      <CarouselToolbar />
    </Carousel>
  )
}
