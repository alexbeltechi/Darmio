"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { FilePlus, FileText, Loader2, Plus, Upload } from "lucide-react";
import {
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownTrigger,
  DsListRow,
  DsSearch,
  DsSelect,
  dsToast,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { DOC_ACCEPT, mdBytes, mdName, shortDate, sizeLabel, type DocWithUsage } from "@/lib/cms/docs";
import { cn } from "@/lib/utils";

/** Fired after a doc is saved or deleted, so the list refreshes. */
export const DOCS_CHANGED = "cms:docs-changed";
export const announceDocsChanged = () => window.dispatchEvent(new Event(DOCS_CHANGED));

export const DOCUMENTS_PATH = "/admin/library/documents";

const openDocId = (pathname: string) => pathname.match(/^\/admin\/library\/documents\/([^/]+)/)?.[1] ?? null;

/** The Library's type filter, shared with the media grid: documents are one more type. */
export const LIBRARY_TYPES = [
  { value: "all", label: "All media items" },
  { value: "images", label: "Images" },
  { value: "video", label: "Video" },
  { value: "documents", label: "Documents" },
];

/** "By your agent · 4 Oct · 3 KB": who made it first, so agent-made files stand out. */
function detailLine(doc: DocWithUsage) {
  return [doc.createdBy === "agent" ? "By your agent" : null, shortDate(doc.updatedAt), sizeLabel(mdBytes(doc))]
    .filter(Boolean)
    .join(" · ");
}

/** "Services", "Services, About +2" or "Not attached". */
function usageLine(doc: DocWithUsage) {
  if (doc.usedBy.length === 0) return doc.kind === "guide" ? "Site-wide" : "Not attached";
  const names = doc.usedBy.slice(0, 2).map((u) => u.title);
  const more = doc.usedBy.length - names.length;
  return names.join(", ") + (more > 0 ? ` +${more}` : "");
}

/**
 * Library › Documents, laid out like Posts and Pages: the list on the left,
 * the open document on the right (the route, as `children`); below `lg` one
 * pane at a time. Every Markdown file that guides the work (briefs, sources,
 * rules) is here, so nothing an agent stores is out of sight (decisions,
 * 2026-10-04 and 2026-10-24).
 */
export function DocumentsWorkspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const openId = openDocId(pathname);
  const isOpen = Boolean(openId);

  const [docs, setDocs] = React.useState<DocWithUsage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/docs");
      if (res.ok) setDocs((await res.json()).data || []);
    } catch (error) {
      console.error("Failed to load docs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    reload();
    window.addEventListener(DOCS_CHANGED, reload);
    return () => window.removeEventListener(DOCS_CHANGED, reload);
  }, [reload]);

  const create = async (init: RequestInit) => {
    const res = await fetch("/api/admin/docs", { method: "POST", ...init });
    const json = await res.json();
    if (!res.ok) {
      dsToast("Couldn't add the doc", { description: json.error });
      return;
    }
    await reload();
    router.push(`${DOCUMENTS_PATH}/${json.data.id}`);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    await create({ body: form });
    setUploading(false);
  };

  const q = query.trim().toLowerCase();
  const rows = docs.filter(
    (d) => !q || [d.title, d.filename || "", d.kind, ...d.usedBy.map((u) => u.title)].some((t) => t.toLowerCase().includes(q))
  );

  return (
    <div className="flex lg:h-dvh">
      <section
        aria-label="Documents"
        className={cn(
          "flex min-h-dvh w-full flex-col px-5 lg:min-h-0 lg:w-[400px] lg:shrink-0 lg:overflow-y-auto",
          isOpen && "hidden lg:flex"
        )}
      >
        <div className="pointer-events-none sticky top-0 z-20 -mx-5 flex flex-col ds-nav-fade px-5 pb-5 [&>*]:pointer-events-auto">
          <div className="flex items-center gap-2 py-5">
            <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Library</h1>
            <DsDropdown>
              <DsDropdownTrigger asChild>
                <DsButton iconLeft={Plus} loading={uploading}>
                  Add
                </DsButton>
              </DsDropdownTrigger>
              <DsDropdownContent align="end">
                <DsDropdownItem iconLeft={Upload} onSelect={() => fileRef.current?.click()}>
                  Upload file
                </DsDropdownItem>
                <DsDropdownItem
                  iconLeft={FilePlus}
                  onSelect={() =>
                    create({
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: "untitled.md", kind: "guide", body: "" }),
                    })
                  }
                >
                  New document
                </DsDropdownItem>
              </DsDropdownContent>
            </DsDropdown>
            <AdminMenuButton />
          </div>
          <div className="flex items-center gap-2">
            <DsSearch aria-label="Search documents" value={query} onValueChange={setQuery} className="min-w-0 flex-1" />
            <DsSelect
              aria-label="Type"
              options={LIBRARY_TYPES.map((t) => (t.value === "documents" && !loading ? { ...t, label: `Documents (${docs.length})` } : t))}
              value="documents"
              onValueChange={(value) => value !== "documents" && router.push(`/admin/library?type=${value}`)}
              className="w-[170px] shrink-0"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={DOC_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 aria-label="Loading documents" className="size-6 animate-spin text-ds-fg-subtle" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-p text-ds-fg-muted">{q ? "Nothing matches" : "No documents yet"}</p>
            {!q && (
              <p className="max-w-xs text-small text-ds-fg-subtle">
                Notes, copy, briefs, HTML: anything Claude can read for context. Upload one, or attach one from a post or page.
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col pb-5">
            {rows.map((doc) => (
              <li key={doc.id}>
                <DsListRow
                  href={`${DOCUMENTS_PATH}/${doc.id}`}
                  selected={openId === doc.id}
                  thumbnailIcon={FileText}
                  title={mdName(doc)}
                  meta={usageLine(doc)}
                  detail={detailLine(doc)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label="Document"
        className={cn("flex h-dvh min-w-0 flex-1 flex-col lg:border-l lg:border-ds-border", !isOpen && "hidden lg:flex")}
      >
        {children}
      </section>
    </div>
  );
}
