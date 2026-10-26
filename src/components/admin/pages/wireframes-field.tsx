"use client";

import * as React from "react";
import { Download, ExternalLink, MoreVertical, Trash2 } from "lucide-react";
import {
  DS_COLUMNS_CLASS,
  DsButton,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownTrigger,
  dsToast,
  useDsConfirm,
} from "@beltechi/parabola";
import { FileCard } from "@/components/admin/docs/file-card";
import { shortDate, sizeLabel } from "@/lib/cms/docs";
import { wireframeUrl, type WireframeSummary } from "@/lib/cms/wireframes";

/**
 * A page's wireframes: plain HTML sketches made before the page is built from
 * blocks (see the landing-page skill). An agent adds them; you open, download
 * or delete them here. They go when the page is deleted. Put it inside a DsField for the label.
 */
export function WireframesField({ pageSlug }: { pageSlug?: string }) {
  const [items, setItems] = React.useState<WireframeSummary[]>([]);
  const [confirm, confirmDialog] = useDsConfirm();

  const reload = React.useCallback(async () => {
    if (!pageSlug) return;
    try {
      const res = await fetch(`/api/admin/wireframes?page=${encodeURIComponent(pageSlug)}`);
      if (res.ok) setItems((await res.json()).data || []);
    } catch (error) {
      console.error("Failed to load wireframes:", error);
    }
  }, [pageSlug]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  if (!pageSlug) return <p className="text-p text-ds-fg-subtle">Save the page first.</p>;

  const remove = async (item: WireframeSummary) => {
    const ok = await confirm({
      title: `Delete ${item.title}?`,
      description: "This wireframe will be deleted for good. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(wireframeUrl(item.id), { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((w) => w.id !== item.id));
    else dsToast("Couldn't delete the wireframe");
  };

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 ? (
        <div className={DS_COLUMNS_CLASS}>
          {items.map((item) => (
            <FileCard
              key={item.id}
              name={item.title}
              meta={`${shortDate(item.createdAt)} · ${sizeLabel(item.bytes)}`}
              onOpen={() => window.open(wireframeUrl(item.id), "_blank", "noopener")}
              actions={
                <DsDropdown>
                  <DsDropdownTrigger asChild>
                    <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Options for ${item.title}`} />
                  </DsDropdownTrigger>
                  <DsDropdownContent>
                    <DsDropdownItem
                      iconLeft={ExternalLink}
                      onSelect={() => window.open(wireframeUrl(item.id), "_blank", "noopener")}
                    >
                      Open
                    </DsDropdownItem>
                    <DsDropdownItem
                      iconLeft={Download}
                      onSelect={() => window.location.assign(`${wireframeUrl(item.id)}?download=1`)}
                    >
                      Download
                    </DsDropdownItem>
                    <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={() => remove(item)}>
                      Delete
                    </DsDropdownItem>
                  </DsDropdownContent>
                </DsDropdown>
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-p text-ds-fg-subtle">None yet. Ask Claude to wireframe this page.</p>
      )}

      {confirmDialog}
    </div>
  );
}
