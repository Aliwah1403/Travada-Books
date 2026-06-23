'use client'

import { type Locale, t } from '@bazza-ui/filters'
import { FilterIcon as ListFilterIcon } from '@travada-books/ui/icons'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterTriggerProps extends ComponentPropsWithoutRef<'button'> {
  hasVisibleFilters?: boolean
  locale?: Locale
}

/**
 * A button that opens the filter menu.
 * Renders a `<button>` element.
 *
 * This component is designed to be used with `DropdownMenu.Trigger`'s `render` prop.
 *
 * Documentation: [Bazza UI Filter](https://bazza-ui.com/docs/components/filter)
 */
const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  (
    { className, children, hasVisibleFilters = false, locale = 'en', ...props },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        data-slot="filter-trigger"
        data-state={hasVisibleFilters ? 'has-filters' : 'empty'}
        variant="outline"
        className={cn('h-10 text-xs gap-1.5', hasVisibleFilters && 'w-fit !px-2', className)}
        {...props}
      >
        {children ?? (
          <>
            <ListFilterIcon className="size-4" />
            {!hasVisibleFilters && <span>{t('filter', locale)}</span>}
          </>
        )}
      </Button>
    )
  },
)

FilterTrigger.displayName = 'FilterTrigger'

export { FilterTrigger }

export namespace FilterTrigger {
  export type Props = FilterTriggerProps
}
