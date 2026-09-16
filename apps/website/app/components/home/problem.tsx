import { Section } from "~/components/section"

// Single narrow column, larger text — reads like the booklet panel, not a
// marketing feature block.
export function Problem() {
  return (
    <Section containerClassName="mx-auto max-w-[42rem]">
      <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        You didn't start a business to do paperwork.
      </h2>

      <div className="mt-8 flex flex-col gap-5 font-heading text-lg/relaxed text-muted-foreground">
        <p>But here you are.</p>
        <p>
          It's the 1st of the month, so you open last month's invoice, change the date, change
          the number, and send it again. You'll do it again in thirty days. And the month after
          that.
        </p>
        <p>
          The record of who has actually paid you is in your head, or in a notebook, or somewhere
          in a WhatsApp thread from March. There is money you are owed that you have simply
          forgotten to chase.
        </p>
        <p>
          Everyone has. It isn't a character flaw. It's just that nobody built you a tool that
          fits how you actually work.
        </p>
        <p className="font-medium text-foreground">
          None of this is the work. It's the tax you pay to do the work.
        </p>
      </div>
    </Section>
  )
}
