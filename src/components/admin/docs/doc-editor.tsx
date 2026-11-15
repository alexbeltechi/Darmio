"use client";

import * as React from "react";
import { Brain, Download, ExternalLink, File, FileText, Link2, MoreVertical, Plus, Replace, Trash2, X } from "lucide-react";
import {
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownTrigger,
  DsField,
  DsInput,
  DsListRow,
  DsTextarea,
  dsToast,
  useDsConfirm,
  DsTopBar,
} from "@beltechi/parabola";
import {
  DOC_ACCEPT,
  DOC_MAX_BYTES,
  cleanDocLinks,
  isDocFilename,
  mdName,
  type DocKind,
  type DocLink,
  type DocStage,
  type DocWithUsage,
} from "@/lib/cms/docs";
import { WireframesField } from "@/components/admin/pages/wireframes-field";

/** Where an attached doc's post or page opens in the admin. */
export function usageHref(collection: string, slug: string) {
  return collection === "pages" ? `/admin/pages/${slug}` : `/admin/posts/${slug}`;
}

/** Saves the doc's Markdown as a file. */
export function downloadDoc(doc: Pick<DocWithUsage, "title" | "body" | "filename">) {
  const name = mdName(doc);
  const url = URL.createObjectURL(new Blob([doc.body], { type: "text/markdown" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * One doc, laid out like the post editor: a floating top bar (close, the
 * title, Save, a ⋯ menu), the Markdown in a plain box, then the details:
 * name, links, where it's used. Save lights up
 * with changes. Used as the Agent › Docs pane and, with `onClose`, inside the
 * side panel a post or page opens its docs in.
 */
export function DocEditor({
  doc,
  onSaved,
  onDeleted,
  onClose,
}: {
  doc: DocWithUsage;
  onSaved?: (doc: DocWithUsage) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = React.useState(doc.title);
  const [kind, setKind] = React.useState<DocKind>(doc.kind);
  const [body, setBody] = React.useState(doc.body);
  const [stage, setStage] = React.useState<DocStage | undefined>(doc.stage);
  const [links, setLinks] = React.useState<DocLink[]>(doc.links || []);
  const [filename, setFilename] = React.useState(doc.filename);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [saving, setSaving] = React.useState(false);
  const [confirm, confirmDialog] = useDsConfirm();

  // Another doc opened in the same pane: start from it.
  React.useEffect(() => {
    setTitle(doc.title);
    setKind(doc.kind);
    setBody(doc.body);
    setStage(doc.stage);
    setLinks(doc.links || []);
    setFilename(doc.filename);
  }, [doc]);

  const dirty =
    title !== doc.title ||
    kind !== doc.kind ||
    body !== doc.body ||
    stage !== doc.stage ||
    filename !== doc.filename ||
    JSON.stringify(links) !== JSON.stringify(doc.links || []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/docs/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, kind, body, stage, links, filename }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved?.(json.data);
    } catch (error) {
      dsToast("Couldn't save the doc", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  /** Swap the Markdown for a file's contents; it's saved with Save, like any other edit. */
  const replaceWith = async (file: File) => {
    if (!isDocFilename(file.name)) return dsToast("Documents are text files", { description: DOC_ACCEPT.replaceAll(",", " ") });
    if (file.size > DOC_MAX_BYTES) return dsToast("That file is over 512 KB");
    setBody(await file.text());
    setFilename(file.name);
  };

  const remove = async () => {
    const where = doc.usedBy.length;
    const ok = await confirm({
      title: `Delete ${doc.title}?`,
      description:
        where > 0
          ? `It's attached to ${where === 1 ? "1 post or page" : `${where} posts and pages`}, and will be removed from ${where === 1 ? "it" : "them"}. This can't be undone.`
          : "This doc will be deleted for good. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/docs/${doc.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(doc.id);
    else dsToast("Couldn't delete the doc");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto">
        {/* Top bar, as in the post editor: floats over the content, which fades
            out beneath it (`ds-nav-fade`); clicks pass through all but its controls. */}
        <div className="sticky top-0 z-20 h-0">
          <DsTopBar surface="blur" className="flex-row top-0 absolute inset-x-0 items-center justify-between gap-2 px-5 pt-5 pb-10">
            <div className="flex min-w-0 items-center gap-3">
              <DsButton iconLeft={X} aria-label="Close" onClick={onClose} />
              <h1 className="min-w-0 truncate text-h3 text-ds-fg">{mdName({ title, filename })}</h1>
            </div>
            <div className="flex items-center gap-2">
              <DsButton variant="primary" disabled={!dirty} loading={saving} onClick={save}>
                {dirty ? "Save" : "Saved"}
              </DsButton>
              <DsDropdown>
                <DsDropdownTrigger asChild>
                  <DsButton iconLeft={MoreVertical} aria-label="More actions" />
                </DsDropdownTrigger>
                <DsDropdownContent>
                  <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={remove}>
                    Delete doc
                  </DsDropdownItem>
                </DsDropdownContent>
              </DsDropdown>
            </div>
          </DsTopBar>
        </div>

        {/* Clears the floating bar. */}
        <div aria-hidden className="h-[76px]" />

        <div className="flex flex-col gap-5 px-5 pb-10">
          <DsField label="Contents" description={filename ? `Uploaded as ${filename}` : undefined} className="w-full">
            <div className="flex flex-col items-start gap-2">
              <DsTextarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write or paste text, Markdown or HTML"
                spellCheck={false}
                className="w-full [&_textarea]:min-h-[420px] [&_textarea]:font-mono [&_textarea]:text-small"
              />
              <input
                ref={fileRef}
                type="file"
                accept={DOC_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) replaceWith(file);
                }}
              />
              <div className="flex gap-2">
                <DsButton iconLeft={Download} onClick={() => downloadDoc({ title, body, filename })}>
                  Download
                </DsButton>
                <DsButton iconLeft={Replace} onClick={() => fileRef.current?.click()}>
                  Replace
                </DsButton>
              </div>
            </div>
          </DsField>

          {/* The wireframes of the page(s) this doc guides, to open from here. */}
          {doc.usedBy
            .filter((u) => u.collection === "pages")
            .map((u, _, all) => (
              <DsField key={u.slug} label={all.length > 1 ? `Wireframes: ${u.title}` : "Wireframes"} className="w-full">
                <WireframesField pageSlug={u.slug} />
              </DsField>
            ))}

          <DsField label="Name">
            <DsInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="page-name.md" />
          </DsField>


          <DsField label="Links" description="References, the preview, the live page." className="w-full">
            <LinksInput value={links} onChange={setLinks} />
          </DsField>

          <DsField label="Used by" className="w-full">
            {/* A file in Context is read before every job, so it's listed there first. */}
            {kind === "guide" && (
              <DsListRow
                hover={false}
                className="px-0"
                href="/admin/settings#agent"
                thumbnailIcon={Brain}
                title="Context"
                meta="Your agent reads it before every job"
              />
            )}
            {doc.usedBy.length === 0 ? (
              kind === "guide" ? null : (
              <p className="text-p text-ds-fg-subtle">
                Not attached to anything.
              </p>
              )
            ) : (
              <ul className="flex flex-col">
                {doc.usedBy.map((u) => (
                  <li key={`${u.collection}/${u.slug}`}>
                    <DsListRow
                      hover={false}
                      className="px-0"
                      href={usageHref(u.collection, u.slug)}
                      thumbnailIcon={u.collection === "pages" ? File : FileText}
                      title={u.title}
                      meta={u.collection === "pages" ? `Page · /${u.slug}` : "Post"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </DsField>

          <p className="text-small text-ds-fg-subtle">
            Created by {doc.createdBy === "agent" ? "an agent" : "you"} ·{" "}
            {new Date(doc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

/** The doc's links: each opens in a new tab; add one with a label and a URL. */
function LinksInput({ value, onChange }: { value: DocLink[]; onChange: (links: DocLink[]) => void }) {
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const added = cleanDocLinks([{ label, url }])?.[0];

  const add = () => {
    if (!added) return;
    onChange([...value, added]);
    setLabel("");
    setUrl("");
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col">
          {value.map((link, i) => (
            <li key={`${link.url}-${i}`}>
              <DsListRow
                hover={false}
                className="px-0"
                thumbnailIcon={Link2}
                title={
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {link.label}
                  </a>
                }
                meta={link.url}
                actions={
                  <div className="flex gap-1">
                    <DsButton
                      size="small"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      iconLeft={ExternalLink}
                      aria-label={`Open ${link.label}`}
                    />
                    <DsButton
                      size="small"
                      iconLeft={X}
                      aria-label={`Remove ${link.label}`}
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                    />
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <DsInput
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
          aria-label="Link label"
          className="w-40"
        />
        <DsInput
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="/… or https://…"
          aria-label="Link URL"
          className="min-w-48 flex-1"
        />
        <DsButton iconLeft={Plus} disabled={!added} onClick={add}>
          Add
        </DsButton>
      </div>
    </div>
  );
}
