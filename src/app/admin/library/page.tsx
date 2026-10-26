"use client";

import { mediaMatches } from "@/lib/cms/media-search";
import { useMediaDelete } from "@/components/admin/media-delete-dialog";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENTS_PATH, LIBRARY_TYPES } from "@/components/admin/docs/documents-workspace";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Film,
  Loader2,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  FolderOpen,
  FileImage,
  SlidersHorizontal,
  RotateCcw,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { MediaItem } from "@/lib/cms/types";
import { MediaDetailModal } from "@/components/admin/media-detail-modal";
import {
  DsButton,
  DsCheckbox,
  DsDialog,
  DsSidePanel,
  cn,
  DsDialogActions,
  DsDialogCancel,
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownSeparator,
  DsDropdownTrigger,
  DsField,
  DsPill,
  DsRadio,
  DsRadioGroup,
  DsSearch,
  DsSelect,
  DsTooltip,
  dsToast,
  useDsConfirm,
} from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import {
  compressImages,
  validateFilesForUpload,
  getUploadErrorMessage,
  formatFileSize,
  isCompressibleImage,
  type CompressionProgress,
} from "@/lib/image-compression";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { MediaBulkEditModal } from "@/components/admin/media-bulk-edit-modal";
import { thumbnailUrl } from "@/lib/cms/media-url";

type FilterType = "all" | "images" | "video";
type UsageFilter = "all" | "used" | "unused";
type SortOption = "newest" | "oldest" | "created-newest" | "created-oldest" | "largest" | "smallest" | "name-asc" | "name-desc";

/** When it was uploaded; older items without the field fall back to their creation date. */
const uploadedTime = (item: MediaItem) => new Date(item.uploadedAt || item.source?.ingestedAt || item.createdAt).getTime();

const ITEMS_PER_PAGE = 50;

