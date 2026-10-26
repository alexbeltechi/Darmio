import type { ViewIntro } from "./site-views";

/**
 * A view's intro when it sits beside the feed instead of above it: an H1 (H2 on
 * mobile) headline, then any secondary copy as muted P. It stays H1 on large
 * screens, where PageHero goes up to Display: here it sits in a narrow column.
 */
export function IntroText({ intro, className = "" }: { intro: ViewIntro; className?: string }) {
  return (
    <div className={`flex w-full flex-col gap-4 ${className}`}>
      <h1 className="text-h2 text-ds-fg sm:text-h1">{intro.title}</h1>
      {intro.description && <p className="text-p text-ds-fg-muted">{intro.description}</p>}
    </div>
  );
}
