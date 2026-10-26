"use client";

import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/cms/projects";

export type ProjectList = { projects: ProjectSummary[]; current: string | null };

/** Every project and the current one; null while loading. */
export function useProjects(): ProjectList | null {
  const [list, setList] = useState<ProjectList | null>(null);
  useEffect(() => {
    fetch("/api/admin/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setList(json?.data ?? { projects: [], current: null }))
      .catch(() => setList({ projects: [], current: null }));
  }, []);
  return list;
}
