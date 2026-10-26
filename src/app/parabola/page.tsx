import { redirect } from "next/navigation";
import { DS_GROUPS, dsHref } from "@beltechi/parabola/showcase/registry";

/** /parabola opens on the first page in the sidebar. */
export default function DesignSystemIndex() {
  const group = DS_GROUPS[0];
  redirect(dsHref(group, group.pages[0]));
}
