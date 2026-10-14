import type { HTMLAttributes, ReactNode } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils/tw';

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: 'h1' | 'h2';
};

export function MarketingTitle({ as: Tag = 'h1', className, ...props }: HeadingProps) {
  return (
    <Tag
      className={cn(
        'mx-0 mt-[18px] mb-0 max-w-[740px] font-display text-[46px] leading-[1.08] font-bold tracking-[0] [overflow-wrap:anywhere] max-[960px]:text-[38px] max-[560px]:text-[34px] max-[380px]:text-[28px] [&_em]:not-italic',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingFaq({ className, ...props }: React.ComponentProps<typeof Accordion>) {
  return (
    <Accordion
      className={cn(
        'mt-[26px] mb-0 grid max-w-[840px] gap-0 border-t border-border [&_[data-slot=accordion-content]]:h-(--accordion-panel-height) [&_[data-slot=accordion-content]]:animate-none [&_[data-slot=accordion-content]]:overflow-hidden [&_[data-slot=accordion-content]]:transition-[height] [&_[data-slot=accordion-content]]:duration-[220ms] [&_[data-slot=accordion-content][data-ending-style]]:h-0 [&_[data-slot=accordion-content][data-starting-style]]:h-0 [&_[data-slot=accordion-item]]:border-b [&_[data-slot=accordion-item]]:border-border [&_[data-slot=accordion-trigger-icon]]:text-brand-teal-ink [&_[data-slot=accordion-trigger]]:flex [&_[data-slot=accordion-trigger]]:cursor-pointer [&_[data-slot=accordion-trigger]]:items-center [&_[data-slot=accordion-trigger]]:gap-4 [&_[data-slot=accordion-trigger]]:rounded-none [&_[data-slot=accordion-trigger]]:border-0 [&_[data-slot=accordion-trigger]]:px-0 [&_[data-slot=accordion-trigger]]:py-[18px] [&_[data-slot=accordion-trigger]]:text-sm [&_[data-slot=accordion-trigger]]:leading-[1.5] [&_[data-slot=accordion-trigger]]:font-bold [&_[data-slot=accordion-trigger]]:text-foreground [&_[data-slot=accordion-trigger]:hover]:text-brand-teal-ink [&_[data-slot=accordion-trigger]:hover]:no-underline',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingFaqItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionItem>) {
  return <AccordionItem className={cn('border-b border-border', className)} {...props} />;
}

export function MarketingFaqTrigger({
  className,
  ...props
}: React.ComponentProps<typeof AccordionTrigger>) {
  return <AccordionTrigger className={className} {...props} />;
}

export function MarketingFaqContent({
  className,
  ...props
}: React.ComponentProps<typeof AccordionContent>) {
  return (
    <AccordionContent
      className={cn(
        'h-auto px-0 pt-0 pb-[18px] [&_p]:m-0 [&_p]:max-w-[700px] [&_p]:text-sm [&_p]:leading-[1.7] [&_p]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingSectionTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2
      className={cn(
        'm-0 font-display text-[28px] font-bold tracking-[0] [overflow-wrap:anywhere] max-[560px]:text-2xl',
        className,
      )}
      {...props}>
      {children}
    </h2>
  );
}

export function MarketingLede({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'mt-5 mb-0 max-w-[520px] text-base leading-[1.7] text-muted-foreground max-[560px]:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingHero({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'grid grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] items-center gap-[clamp(32px,4vw,96px)] py-[clamp(44px,5vw,88px)] max-[960px]:grid-cols-1 max-[960px]:gap-6 max-[960px]:py-9 max-[800px]:gap-y-[18px] max-[800px]:pt-6 max-[800px]:pb-7 max-[380px]:gap-y-[14px] max-[380px]:pt-[18px] max-[380px]:pb-[22px]',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingHeroCopy({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 animate-in duration-[560ms] fade-in-0 slide-in-from-bottom-3',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingHeroActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mt-5 flex flex-wrap gap-[10px] max-[380px]:gap-2 max-[380px]:[&_svg]:size-[14px] max-[380px]:[&_svg]:flex-none max-[380px]:[&>a]:min-h-11 max-[380px]:[&>a]:min-w-0 max-[380px]:[&>a]:flex-[1_1_140px] max-[380px]:[&>a]:gap-1.5 max-[380px]:[&>a]:px-[10px] max-[380px]:[&>a]:text-xs',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingHeroArt({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'm-0 min-w-0 animate-in delay-[80ms] duration-[660ms] fade-in-0 slide-in-from-bottom-3 max-[960px]:w-[min(100%,560px)] max-[380px]:[&_.palette-artwork-bottom]:px-3 max-[380px]:[&_.palette-artwork-bottom]:py-[10px] max-[380px]:[&_.palette-artwork-top]:px-3 max-[380px]:[&_.palette-artwork-top]:py-[10px]',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingSectionHeading({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'max-[800px]:flex-col max-[800px]:items-start max-[800px]:gap-4 max-[560px]:mb-6',
        className,
      )}
      {...props}
    />
  );
}

export function MarketingSectionNote({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('max-[800px]:max-w-[520px] max-[560px]:mt-0', className)} {...props} />;
}
