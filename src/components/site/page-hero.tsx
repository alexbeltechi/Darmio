import { DsButton } from "@beltechi/parabola";
import { FixedFadeHeader } from "./fixed-fade-header";

interface PageHeroProps {
  title: string;
  /** Secondary copy under the headline. */
  description?: string;
  cta?: { label: string; href: string };
}

/**
 * A view's opening headline (Figma 602:2410): Display on large screens, H1
 * below (H2 on mobile), optional
 * secondary copy as muted P, optional CTA. Pinned at the top and fading out
 * as the feed scrolls up to meet it. Shared by the homepage and the category
 * views that open with a hero.
 */
export function PageHero({ title, description, cta }: PageHeroProps) {
  return (
    <FixedFadeHeader className="px-5 pt-24 pb-12 sm:pt-42 sm:pb-28">
      <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-4 text-center lg:max-w-[1000px]">
        <h1 className="text-h2 text-ds-fg sm:text-h1 lg:mb-4 lg:text-display">{title}</h1>
        {description && <p className="text-p text-ds-fg-muted">{description}</p>}
        {cta && (
          <DsButton href={cta.href} variant="primary">
            {cta.label}
          </DsButton>
        )}
      </div>
    </FixedFadeHeader>
  );
}