interface UsedMediaResponse {
  usedMediaIds: string[];
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

export default function MediaLibraryPage() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [usedMediaIds, setUsedMediaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = useMemo(() => {
    return Array.from(uploadProgress.values()).some(
      (p) => p.status === "compressing" || p.status === "uploading"
    );
  }, [uploadProgress]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  // Back from Library › Documents with another type picked (`?type=images`).
  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get("type");
    if (type === "images" || type === "video") setTypeFilter(type);
  }, []);
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceFileName, setReplaceFileName] = useState<string | null>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const batchFolderInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [confirm, confirmDialog] = useDsConfirm();
  const [deleteMediaItems, deleteMediaDialog] = useMediaDelete();
  
  const [showBatchReplaceDialog, setShowBatchReplaceDialog] = useState(false);
  const [batchReplaceMode, setBatchReplaceMode] = useState<"single" | "folder">("folder");
  const [batchReplacing, setBatchReplacing] = useState(false);
  const [batchReplaceProgress, setBatchReplaceProgress] = useState<{matched: number; total: number; current: string} | null>(null);

  // Sheet state for creating post with selected media
  const [sheetOpen, setSheetOpen] = useState(false);
  const [preSelectedMediaIds, setPreSelectedMediaIds] = useState<string[]>([]);

  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  // Check if we're on desktop (lg breakpoint = 1024px)
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const fetchMedia = useCallback(async () => {
    try {
      const [mediaRes, usedRes] = await Promise.all([
        fetch("/api/admin/media?limit=1000"), // Load all for client-side filtering/pagination
        fetch("/api/admin/media/used"),
      ]);
      const mediaData = await mediaRes.json();
      const usedData: UsedMediaResponse = await usedRes.json();

      setMedia(mediaData.data || []);
      setUsedMediaIds(new Set(usedData.usedMediaIds || []));
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();

    // Refetch when tab becomes visible (e.g., after publishing a post in another section)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMedia();
      }
    };

    const handleFocus = () => {
      fetchMedia();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchMedia]);

  // Get unique months from media for date filter
  const availableMonths = useMemo(() => {
    const months = new Map<string, string>();
    media.forEach((item) => {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      months.set(key, label);
    });
    return Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [media]);

  const filteredMedia = useMemo(() => {
    const filtered = media.filter((item) => {
      if (!mediaMatches(item, searchQuery)) return false;

      if (typeFilter === "images" && !item.mime.startsWith("image/")) {
        return false;
      }
      if (typeFilter === "video" && !item.mime.startsWith("video/")) {
        return false;
      }
      if (usageFilter === "used" && !usedMediaIds.has(item.id)) {
        return false;
      }
      if (usageFilter === "unused" && usedMediaIds.has(item.id)) {
        return false;
      }

      if (dateFilter !== "all") {
        const date = new Date(item.createdAt);
        const itemMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (itemMonth !== dateFilter) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return uploadedTime(b) - uploadedTime(a);
        case "oldest":
          return uploadedTime(a) - uploadedTime(b);
        case "created-newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "created-oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "largest":
          return (b.size || 0) - (a.size || 0);
        case "smallest":
          return (a.size || 0) - (b.size || 0);
        case "name-asc":
          return (a.title || a.filename).localeCompare(b.title || b.filename);
        case "name-desc":
          return (b.title || b.filename).localeCompare(a.title || a.filename);
        default:
          return 0;
      }
    });
  }, [media, searchQuery, typeFilter, usageFilter, dateFilter, usedMediaIds, sortBy]);

  const totalPages = Math.ceil(filteredMedia.length / ITEMS_PER_PAGE);
  
  const paginatedMedia = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMedia.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMedia, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, usageFilter, dateFilter, sortBy]);

  // Navigation for modal (within current page)
  const currentIndex = selectedMediaId ? paginatedMedia.findIndex((m) => m.id === selectedMediaId) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < paginatedMedia.length - 1;

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      const next = paginatedMedia[currentIndex + (direction === "prev" ? -1 : 1)];
      if (currentIndex >= 0 && next) setSelectedMediaId(next.id);
    },
    [paginatedMedia, currentIndex]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (!selectedMediaId) return;
      // Not while a confirm (e.g. delete) is open over the details. The dialog closes itself on Escape.
      if (document.querySelector("[role=alertdialog]")) return;
      if (e.key === "ArrowLeft") handleNavigate("prev");
      if (e.key === "ArrowRight") handleNavigate("next");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMediaId, handleNavigate]);

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

      // Clear progress after a delay if all successful
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newMap = new Map(prev);
          for (const [key, value] of newMap) {
            if (value.status === "done") {
              newMap.delete(key);
            }
          }
          return newMap;
        });
      }, 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("An unexpected error occurred. Please try again.");
    }
  };

  /** Delete through the shared confirm (lists the items and the posts that use them), then drop what went. */
  const deleteItems = async (ids: string[]) => {
    const gone = new Set(await deleteMediaItems(ids));
    if (gone.size === 0) return;
    setMedia((prev) => prev.filter((m) => !gone.has(m.id)));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    if (selectedMediaId && gone.has(selectedMediaId)) setSelectedMediaId(null);
  };

  const handleDelete = (id: string) => deleteItems([id]);

  const handleBulkDelete = () => deleteItems([...selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(paginatedMedia.map((m) => m.id)));

  const selectAllUnused = () => {
    const unusedIds = paginatedMedia
      .filter((m) => !usedMediaIds.has(m.id))
      .map((m) => m.id);
    setSelectedIds(new Set(unusedIds));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const createPostWithMedia = () => {
    if (selectedIds.size === 0) return;
    const mediaIds = Array.from(selectedIds);
    
    if (isDesktop) {
      setPreSelectedMediaIds(mediaIds);
      setSheetOpen(true);
    } else {
      router.push(`/admin/posts/new?media=${mediaIds.join(",")}`);
    }
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setPreSelectedMediaIds([]);
  };

  const handleSheetSaved = () => {
    setSheetOpen(false);
    setPreSelectedMediaIds([]);
    setSelectedIds(new Set()); // Clear selection after creating post
    dsToast.success("Post created successfully");
    // Refetch media to update "Unused" badges
    fetchMedia();
  };

  const handleBulkEditSave = async (updates: Partial<MediaItem>) => {
    try {
      const ids = Array.from(selectedIds);
      const response = await fetch("/api/admin/media/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates }),
      });

      if (!response.ok) {
        throw new Error("Failed to update media");
      }

      const result = await response.json();
      dsToast.success(`Updated ${result.modifiedCount} ${result.modifiedCount === 1 ? "item" : "items"}`);
      
      await fetchMedia();
      setSelectedIds(new Set()); // Clear selection
    } catch (error) {
      console.error("Bulk edit error:", error);
      dsToast.error("Failed to update media items");
      throw error;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    dsToast("URL copied");
  };

  const handleReplaceFromMenu = (id: string) => {
    setReplaceTargetId(id);
    replaceInputRef.current?.click();
  };

  const handleReplaceFromModal = (id: string) => {
    setSelectedMediaId(null); // Close the detail modal
    setReplaceTargetId(id);
    // Small delay to allow modal to close before opening file picker
    setTimeout(() => {
      replaceInputRef.current?.click();
    }, 100);
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replaceTargetId) {
      setReplaceTargetId(null);
      return;
    }

    setIsReplacing(true);
    setReplaceFileName(file.name);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const replaceRes = await fetch(`/api/admin/media/${replaceTargetId}/replace`, {
        method: "POST",
        body: formData,
      });

      if (replaceRes.ok) {
        dsToast.success("File replaced successfully");
        await fetchMedia();
      } else {
        dsToast.error("Failed to replace file");
      }
    } catch (error) {
      console.error("Replace failed:", error);
      dsToast.error("Failed to replace file");
    } finally {
      setIsReplacing(false);
      setReplaceTargetId(null);
      setReplaceFileName(null);
      if (replaceInputRef.current) {
        replaceInputRef.current.value = "";
      }
    }
  };

  // Extract base filename (without shortId suffix) for matching
  const extractBaseName = (filename: string): string => {
    // filename format: "name-shortId.ext" or "name-shortId-variant.ext"
    // We want to match against "name" part
    const withoutExt = filename.replace(/\.[^.]+$/, "");
    // Remove the shortId (last segment after dash that's 4 hex chars)
    const parts = withoutExt.split("-");
    // Remove variant suffix if present (thumb, display, etc.)
    const variants = ["thumb", "display", "large", "medium", "original"];
    if (variants.includes(parts[parts.length - 1])) {
      parts.pop();
    }
    // Remove shortId (4 hex chars)
    if (parts.length > 1 && /^[a-f0-9]{4}$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.join("-").toLowerCase();
  };

  const handleBatchReplaceFolder = async (files: FileList) => {
    if (selectedIds.size === 0 || files.length === 0) return;

    const selectedItems = media.filter((m) => selectedIds.has(m.id));
    
    // Create a map of base names to replacement files from the folder
    const folderFiles = new Map<string, File>();
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
      const baseName = file.name.replace(/\.[^.]+$/, "").toLowerCase();
      folderFiles.set(baseName, file);
    }

    // Find matches: for each selected item, find corresponding file in folder
    const matches: Array<{ item: MediaItem; file: File }> = [];
    const unmatched: MediaItem[] = [];

    for (const item of selectedItems) {
      const itemBaseName = extractBaseName(item.filename);
      
      // Try exact match first, then partial match
      let matchedFile = folderFiles.get(itemBaseName);
      
      // If no exact match, try to find partial match
      if (!matchedFile) {
        for (const [folderBaseName, file] of folderFiles) {
          if (itemBaseName === folderBaseName || 
              itemBaseName.startsWith(folderBaseName) || 
              folderBaseName.startsWith(itemBaseName)) {
            matchedFile = file;
            break;
          }
        }
      }

      if (matchedFile) {
        matches.push({ item, file: matchedFile });
      } else {
        unmatched.push(item);
      }
    }

    if (matches.length === 0) {
      dsToast.error("No matching files found in the folder. Make sure the filenames match the original filenames (e.g., '000004.jpg' matches '000004-xyz.webp').");
      return;
    }

    if (unmatched.length > 0) {
      const proceed = await confirm({
        title: `Replace ${matches.length} of ${selectedItems.length} files?`,
        description: (
          <>
            {unmatched.length} {unmatched.length === 1 ? "item has" : "items have"} no match and will be skipped:{" "}
            {unmatched.slice(0, 5).map((i) => i.title || i.filename).join(", ")}
            {unmatched.length > 5 && ` and ${unmatched.length - 5} more`}.
          </>
        ),
        confirmLabel: `Replace ${matches.length}`,
      });
      if (!proceed) return;
    }

    setBatchReplacing(true);
    setBatchReplaceProgress({ matched: 0, total: matches.length, current: "" });

    try {
      let replacedCount = 0;

      for (const { item, file } of matches) {
        setBatchReplaceProgress({ 
          matched: replacedCount, 
          total: matches.length, 
          current: item.title || item.filename 
        });

        // Replace media (uploads new, updates references, deletes old)
        const formData = new FormData();
        formData.append("file", file);

        const replaceRes = await fetch(`/api/admin/media/${item.id}/replace`, {
          method: "POST",
          body: formData,
        });

        if (replaceRes.ok) {
          replacedCount++;
        }
      }

      setBatchReplaceProgress({ matched: replacedCount, total: matches.length, current: "Done!" });

      await fetchMedia();
      setSelectedIds(new Set());

      setTimeout(() => {
        setShowBatchReplaceDialog(false);
        setBatchReplacing(false);
        setBatchReplaceProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Batch replace failed:", error);
      dsToast.error("Batch replace failed. Please try again.");
      setBatchReplacing(false);
      setBatchReplaceProgress(null);
    }
  };

  const handleBatchReplaceSingle = async (file: File) => {
    if (selectedIds.size === 0) return;

    setBatchReplacing(true);
    setBatchReplaceProgress({ matched: 0, total: selectedIds.size, current: "" });

    try {
      const selectedItems = media.filter((m) => selectedIds.has(m.id));
      let replacedCount = 0;

      for (const item of selectedItems) {
        setBatchReplaceProgress({ matched: replacedCount, total: selectedIds.size, current: item.title || item.filename });

        // Replace media (uploads new, updates references, deletes old)
        const formData = new FormData();
        formData.append("file", file);

        const replaceRes = await fetch(`/api/admin/media/${item.id}/replace`, {
          method: "POST",
          body: formData,
        });

        if (replaceRes.ok) {
          replacedCount++;
        }
      }

      setBatchReplaceProgress({ matched: replacedCount, total: selectedIds.size, current: "Done!" });

      await fetchMedia();
      setSelectedIds(new Set());

      setTimeout(() => {
        setShowBatchReplaceDialog(false);
        setBatchReplacing(false);
        setBatchReplaceProgress(null);
      }, 1500);
    } catch (error) {
      console.error("Batch replace failed:", error);
      dsToast.error("Batch replace failed. Please try again.");
      setBatchReplacing(false);
      setBatchReplaceProgress(null);
    }
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

        setTimeout(() => {
          setUploadProgress((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(fileName);
            if (current?.status === "done") {
              newMap.delete(fileName);
            }
            return newMap;
          });
        }, 3000);
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

  const usageOptions: { value: UsageFilter; label: string }[] = [
    { value: "all", label: "Used and unused" },
    { value: "used", label: "Used" },
    { value: "unused", label: "Unused" },
  ];

  const sortLabels: Record<SortOption, string> = {
    newest: "Newest uploads first",
    oldest: "Oldest uploads first",
    "created-newest": "Date created (newest)",
    "created-oldest": "Date created (oldest)",
    largest: "Largest first",
    smallest: "Smallest first",
    "name-asc": "Name (A-Z)",
    "name-desc": "Name (Z-A)",
  };

  // Check if any filters are active (for mobile indicator and reset button)
  const hasActiveFilters = typeFilter !== "all" || usageFilter !== "all" || dateFilter !== "all" || sortBy !== "newest" || searchQuery !== "";

  // Documents are one more type in the Library; picking it opens their list.
  const typeOptions = LIBRARY_TYPES;
  const pickType = (value: string) =>
    value === "documents" ? router.push(DOCUMENTS_PATH) : setTypeFilter(value as FilterType);
  const dateOptions = [
    { value: "all", label: "All dates" },
    ...availableMonths.map(([key, label]) => ({ value: key, label })),
  ];
  const sortOptions = (Object.keys(sortLabels) as SortOption[]).map((option) => ({
    value: option,
    label: sortLabels[option],
  }));

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setUsageFilter("all");
    setDateFilter("all");
    setSortBy("newest");
  };

  const allOnPageSelected = paginatedMedia.length > 0 && selectedIds.size === paginatedMedia.length;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header and filters stay pinned over the grid, which fades out beneath
          the Parabola nav fade (`ds-nav-fade`); clicks pass through the gradient's
          empty space to the tiles under it. The bar ends 20px under the
          filters and the grid starts right below it, so nothing sits under the fade at rest. */}
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-5">
        <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">
          Library {!loading && `(${media.length})`}
        </h1>
        <DsButton iconLeft={Upload} loading={isUploading} onClick={() => uploadInputRef.current?.click()}>
          {isUploading ? "Processing…" : "Upload"}
        </DsButton>
        <AdminMenuButton />
        <input
          ref={uploadInputRef}
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
          disabled={isUploading}
        />
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 px-5">

        <DsSearch
          aria-label="Search media"
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="min-w-0 flex-1"
        />

        {/* Below xl the filters move into a dialog */}
        <DsTooltip content="Filter and sort">
          <DsButton
            iconLeft={SlidersHorizontal}
            aria-label="Filter and sort"
            pressed={hasActiveFilters}
            onClick={() => setShowFilterModal(true)}
            className="xl:hidden"
          />
        </DsTooltip>

        <DsSelect
          aria-label="Type"
          options={typeOptions}
          value={typeFilter}
          onValueChange={pickType}
          className="hidden w-[170px] shrink-0 xl:flex"
        />
        <DsSelect
          aria-label="Usage"
          options={usageOptions}
          value={usageFilter}
          onValueChange={(value) => setUsageFilter(value as UsageFilter)}
          className="hidden w-[170px] shrink-0 xl:flex"
        />
        <DsSelect
          aria-label="Date"
          options={dateOptions}
          value={dateFilter}
          onValueChange={setDateFilter}
          className="hidden w-[170px] shrink-0 xl:flex"
        />
        <DsSelect
          aria-label="Sort by"
          options={sortOptions}
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
          className="hidden w-[230px] shrink-0 xl:flex"
        />

        {hasActiveFilters && (
          <DsTooltip content="Reset filters">
            <DsButton iconLeft={RotateCcw} aria-label="Reset filters" onClick={resetFilters} className="hidden xl:inline-flex" />
          </DsTooltip>
        )}

        <DsDropdown>
          <DsTooltip content={selectedIds.size ? `${selectedIds.size} selected` : "Select media"}>
            <DsDropdownTrigger asChild>
              <DsButton iconLeft={MoreVertical} aria-label="Bulk actions" />
            </DsDropdownTrigger>
          </DsTooltip>
          <DsDropdownContent>
            {!allOnPageSelected && (
              <DsDropdownItem disabled={paginatedMedia.length === 0} onSelect={selectAll}>
                Select all
              </DsDropdownItem>
            )}
            <DsDropdownItem onSelect={selectAllUnused}>Select unused</DsDropdownItem>
            {selectedIds.size > 0 && (
              <>
                <DsDropdownItem onSelect={() => setSelectedIds(new Set())}>Deselect all</DsDropdownItem>
                <DsDropdownSeparator />
                <DsDropdownItem iconLeft={Pencil} meta={selectedIds.size} onSelect={() => setShowBulkEditModal(true)}>
                  Edit
                </DsDropdownItem>
                <DsDropdownItem iconLeft={Plus} meta={selectedIds.size} onSelect={createPostWithMedia}>
                  Create post
                </DsDropdownItem>
                <DsDropdownItem iconLeft={RefreshCw} meta={selectedIds.size} onSelect={() => setShowBatchReplaceDialog(true)}>
                  Replace
                </DsDropdownItem>
                <DsDropdownSeparator />
                <DsDropdownItem tone="danger" iconLeft={Trash2} meta={selectedIds.size} onSelect={handleBulkDelete}>
                  Delete
                </DsDropdownItem>
              </>
            )}
          </DsDropdownContent>
        </DsDropdown>
      </div>

      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Error Banner */}
        {uploadError && (
          <div className="mb-4 flex items-start gap-3 rounded-ds-lg bg-ds-error/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-ds-error" />
            <p className="flex-1 text-p text-ds-error">{uploadError}</p>
            <DsButton variant="text" size="small" iconLeft={X} aria-label="Dismiss" onClick={clearError} />
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress.size > 0 && (
          <div className="mb-4 space-y-2">
            {Array.from(uploadProgress.values()).map((item) => (
              <div
                key={item.fileName}
                className={cn(
                  "rounded-ds-lg p-3",
                  item.status === "error" ? "bg-ds-error/10" : "bg-ds-surface-subtle"
                )}
              >
                <div className="flex items-center gap-3">
                  {item.status === "compressing" && (
                    <Loader2 aria-hidden className="size-4 animate-spin text-ds-fg-muted" />
                  )}
                  {item.status === "uploading" && (
                    <Loader2 aria-hidden className="size-4 animate-spin text-ds-fg" />
                  )}
                  {item.status === "done" && (
                    <CheckCircle2 aria-hidden className="size-4 text-ds-fg" />
                  )}
                  {item.status === "error" && (
                    <AlertCircle aria-hidden className="size-4 text-ds-error" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-p text-ds-fg">{item.fileName}</p>
                    <p className="text-small text-ds-fg-muted">
                      {item.status === "compressing" && "Optimizing image..."}
                      {item.status === "uploading" && "Uploading..."}
                      {item.status === "done" && (
                        <>
                          {item.originalSize && item.compressedSize && item.originalSize !== item.compressedSize ? (
                            <>
                              {formatFileSize(item.originalSize)} → {formatFileSize(item.compressedSize)}
                              <span className="ml-1 text-ds-fg">
                                ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% smaller)
                              </span>
                            </>
                          ) : (
                            item.originalSize && formatFileSize(item.originalSize)
                          )}
                        </>
                      )}
                      {item.status === "error" && (
                        <span className="text-ds-error">{item.error}</span>
                      )}
                    </p>
                  </div>

                  {(item.status === "compressing" || item.status === "uploading") && (
                    <span className="text-small text-ds-fg-muted">{item.progress}%</span>
                  )}

                  {/* Retry and Dismiss buttons for errors */}
                  {item.status === "error" && (
                    <div className="flex shrink-0 items-center gap-2">
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

                {/* Progress bar */}
                {(item.status === "compressing" || item.status === "uploading") && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ds-surface">
                    <div
                      className="h-full bg-ds-fg transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* Main Grid - Drag Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`rounded-ds-lg transition-colors ${dragActive ? "bg-ds-surface-subtle" : ""}`}
      >
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 aria-label="Loading media" className="size-6 animate-spin text-ds-fg-subtle" />
          </div>
        ) : filteredMedia.length === 0 && media.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex flex-col gap-1">
              <p className="text-p text-ds-fg-muted">No media yet</p>
              <p className="text-small text-ds-fg-subtle">
                Drag and drop files here or upload them. Images are optimized for the web automatically.
              </p>
            </div>
            <DsButton iconLeft={Upload} onClick={() => uploadInputRef.current?.click()}>
              Upload
            </DsButton>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-p text-ds-fg-muted">No media matches</p>
            {hasActiveFilters && (
              <DsButton iconLeft={RotateCcw} onClick={resetFilters}>
                Reset filters
              </DsButton>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {paginatedMedia.map((item) => {
              const name = item.title || item.originalName || item.filename;
              const selected = selectedIds.has(item.id);
              return (
                <div key={item.id} className="flex min-w-0 flex-col gap-3">
                  {/* The same tile as a post's gallery: click to open, delete top right on hover (always on touch). */}
                  <div className="group/thumb relative">
                  <button
                    type="button"
                    onClick={() => setSelectedMediaId(item.id)}
                    aria-label={`Open ${name}`}
                    className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-ds-md bg-ds-surface ds-focus"
                  >
                    {item.mime.startsWith("image/") || item.poster?.url ? (
                      <img
                        src={item.mime.startsWith("image/") ? thumbnailUrl(item) : item.poster!.url}
                        alt={item.alt || ""}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center">
                        <Film aria-hidden className="size-8 text-ds-fg-subtle" />
                      </span>
                    )}

                    {/* Type, top left */}
                    <span className="absolute top-2 left-2">
                      {item.mime.startsWith("image/") ? (
                        <ImageIcon aria-hidden className="size-4 text-white drop-shadow-md" />
                      ) : (
                        <Film aria-hidden className="size-4 text-white drop-shadow-md" />
                      )}
                    </span>
                  </button>
                  <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover/thumb:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
                    <DsButton size="small" iconLeft={X} aria-label={`Delete ${name}`} onClick={() => handleDelete(item.id)} />
                  </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center">
                      <DsCheckbox
                        checked={selected}
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
                    <div className="flex shrink-0 items-center gap-1">
                      <DsDropdown>
                        <DsDropdownTrigger asChild>
                          <DsButton size="small" variant="text" iconLeft={MoreVertical} aria-label={`Options for ${name}`} />
                        </DsDropdownTrigger>
                        <DsDropdownContent>
                          <DsDropdownItem iconLeft={Pencil} onSelect={() => setSelectedMediaId(item.id)}>
                            Edit
                          </DsDropdownItem>
                          <DsDropdownItem
                            iconLeft={Plus}
                            onSelect={() => router.push(`/admin/posts/new?media=${item.id}`)}
                          >
                            Create post
                          </DsDropdownItem>
                          <DsDropdownItem iconLeft={Copy} onSelect={() => copyToClipboard(item.url)}>
                            Copy URL
                          </DsDropdownItem>
                          <DsDropdownItem
                            iconLeft={ExternalLink}
                            onSelect={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                          >
                            Open in new tab
                          </DsDropdownItem>
                          <DsDropdownItem iconLeft={RefreshCw} onSelect={() => handleReplaceFromMenu(item.id)}>
                            Replace file
                          </DsDropdownItem>
                          <DsDropdownSeparator />
                          <DsDropdownItem tone="danger" iconLeft={Trash2} onSelect={() => handleDelete(item.id)}>
                            Delete
                          </DsDropdownItem>
                        </DsDropdownContent>
                      </DsDropdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-5">
          <DsButton
            variant="text"
            iconLeft={ChevronLeft}
            onClick={() => {
              setCurrentPage((p) => Math.max(1, p - 1));
              setSelectedIds(new Set());
            }}
            disabled={currentPage === 1}
          >
            Previous
          </DsButton>
          <span className="text-small text-ds-fg-subtle">
            Page {currentPage} of {totalPages}
          </span>
          <DsButton
            variant="text"
            iconRight={ChevronRight}
            onClick={() => {
              setCurrentPage((p) => Math.min(totalPages, p + 1));
              setSelectedIds(new Set());
            }}
            disabled={currentPage === totalPages}
          >
            Next
          </DsButton>
        </div>
      )}
      </div>

      {/* Media Detail Modal - shared component */}
      <MediaDetailModal
        mediaId={selectedMediaId}
        onClose={() => setSelectedMediaId(null)}
        onDelete={handleDelete}
        onReplace={handleReplaceFromModal}
        showDelete={true}
        showReplace={true}
        onNavigate={handleNavigate}
        canNavigatePrev={canGoPrev}
        canNavigateNext={canGoNext}
      />

      {/* Hidden file inputs: single replace, and the two batch replace modes */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleReplaceFileChange}
        className="hidden"
      />
      <input
        ref={batchFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is not in the type definitions
        webkitdirectory=""
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchReplaceFolder(e.target.files);
            e.target.value = "";
          }
        }}
        className="hidden"
        accept="image/*,video/*"
      />
      <input
        ref={batchFileInputRef}
        type="file"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchReplaceSingle(e.target.files[0]);
            e.target.value = "";
          }
        }}
        className="hidden"
        accept="image/*,video/*"
      />

      {/* Replace Progress Dialog */}
      <DsDialog open={isReplacing} onOpenChange={() => {}} dismissible={false} title="Replacing file…" description={replaceFileName ?? undefined}>
        <div className="flex justify-center py-2">
          <Loader2 aria-hidden className="size-6 animate-spin text-ds-fg-subtle" />
        </div>
      </DsDialog>

      {/* Batch Replace Dialog */}
      <DsDialog
        open={showBatchReplaceDialog}
        onOpenChange={(open) => !batchReplacing && setShowBatchReplaceDialog(open)}
        title={`Replace ${batchReplaceProgress?.total ?? selectedIds.size} selected files`}
        description={batchReplaceProgress ? undefined : "Choose how you want to replace the selected media files."}
      >
        {batchReplaceProgress ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-ds-fg-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-p">
                  {batchReplaceProgress.current === "Done!"
                    ? `Replaced ${batchReplaceProgress.matched} of ${batchReplaceProgress.total} files`
                    : `Replacing: ${batchReplaceProgress.current}`}
                </p>
                <p className="text-small text-ds-fg-muted">
                  {batchReplaceProgress.matched} / {batchReplaceProgress.total} processed
                </p>
              </div>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-ds-surface">
              <div
                className="h-full bg-ds-fg transition-all duration-300"
                style={{ width: `${(batchReplaceProgress.matched / batchReplaceProgress.total) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <DsRadioGroup
              value={batchReplaceMode}
              onValueChange={(v) => setBatchReplaceMode(v as "single" | "folder")}
            >
              {([
                {
                  value: "folder",
                  icon: FolderOpen,
                  label: "Select folder (match by filename)",
                  hint: "Files from the folder are matched to the selected items by filename. Best for batch updates.",
                },
                {
                  value: "single",
                  icon: FileImage,
                  label: "Select single file (replace all)",
                  hint: `All ${selectedIds.size} selected items are replaced with the same image.`,
                },
              ] as const).map(({ value, icon: Icon, label, hint }) => (
                <label
                  key={value}
                  htmlFor={`batch-replace-${value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-ds-lg border border-ds-border p-3 transition-colors hover:bg-ds-surface-subtle"
                >
                  <DsRadio value={value} id={`batch-replace-${value}`} className="mt-[3px]" />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2 text-p">
                      <Icon aria-hidden className="size-4" />
                      {label}
                    </span>
                    <span className="text-small text-ds-fg-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </DsRadioGroup>

            <DsDialogActions>
              <DsButton
                variant="primary"
                iconLeft={batchReplaceMode === "folder" ? FolderOpen : FileImage}
                onClick={() =>
                  (batchReplaceMode === "folder" ? batchFolderInputRef : batchFileInputRef).current?.click()
                }
              >
                {batchReplaceMode === "folder" ? "Choose folder" : "Choose file"}
              </DsButton>
              <DsDialogCancel asChild>
                <DsButton>
                  Cancel
                </DsButton>
              </DsDialogCancel>
            </DsDialogActions>
          </>
        )}
      </DsDialog>

      {/* Filter dialog (below xl) */}
      <DsDialog open={showFilterModal} onOpenChange={setShowFilterModal} title="Filter and sort">
        <div className="flex flex-col gap-4">
          <DsField label="Type">
            <DsSelect
              options={typeOptions}
              value={typeFilter}
              onValueChange={pickType}
            />
          </DsField>
          <DsField label="Usage">
            <DsSelect
              options={usageOptions}
              value={usageFilter}
              onValueChange={(value) => setUsageFilter(value as UsageFilter)}
            />
          </DsField>
          <DsField label="Date">
            <DsSelect options={dateOptions} value={dateFilter} onValueChange={setDateFilter} />
          </DsField>
          <DsField label="Sort by">
            <DsSelect
              options={sortOptions}
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            />
          </DsField>
        </div>
        <DsDialogActions>
          <DsDialogCancel asChild>
            <DsButton variant="primary">Done</DsButton>
          </DsDialogCancel>
          {hasActiveFilters && (
            <DsButton variant="text" iconLeft={RotateCcw} onClick={resetFilters} className="h-9">
              Reset filters
            </DsButton>
          )}
        </DsDialogActions>
      </DsDialog>

      {/* Post Editor Sheet (Desktop) */}
      <DsSidePanel
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        label="New post"
        overlay={false}
        className="sm:max-w-[600px]"
      >
          <PostEditorForm
            onClose={handleSheetClose}
            onSaved={handleSheetSaved}
            isSheet
            preSelectedMediaIds={preSelectedMediaIds}
          />
      </DsSidePanel>

      {/* Bulk Edit Modal */}
      <MediaBulkEditModal
        open={showBulkEditModal}
        onOpenChange={setShowBulkEditModal}
        selectedMedia={media.filter((m) => selectedIds.has(m.id))}
        onSave={handleBulkEditSave}
      />

      {confirmDialog}
      {deleteMediaDialog}
    </div>
  );
}
