"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/cms/projects";

export type ProjectList = { projects: ProjectSummary[]; current: string | null };

/** Every project and the current one (null while loading), and a way to fetch them again after a change. */
export function useProjects(): { list: ProjectList | null; reload: () => Promise<void> } {
  const [list, setList] = useState<ProjectList | null>(null);
  const reload = useCallback(
    () =>
      fetch("/api/admin/projects")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => setList(json?.data ?? { projects: [], current: null }))
        .catch(() => setList({ projects: [], current: null })),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { list, reload };
}
