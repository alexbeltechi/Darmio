import { redirect } from "next/navigation";
import { DS_GROUPS, dsHref } from "@beltechi/parabola/showcase/registry";

/** /parabola opens on Theme, where a theme is made. */
export default function DesignSystemIndex() {
  const group = DS_GROUPS.find((g) => g.slug === "theme") ?? DS_GROUPS[0];
  redirect(dsHref(group, group.pages[0]));
}
