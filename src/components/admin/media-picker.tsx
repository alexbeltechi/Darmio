"use client";

import { mediaMatches } from "@/lib/cms/media-search";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Image as ImageIcon,
  Film,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { DsButton, DsCheckbox, DsPill, DsSearch, DsTopBar } from "@beltechi/parabola";
import { cn } from "@/lib/utils";
import {
  compressImages,
  validateFilesForUpload,
  getUploadErrorMessage,
  formatFileSize,
  isCompressibleImage,
  type CompressionProgress,
} from "@/lib/image-compression";
import { thumbnailUrl } from "@/lib/cms/media-url";

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
  accept?: string[]; // e.g., ["image/*", "video/*"]
  maxSelect?: number;
}

interface UploadProgress {
  fileName: string;
  status: "compressing" | "uploading" | "done" | "error";
  progress: number;
  originalSize?: number;
  compressedSize?: number;
  error?: string;
  file?: File; // Keep reference for retry
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  accept,
  maxSelect,
}: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [usedMediaIds, setUsedMediaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // Use array to preserve selection order
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = useMemo(() => {
    return Array.from(uploadProgress.values()).some(
      (p) => p.status === "compressing" || p.status === "uploading"
    );
  }, [uploadProgress]);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const [mediaRes, usedRes] = await Promise.all([
        fetch("/api/admin/media?limit=1000"),
        fetch("/api/admin/media/used"),
      ]);
      const mediaData = await mediaRes.json();
      const usedData = await usedRes.json();
      setMedia(mediaData.data || []);
      setUsedMediaIds(new Set(usedData.usedMediaIds || []));
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSelectedIds([]);
      setSearchQuery("");
      setUploadProgress(new Map());
      setUploadError(null);
    }
  }, [isOpen, fetchMedia]);

  const handleUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadError(null);

    const validationError = validateFilesForUpload(fileArray);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const initialProgress = new Map<string, UploadProgress>();
    fileArray.forEach((file) => {
      initialProgress.set(file.name, {
        fileName: file.name,
        status: isCompressibleImage(file) ? "compressing" : "uploading",
        progress: 0,
        originalSize: file.size,
      });
    });
    setUploadProgress(initialProgress);

    const uploadedIds: string[] = [];

    try {
      const compressionResults = await compressImages(
        fileArray,
        (fileName, progress: CompressionProgress) => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(fileName);
            if (existing) {
              newMap.set(fileName, {
                ...existing,
                status: "compressing",
                progress: Math.round(progress.progress * 0.5), // Compression is first 50%
                compressedSize: progress.compressedSize,
              });
            }
            return newMap;
          });
        }
      );

      for (let i = 0; i < compressionResults.length; i++) {
        const result = compressionResults[i];
        const originalFile = fileArray[i];

        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(originalFile.name, {
            fileName: originalFile.name,
            status: "uploading",
            progress: 50,
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
          });
          return newMap;
        });

        const formData = new FormData();
        formData.append("file", result.file);

        try {
          const res = await fetch("/api/admin/media", {
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.data?.id) {
              uploadedIds.push(data.data.id);
            }

            setUploadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.set(originalFile.name, {
                fileName: originalFile.name,
                status: "done",
                progress: 100,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
              });
              return newMap;
            });
          } else {
            // Handle upload error - store file for retry
            const errorMsg = getUploadErrorMessage(res.status, originalFile.name);
            setUploadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.set(originalFile.name, {
                fileName: originalFile.name,
                status: "error",
                progress: 0,
                originalSize: result.originalSize,
                compressedSize: result.compressedSize,
                error: errorMsg,
                file: result.file, // Store compressed file for retry
              });
              return newMap;
            });
          }
        } catch (error) {
          console.error("Upload error:", error);
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(originalFile.name, {
              fileName: originalFile.name,
              status: "error",
              progress: 0,
              originalSize: result.originalSize,
              error: "Network error. Please check your connection.",
              file: result.file, // Store compressed file for retry
            });
            return newMap;
          });
        }
      }

      await fetchMedia();

      if (uploadedIds.length > 0) {
        if (multiple) {
          setSelectedIds((prev) => {
            const newSelected = [...prev];
            uploadedIds.forEach((id) => {
              if (!newSelected.includes(id) && (!maxSelect || newSelected.length < maxSelect)) {
                newSelected.push(id);
              }
            });
            return newSelected;
          });
        } else {
          // Single select: select the first uploaded file
          setSelectedIds([uploadedIds[0]]);
        }
      }

      // Clear progress after a delay if all successful
      const hasErrors = Array.from(uploadProgress.values()).some(
        (p) => p.status === "error"
      );
      if (!hasErrors) {
        setTimeout(() => {
          setUploadProgress(new Map());
        }, 2000);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("An unexpected error occurred. Please try again.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      // Only set inactive if leaving the modal entirely
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
      );
      if (validFiles.length > 0) {
        handleUpload(validFiles);
      }
    }
  };

  // Filter media based on accept types and search
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      if (!mediaMatches(item, searchQuery)) return false;

      if (accept && accept.length > 0) {
        const matches = accept.some((type) => {
          if (type.endsWith("/*")) {
            const prefix = type.replace("/*", "/");
            return item.mime.startsWith(prefix);
          }
          return item.mime === type;
        });
        if (!matches) return false;
      }

      return true;
    });
  }, [media, searchQuery, accept]);

  const toggleSelect = (id: string) => {
    if (!multiple) {
      if (selectedIds.includes(id)) {
        setSelectedIds([]);
      } else {
        setSelectedIds([id]);
      }
      return;
    }

    const index = selectedIds.indexOf(id);
    if (index !== -1) {
      setSelectedIds((prev) => prev.filter((_, i) => i !== index));
    } else {
      if (maxSelect && selectedIds.length >= maxSelect) {
        return; // Don't add if at max
      }
      // Add to end of selection (preserves order)
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleConfirm = () => {
    // Return items in the order they were selected
    const mediaMap = new Map(media.map((m) => [m.id, m]));
    const selectedItems = selectedIds
      .map((id) => mediaMap.get(id))
      .filter((item): item is MediaItem => item !== undefined);
    onSelect(selectedItems);
    onClose();
  };

  const clearError = () => {
    setUploadError(null);
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      for (const [key, value] of newMap) {
        if (value.status === "error") {
          newMap.delete(key);
        }
      }
      return newMap;
    });
  };

  const dismissError = (fileName: string) => {
    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  };

  const handleRetry = async (fileName: string) => {
    const item = uploadProgress.get(fileName);
    if (!item?.file) return;

    setUploadProgress((prev) => {
      const newMap = new Map(prev);
      newMap.set(fileName, {
        ...item,
        status: "uploading",
        progress: 50,
        error: undefined,
      });
      return newMap;
    });

    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const res = await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileName, {
            ...item,
            status: "done",
            progress: 100,
            error: undefined,
            file: undefined, // Clear file reference
          });
          return newMap;
        });
        
        await fetchMedia();
        
        if (data.data?.id) {
          if (multiple) {
            setSelectedIds((prev) => {
              if (!prev.includes(data.data.id) && (!maxSelect || prev.length < maxSelect)) {
                return [...prev, data.data.id];
              }
              return prev;
            });
          } else {
            setSelectedIds([data.data.id]);
          }
        }

        setTimeout(() => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(fileName);
            if (current?.status === "done") {
              newMap.delete(fileName);
            }
            return newMap;
          });
        }, 2000);
      } else {
        const errorMsg = getUploadErrorMessage(res.status, fileName);
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(fileName, {
            ...item,
            status: "error",
            progress: 0,
            error: errorMsg,
          });
          return newMap;
        });
      }
    } catch (error) {
      console.error("Retry upload error:", error);
      setUploadProgress((prev) => {
        const newMap = new Map(prev);
        newMap.set(fileName, {
          ...item,
          status: "error",
          progress: 0,
          error: "Network error. Please check your connection.",
        });
        return newMap;
      });
    }
  };

  const count = selectedIds.length;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--ds-z-menu) bg-ds-bg/60 backdrop-blur-[24px] motion-safe:animate-in motion-safe:fade-in-0" />
        <Dialog.Content
          data-slot="ds-media-picker"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement).focus();
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "fixed top-1/2 left-1/2 z-(--ds-z-menu) flex h-[min(820px,calc(100dvh-32px))] w-[min(1100px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden",
            "rounded-ds-lg bg-ds-bg text-ds-fg shadow-ds-raised outline-none",
            "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          )}
        >
          {/* The grid scrolls under the header, which stays pinned with the Parabola nav
              fade (`ds-nav-fade`); clicks pass through the gradient's empty space. The
              bar ends 20px under the search and the grid starts right below it. */}
          <div className="min-h-0 flex-1 overflow-y-auto">
          <DsTopBar surface="blur" className="gap-4 p-5">
            <div className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1.5">
                <Dialog.Title className="text-h3">Choose from library</Dialog.Title>
                <Dialog.Description className="text-p text-ds-fg-muted">
                  {multiple
                    ? maxSelect
                      ? `Select up to ${maxSelect} files.`
                      : "Select files from your Library."
                    : "Select a file from your Library."}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <DsButton iconLeft={X} aria-label="Close" />
              </Dialog.Close>
            </div>

            <DsSearch aria-label="Search media" value={searchQuery} onValueChange={setSearchQuery} className="w-full" />

            {uploadError && (
              <div className="flex items-start gap-3 rounded-ds-lg bg-ds-error/10 p-3">
                <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-ds-error" />
                <p className="flex-1 text-p text-ds-error">{uploadError}</p>
                <DsButton variant="text" size="small" iconLeft={X} aria-label="Dismiss" onClick={clearError} />
              </div>
            )}

            {uploadProgress.size > 0 && (
              <ul className="flex flex-col gap-2">
                {Array.from(uploadProgress.values()).map((item) => (
                  <li
                    key={item.fileName}
                    className={cn(
                      "flex flex-col gap-2 rounded-ds-lg p-3",
                      item.status === "error" ? "bg-ds-error/10" : "bg-ds-surface-subtle"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {(item.status === "compressing" || item.status === "uploading") && (
                        <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-ds-fg-subtle" />
                      )}
                      {item.status === "done" && <CheckCircle2 aria-hidden className="size-4 shrink-0" />}
                      {item.status === "error" && <AlertCircle aria-hidden className="size-4 shrink-0 text-ds-error" />}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-p">{item.fileName}</p>
                        <p className={cn("text-small", item.status === "error" ? "text-ds-error" : "text-ds-fg-muted")}>
                          {item.status === "compressing" && `Optimizing… ${item.progress}%`}
                          {item.status === "uploading" && `Uploading… ${item.progress}%`}
                          {item.status === "done" &&
                            (item.originalSize && item.compressedSize && item.originalSize !== item.compressedSize
                              ? `${formatFileSize(item.originalSize)} → ${formatFileSize(item.compressedSize)} (${Math.round(
                                  (1 - item.compressedSize / item.originalSize) * 100
                                )}% smaller)`
                              : item.originalSize && formatFileSize(item.originalSize))}
                          {item.status === "error" && item.error}
                        </p>
                      </div>
                      {item.status === "error" && (
                        <div className="flex shrink-0 items-center gap-1">
                          {item.file && (
                            <DsButton size="small" iconLeft={RotateCcw} onClick={() => handleRetry(item.fileName)}>
                              Retry
                            </DsButton>
                          )}
                          <DsButton
                            variant="text"
                            size="small"
                            iconLeft={X}
                            aria-label={`Dismiss ${item.fileName}`}
                            onClick={() => dismissError(item.fileName)}
                          />
                        </div>
                      )}
                    </div>
                    {(item.status === "compressing" || item.status === "uploading") && (
                      <div className="h-1 overflow-hidden rounded-full bg-ds-surface">
                        <div className="h-full bg-ds-fg transition-all duration-300" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DsTopBar>

          {/* Media grid */}
          <div className="relative px-5 pb-5">
            {dragActive && (
              <div className="pointer-events-none absolute inset-x-5 inset-y-0 z-10 flex flex-col items-center justify-center gap-1 rounded-ds-lg border-2 border-dashed border-ds-fg-subtle bg-ds-bg/80 text-center">
                <Upload aria-hidden className="mb-1 size-6" />
                <p className="text-p">Drop files to upload</p>
                <p className="text-small text-ds-fg-muted">Images are optimized for the web automatically.</p>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 aria-label="Loading media" className="size-6 animate-spin text-ds-fg-subtle" />
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-16 text-center">
                <p className="text-p text-ds-fg-muted">
                  {media.length === 0 ? "No media uploaded yet" : "No media matches your search"}
                </p>
                {media.length === 0 && (
                  <p className="text-small text-ds-fg-subtle">Upload files or drag and drop them here.</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredMedia.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isDisabled = Boolean(multiple && maxSelect && selectedIds.length >= maxSelect && !isSelected);
                  const name = item.title || item.originalName || item.filename;
                  const isImage = item.mime.startsWith("image/");

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isDisabled && toggleSelect(item.id)}
                      className={cn(
                        "group flex min-w-0 flex-col gap-3",
                        isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                      )}
                    >
                      {/* Selected: 2px outline in the text colour (black, white in dark); hover: a faint one. */}
                      <div
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-ds-md bg-ds-surface outline-2 transition-[outline-color]",
                          isSelected
                            ? "outline-ds-fg"
                            : "outline-transparent group-hover:outline-ds-fg/20"
                        )}
                      >
                        {isImage || item.poster?.url ? (
                          <img
                            src={isImage ? thumbnailUrl(item) : item.poster!.url}
                            alt={item.alt || ""}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center">
                            <Film aria-hidden className="size-8 text-ds-fg-subtle" />
                          </span>
                        )}
                        <span className="absolute top-2 left-2">
                          {isImage ? (
                            <ImageIcon aria-hidden className="size-4 text-white drop-shadow-md" />
                          ) : (
                            <Film aria-hidden className="size-4 text-white drop-shadow-md" />
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* The checkbox handles its own clicks; the rest of the tile toggles too. */}
                        <div className="flex size-6 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <DsCheckbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={() => toggleSelect(item.id)}
                            aria-label={`Select ${name}`}
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-p text-ds-fg">{name}</p>
                            {!usedMediaIds.has(item.id) && <DsPill variant="highlight">Unused</DsPill>}
                          </div>
                          <p className="truncate text-p text-ds-fg-subtle">{formatFileSize(item.size)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-ds-border p-5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUpload(e.target.files);
                  e.target.value = "";
                }
              }}
              className="hidden"
            />
            <DsButton iconLeft={Upload} loading={isUploading} onClick={() => fileInputRef.current?.click()}>
              {isUploading ? "Processing…" : "Upload"}
            </DsButton>
            <span className="min-w-0 flex-1 truncate text-p text-ds-fg-muted">{count} selected</span>
            <Dialog.Close asChild>
              <DsButton>Cancel</DsButton>
            </Dialog.Close>
            <DsButton variant="primary" onClick={handleConfirm} disabled={count === 0}>
              {multiple ? `Add ${count} file${count !== 1 ? "s" : ""}` : "Select"}
            </DsButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
