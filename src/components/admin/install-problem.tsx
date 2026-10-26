import type { InstallProblem } from "@/lib/cms/install-problems";

/**
 * A whole screen saying the install can't work yet and what to do, laid out
 * like the setup and sign-in pages (floating, no window). Used by both, so a
 * maker who opens either on a broken install reads the same thing.
 */
export function InstallProblemNotice({ problem }: { problem: InstallProblem }) {
  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <div role="alert" className="flex w-full max-w-[440px] flex-col gap-ds-16">
        <h1 className="text-h2">{problem.title}</h1>
        <p className="text-p text-ds-fg-muted">{problem.fix}</p>
      </div>
    </div>
  );
}
