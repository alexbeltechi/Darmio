"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/cms/projects";

export type CurrentProject = {
  project: ProjectSummary;
  /** The public site shows the first project for now; the others get theirs with domains. */
  onSite: boolean;
};

/** The admin's current project, or null while loading (or on an install from before projects). */
export function useCurrentProject() {
  const [state, setState] = useState<CurrentProject | null>(null);

  const reload = useCallback(() => {
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const projects: ProjectSummary[] = json?.data?.projects ?? [];
        const project = projects.find((p) => p.slug === json?.data?.current);
        setState(project ? { project, onSite: projects[0]?.slug === project.slug } : null);
      })
      .catch(() => {});
  }, []);

  useEffect(reload, [reload]);
  return { current: state, reload };
}
