"use client";

import * as React from "react";
import { FilePlus, MoreVertical, Paperclip, PanelRightOpen, Plus, Upload, X } from "lucide-react";
import {
  DS_COLUMNS_CLASS,
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsSidePanel,
  dsToast,
} from "@beltechi/parabola";
import { DOC_ACCEPT, mdBytes, mdName, shortDate, sizeLabel, type DocWithUsage } from "@/lib/cms/docs";
import { DocEditor } from "./doc-editor";
import { FileCard } from "./file-card";

/**
 * The Documents field of a post or page: the text files attached to it (the
 * notes it was made from: Markdown, HTML, plain text…), as categories are: by
 * id, from one shared library (admin › Agent). Upload a file, start a blank
 * one, or attach one that exists; open one to read or edit it in a side panel. Detaching leaves it in
 * the library. Put it inside a DsField for the label.
 */
export function DocsField({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [library, setLibrary] = React.useState<DocWithUsage[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/docs");
      if (res.ok) setLibrary((await res.json()).data || []);
    } catch (error) {
      console.error("Failed to load docs:", error);
    }
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const byId = new Map(library.map((d) => [d.id, d]));
  const attached = value.map((id) => byId.get(id)).filter((d): d is DocWithUsage => Boolean(d));
  const others = library.filter((d) => !value.includes(d.id));
  const open = openId ? byId.get(openId) : undefined;

  const attach = (doc: DocWithUsage) => {
    setLibrary((prev) => (prev.some((d) => d.id === doc.id) ? prev : [doc, ...prev]));
    onChange([...value, doc.id]);
  };

  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/docs", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
          dsToast(`Couldn't upload ${file.name}`, { description: json.error });
          continue;
        }
        attach(json.data);
      }
    } finally {
      setUploading(false);
    }
  };

  const createBlank = async () => {
    const res = await fetch("/api/admin/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "untitled.md", kind: "brief", body: "" }),
    });
    const json = await res.json();
    if (!res.ok) return dsToast("Couldn't create the document", { description: json.error });
    attach(json.data);
    setOpenId(json.data.id);
  };

  return (
    <div className="flex flex-col gap-2">
      {attached.length > 0 && (
        <div className={DS_COLUMNS_CLASS}>
          {attached.map((doc) => (
            <FileCard
              key={doc.id}
              name={mdName(doc)}
              meta={`${shortDate(doc.updatedAt)} · ${sizeLabel(mdBytes(doc))}`}
              onOpen={() => setOpenId(doc.id)}
              actions={
                <DsDropdown>
                  <DsDropdownTrigger asChild>
                    <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Options for ${mdName(doc)}`} />
                  </DsDropdownTrigger>
                  <DsDropdownContent>
                    <DsDropdownItem iconLeft={PanelRightOpen} onSelect={() => setOpenId(doc.id)}>
                      Open
                    </DsDropdownItem>
                    <DsDropdownItem iconLeft={X} onSelect={() => onChange(value.filter((id) => id !== doc.id))}>
                      Detach
                    </DsDropdownItem>
                  </DsDropdownContent>
                </DsDropdown>
              }
            />
          ))}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          if (files.length > 0) upload(files);
        }}
      />
      <div>
        <DsDropdown>
          <DsDropdownTrigger asChild>
            <DsButton iconLeft={Plus} loading={uploading}>
              Add
            </DsButton>
          </DsDropdownTrigger>
          <DsDropdownContent align="start">
            <DsDropdownItem iconLeft={Upload} onSelect={() => fileRef.current?.click()}>
              Upload file
            </DsDropdownItem>
            <DsDropdownItem iconLeft={FilePlus} onSelect={createBlank}>
              New document
            </DsDropdownItem>
            {others.length > 0 && (
              <>
                <DsDropdownSeparator />
                {others.map((doc) => (
                  <DsDropdownItem
                    key={doc.id}
                    iconLeft={Paperclip}
                    onSelect={() => attach(doc)}
                  >
                    {mdName(doc)}
                  </DsDropdownItem>
                ))}
              </>
            )}
          </DsDropdownContent>
        </DsDropdown>
      </div>

      <DsSidePanel open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)} label="Document">
        {open && (
          <DocEditor
            doc={open}
            onClose={() => setOpenId(null)}
            onSaved={(saved) => setLibrary((prev) => prev.map((d) => (d.id === saved.id ? saved : d)))}
            onDeleted={(id) => {
              setOpenId(null);
              setLibrary((prev) => prev.filter((d) => d.id !== id));
              onChange(value.filter((v) => v !== id));
            }}
          />
        )}
      </DsSidePanel>
    </div>
  );
}
