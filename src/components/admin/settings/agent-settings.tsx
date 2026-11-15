"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FileText, FolderOpen, Link2, MoreVertical, Pencil, Plus, RefreshCw, X } from "lucide-react";
import {
  DsButton,
  DsDialog,
  DsDialogActions,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsField,
  DsInput,
  DsListRow,
  dsToast,
} from "@beltechi/parabola";
import { MediaPicker } from "@/components/admin/media-picker";
import { useCurrentProject } from "@/components/admin/use-current-project";
import { DOCUMENTS_PATH } from "@/components/admin/docs/documents-workspace";
import { mdName, shortDate, type DocKind, type DocWithUsage } from "@/lib/cms/docs";
import { SettingsSection } from "./settings-section";

/**
 * Settings › Context: everything the agent reads before it works on this
 * site, in one list. A link to a brain kept elsewhere (a folder on the
 * maker's computer, or a web page; stored as the project's `brain`), and files
 * from the Library (documents of kind "guide"). A file here is the Library's
 * own document, never a copy: clicking it opens it to edit, and the Library
 * says it's used in Context. Taking a file out leaves it in the Library.
 * Nothing is here until the maker adds it. Briefs and sources stay with
 * their posts and pages.
 */
export function AgentSettings() {
  const router = useRouter();
  const [files, setFiles] = useState<DocWithUsage[] | null>(null);
  const [creating, setCreating] = useState(false);
  // The library pop-up: adding files ("add"), or replacing the one with this id.
  const [choosing, setChoosing] = useState<"add" | string | null>(null);
  const { current, reload } = useCurrentProject();
  const savedLink = current?.project.brain ?? "";
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const loadFiles = useCallback(
    () =>
      fetch("/api/admin/docs")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => setFiles(((json?.data as DocWithUsage[]) || []).filter((d) => d.kind === "guide")))
        .catch(() => setFiles([])),
    []
  );
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function saveLink(value: string) {
    if (!current) return;
    setSavingLink(true);
    try {
      const res = await fetch(`/api/admin/projects/${current.project.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brain: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      reload();
      setLinkOpen(false);
    } catch (error) {
      dsToast.error("Couldn't save the link", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingLink(false);
    }
  }

  const editLink = () => {
    setLink(savedLink);
    setLinkOpen(true);
  };

  async function newFile() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "AGENTS.md", kind: "guide", body: "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`${DOCUMENTS_PATH}/${json.data.id}`);
    } catch (error) {
      dsToast("Couldn't add the file", { description: error instanceof Error ? error.message : undefined });
      setCreating(false);
    }
  }

  /** A document is in Context while its kind is "guide"; taken out, it's a plain source document. */
  async function setKind(id: string, kind: DocKind) {
    const res = await fetch(`/api/admin/docs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  }

  /** What the library pop-up hands back: files to add, or the one that takes a file's place. */
  async function applyPicked(picked: DocWithUsage[]) {
    const replacing = choosing !== "add" ? choosing : null;
    try {
      for (const doc of picked) if (doc.kind !== "guide") await setKind(doc.id, "guide");
      if (replacing && !picked.some((doc) => doc.id === replacing)) await setKind(replacing, "source");
    } catch (error) {
      dsToast("Couldn't change the context", { description: error instanceof Error ? error.message : undefined });
    }
    await loadFiles();
  }

  async function removeFile(doc: DocWithUsage) {
    try {
      await setKind(doc.id, "source");
      dsToast(`${mdName(doc)} is out of the context`, { description: "It stays in the Library." });
    } catch (error) {
      dsToast("Couldn't remove it", { description: error instanceof Error ? error.message : undefined });
    }
    await loadFiles();
  }

  const empty = files !== null && files.length === 0 && !savedLink;

  return (
    <SettingsSection
      id="agent"
      ai={[{ prompt: "Connect to <site> as its agent: pull its settings, read its agent guide and its context, then tell me what you would do first." }]}
      title="Context"
      description={empty ? "No context added" : "What your agent reads before it works on this site"}
    >
      {!empty && files !== null && (
        <ul className="flex flex-col">
          {savedLink && (
            <li>
              <DsListRow
                onOpen={editLink}
                thumbnailIcon={Link2}
                title={savedLink}
                detail="Linked folder or page"
                actions={
                  <DsDropdown>
                    <DsDropdownTrigger asChild>
                      <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label="Options for the linked folder or page" />
                    </DsDropdownTrigger>
                    <DsDropdownContent>
                      <DsDropdownItem iconLeft={Pencil} onSelect={editLink}>
                        Change link
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={X} onSelect={() => saveLink("")}>
                        Remove from context
                      </DsDropdownItem>
                    </DsDropdownContent>
                  </DsDropdown>
                }
              />
            </li>
          )}
          {files?.map((doc) => (
            <li key={doc.id}>
              <DsListRow
                href={`${DOCUMENTS_PATH}/${doc.id}`}
                thumbnailIcon={FileText}
                title={mdName(doc)}
                detail={`${doc.createdBy === "agent" ? "By your agent · " : ""}${shortDate(doc.updatedAt)}`}
                actions={
                  <DsDropdown>
                    <DsDropdownTrigger asChild>
                      <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Options for ${mdName(doc)}`} />
                    </DsDropdownTrigger>
                    <DsDropdownContent>
                      <DsDropdownItem iconLeft={Pencil} onSelect={() => router.push(`${DOCUMENTS_PATH}/${doc.id}`)}>
                        Open and edit
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={RefreshCw} onSelect={() => setChoosing(doc.id)}>
                        Replace from library
                      </DsDropdownItem>
                      <DsDropdownItem iconLeft={X} onSelect={() => removeFile(doc)}>
                        Remove from context
                      </DsDropdownItem>
                    </DsDropdownContent>
                  </DsDropdown>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <DsDropdown>
        <DsDropdownTrigger asChild>
          <DsButton iconLeft={Plus} loading={creating} className="self-start">
            Add
          </DsButton>
        </DsDropdownTrigger>
        <DsDropdownContent align="start">
          <DsDropdownItem iconLeft={FolderOpen} onSelect={() => setChoosing("add")}>
            Choose from library
          </DsDropdownItem>
          <DsDropdownItem iconLeft={FilePlus} onSelect={newFile}>
            New document
          </DsDropdownItem>
          {!savedLink && (
            <>
              <DsDropdownSeparator />
              <DsDropdownItem iconLeft={Link2} onSelect={editLink}>
                Link a folder or page
              </DsDropdownItem>
            </>
          )}
        </DsDropdownContent>
      </DsDropdown>

      <DsDialog
        open={linkOpen}
        onOpenChange={(open) => !savingLink && setLinkOpen(open)}
        title={savedLink ? "Change the link" : "Link a folder or page"}
        description="A folder on your computer or a web page your agent reads before it works."
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveLink(link);
          }}
        >
          <DsField label="Folder or link">
            <DsInput value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} placeholder="~/Documents/my-brain or https://…" />
          </DsField>
          <DsDialogActions>
            <DsButton type="submit" variant="primary" loading={savingLink} disabled={!link.trim() || link.trim() === savedLink}>
              Save
            </DsButton>
          </DsDialogActions>
        </form>
      </DsDialog>

      <MediaPicker
        isOpen={choosing !== null}
        onClose={() => setChoosing(null)}
        kinds={["document"]}
        multiple={choosing === "add"}
        selected={choosing && choosing !== "add" ? [choosing] : undefined}
        confirmLabel={choosing === "add" ? undefined : "Use this file"}
        onSelect={() => {}}
        onSelectDocuments={applyPicked}
      />
    </SettingsSection>
  );
}
