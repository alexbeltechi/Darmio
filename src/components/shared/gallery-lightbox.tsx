"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DsButton } from "@beltechi/parabola";
import type { MediaItem } from "@/lib/cms/types";
import { MediaImage } from "./media-image";
import { largestImageUrl } from "@/lib/cms/media-url";

const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;

interface GalleryLightboxProps {
  mediaItems: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Universal Lightbox Component
 * 
 * Full-screen image viewer with:
 * - each image fitted whole to the screen, with a margin all round
 * - carousel-style horizontal sliding, by swipe, drag, arrows or keys
 * - zoom: a click zooms in where you click and the image then follows the
 *   mouse, like a shop's product zoom; another click zooms out. Trackpad
 *   pinch (or ctrl + scroll) zooms around the pointer and two fingers pan;
 *   on touch, pinch to zoom, drag to pan, double-tap to toggle. Swiping to
 *   the next image only happens at normal size, so panning a zoomed image
 *   never changes it.
 */
export function GalleryLightbox({ isOpen, ...props }: GalleryLightboxProps) {
  // Mounted fresh on every open, so it starts at the clicked image.
  return isOpen ? <LightboxView {...props} /> : null;
}

function LightboxView({ mediaItems, initialIndex, onClose }: Omit<GalleryLightboxProps, "isOpen">) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [skipTransition, setSkipTransition] = useState(true);
  const dragStartX = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);
  const lastTap = useRef(0);
  // Where a mouse press started, to tell a click (zoom) from a drag (swipe).
  const mouseDown = useRef<{ x: number; y: number } | null>(null);
  // Zoomed by a click: the image follows the mouse until the next click.
  const [following, setFollowing] = useState(false);
  // Phones send mouse events after a tap; those aren't mouse clicks.
  const lastTouchAt = useRef(0);
  const fromTouch = () => Date.now() - lastTouchAt.current < 800;
  const zoomed = zoom > 1.01;
  // The zoom as of the latest gesture, for listeners that outlive a render.
  const zoomRef = useRef(1);

  const minSwipeDistance = 50;

  // Open on the clicked image without sliding to it; animate from then on.
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSkipTransition(false));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };
  
  const isImageLoaded = (index: number) => loadedImages.has(index);

  // Zoom resets with each image.
  useEffect(() => {
    zoomRef.current = 1;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFollowing(false);
  }, [currentIndex]);

  /** Keep a zoomed image from being panned off the screen. */
  const clampPan = useCallback((x: number, y: number, z: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || z <= 1) return { x: 0, y: 0 };
    const maxX = (rect.width * (z - 1)) / 2;
    const maxY = (rect.height * (z - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  /** Zoom to `next`, keeping the point under (clientX, clientY) where it is. */
  const zoomTo = useCallback(
    (next: number, clientX?: number, clientY?: number) => {
      const z = Math.max(1, Math.min(MAX_ZOOM, next));
      const ratio = z / zoomRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      zoomRef.current = z;
      setZoom(z);
      setPan((prev) => {
        if (!rect || clientX === undefined || clientY === undefined) return clampPan(prev.x, prev.y, z);
        const px = clientX - (rect.left + rect.width / 2);
        const py = clientY - (rect.top + rect.height / 2);
        return clampPan(px - (px - prev.x) * ratio, py - (py - prev.y) * ratio, z);
      });
    },
    [clampPan]
  );

  // Trackpad pinch arrives as ctrl + wheel (Chrome, Firefox) or gesture
  // events (Safari); plain two-finger scroll pans a zoomed image. Listened to
  // directly, as React's wheel handler can't prevent the page zooming.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setFollowing(false);
        zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
      } else if (zoomRef.current > 1.01) {
        e.preventDefault();
        setPan((prev) => clampPan(prev.x - e.deltaX, prev.y - e.deltaY, zoomRef.current));
      }
    };
    let gestureStartZoom = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      setFollowing(false);
      gestureStartZoom = zoomRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Event & { scale: number; clientX: number; clientY: number };
      zoomTo(gestureStartZoom * g.scale, g.clientX, g.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [clampPan, zoomTo]);

  const toggleZoom = (clientX: number, clientY: number) =>
    zoomTo(zoomed ? 1 : DOUBLE_TAP_ZOOM, clientX, clientY);

  /**
   * Zoomed by a click, the image follows the mouse: the pointer's place on
   * the screen picks the same place on the image, so the right edge of the
   * screen shows its right edge.
   */
  const follow = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      const rect = stage?.getBoundingClientRect();
      if (!stage || !rect) return;
      const z = zoomRef.current;
      // The open image's size at normal zoom, so panning stops at its edges, not the screen's.
      const slide = stage.querySelectorAll<HTMLElement>(":scope > div > div")[currentIndex];
      const media = slide?.querySelector("img, video")?.getBoundingClientRect();
      const scale = slide ? new DOMMatrixReadOnly(getComputedStyle(slide).transform).a || 1 : 1;
      const w = media ? media.width / scale : rect.width;
      const h = media ? media.height / scale : rect.height;
      const maxX = Math.max(0, (w * z - rect.width) / 2);
      const maxY = Math.max(0, (h * z - rect.height) / 2);
      // -1 at the left or top of the screen, 1 at the right or bottom.
      const fx = Math.max(-1, Math.min(1, (clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
      const fy = Math.max(-1, Math.min(1, (clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
      setPan({ x: -fx * maxX, y: -fy * maxY });
    },
    [currentIndex]
  );

  /** A mouse click: zoom in where it lands and follow the mouse, or zoom back out. */
  const onClickZoom = (clientX: number, clientY: number) => {
    if (zoomRef.current > 1.01) {
      setFollowing(false);
      zoomTo(1);
      return;
    }
    zoomRef.current = DOUBLE_TAP_ZOOM;
    setZoom(DOUBLE_TAP_ZOOM);
    setFollowing(true);
    follow(clientX, clientY);
  };

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < mediaItems.length - 1;

  const goToPrevious = useCallback(() => {
    if (!canGoPrevious) return;
    setCurrentIndex((prev) => prev - 1);
  }, [canGoPrevious]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    setCurrentIndex((prev) => prev + 1);
  }, [canGoNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  // No page scroll behind it while it's open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchStart.current = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), zoom: zoomRef.current };
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    const point = "touches" in e ? e.touches[0] : e;
    if ("touches" in e) lastTouchAt.current = Date.now();
    else if (fromTouch()) return;
    if ("touches" in e) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        toggleZoom(point.clientX, point.clientY);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    } else {
      mouseDown.current = { x: point.clientX, y: point.clientY };
      // A click-zoomed image follows the mouse; nothing to drag.
      if (following) return;
    }
    if (zoomRef.current > 1.01) {
      panStart.current = { x: point.clientX, y: point.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
      return;
    }
    if (mediaItems.length <= 1) return;
    dragStartX.current = point.clientX;
    setIsDragging(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toggleZoom reads current state each render
  }, [mediaItems.length, pan.x, pan.y, zoomed, following]);

  const onDragMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("touches" in e && e.touches.length === 2 && pinchStart.current) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        zoomTo(pinchStart.current.zoom * (distance / pinchStart.current.distance), (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
        return;
      }
      if (following && !("touches" in e)) {
        follow(e.clientX, e.clientY);
        return;
      }
      if (panStart.current) {
        const point = "touches" in e ? e.touches[0] : e;
        const start = panStart.current;
        setPan(clampPan(start.panX + point.clientX - start.x, start.panY + point.clientY - start.y, zoomRef.current));
        return;
      }
      if (!isDragging || dragStartX.current === null) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      let offset = clientX - dragStartX.current;

      // Add resistance at edges
      if (
        (currentIndex === 0 && offset > 0) ||
        (currentIndex === mediaItems.length - 1 && offset < 0)
      ) {
        offset = offset * 0.3;
      }

      setDragOffset(offset);
    },
    [isDragging, currentIndex, mediaItems.length, clampPan, zoomTo, following, follow]
  );

  const onDragEnd = useCallback(() => {
    pinchStart.current = null;
    if (panStart.current) {
      panStart.current = null;
      setIsPanning(false);
      return;
    }
    if (!isDragging) return;

    if (Math.abs(dragOffset) > minSwipeDistance) {
      if (dragOffset > 0 && canGoPrevious) {
        goToPrevious();
      } else if (dragOffset < 0 && canGoNext) {
        goToNext();
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    dragStartX.current = null;
  }, [isDragging, dragOffset, canGoPrevious, canGoNext, goToPrevious, goToNext]);

  const hasMultiple = mediaItems.length > 1;

  // The strip holds every image side by side; percentages are of the strip,
  // so one image is 100 / count of it, and the drag adds its pixels on top.
  const slideTransform = `translateX(calc(${(-currentIndex * 100) / mediaItems.length}% + ${dragOffset}px))`;

  return (
    <div 
      data-lightbox
      className="fixed inset-0 z-[100] bg-ds-bg"
      style={{ width: "100vw", height: "100vh" }}
    >
      {/* Close button - top right */}
      <div className="absolute top-5 right-5 z-[110]">
        <DsButton onClick={onClose} iconLeft={X} aria-label="Close" />
      </div>

      {/* Status indicator - bottom center */}
      {hasMultiple && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[110]">
          <div 
            className="bg-ds-surface text-ds-fg px-2 py-1 rounded-lg text-[17px] font-normal tracking-[0.12px] leading-none"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {currentIndex + 1}/{mediaItems.length}
          </div>
        </div>
      )}

      {/* Image container - full screen, carousel-style */}
      <div
        ref={stageRef}
        className="absolute inset-0 touch-none select-none overflow-hidden"
        style={{
          cursor: zoomed
            ? following
              ? "zoom-out"
              : isPanning
                ? "grabbing"
                : "grab"
            : isDragging
              ? "grabbing"
              : "zoom-in",
        }}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={(e) => {
          // A press that didn't travel is a click: on the image it zooms in,
          // anywhere while zoomed it zooms out. One that travelled was a swipe.
          const start = mouseDown.current;
          mouseDown.current = null;
          onDragEnd();
          if (!start || fromTouch() || Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 5) return;
          if (zoomRef.current > 1.01 || (e.target as HTMLElement).closest("img")) onClickZoom(e.clientX, e.clientY);
        }}
        onMouseLeave={() => {
          mouseDown.current = null;
          onDragEnd();
        }}
        onTouchStart={onDragStart}
        onTouchMove={onDragMove}
        onTouchEnd={onDragEnd}
      >
        {/* Horizontal strip of all images */}
        <div
          className="flex h-full"
          style={{
            transform: slideTransform,
            transition: isDragging || skipTransition ? "none" : "transform 300ms ease-out",
            width: `${mediaItems.length * 100}%`,
          }}
        >
          {mediaItems.map((item, index) => (
            <div
              key={item.id}
              // The margin round each image; MediaImage's <picture> steps out of layout so the image fits this box.
              className="relative flex h-full items-center justify-center px-5 py-16 lg:px-20 [&_picture]:contents"
              style={{
                width: `${100 / mediaItems.length}%`,
                ...(index === currentIndex && {
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isPanning || pinchStart.current ? "none" : "transform 150ms ease-out",
                }),
              }}
            >
              {item.mime.startsWith("video/") ? (
                <video
                  src={item.url}
                  poster={item.poster?.url}
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <>
                  {/* Until the image arrives: the admin's loading spinner, centred, in subtle grey. */}
                  {!isImageLoaded(index) && (
                    <Loader2
                      aria-label="Loading image"
                      className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-ds-fg-subtle"
                    />
                  )}
                  <MediaImage
                    key={item.id}
                    item={item}
                    legacySrc={largestImageUrl(item)}
                    alt={item.alt || item.originalName}
                    className={`max-w-full max-h-full w-auto h-auto object-contain transition-opacity duration-300 ${
                      isImageLoaded(index) ? 'opacity-100' : 'opacity-0'
                    }`}
                    sizes="100vw"
                    priority={Math.abs(index - currentIndex) <= 1}
                    onLoad={() => handleImageLoad(index)}
                    draggable={false}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons (desktop only) */}
      {hasMultiple && (
        <>
          <DsButton
            onClick={goToPrevious}
            aria-disabled={!canGoPrevious}
            iconLeft={ChevronLeft}
            className="absolute left-5 top-1/2 -translate-y-1/2 hidden lg:flex z-[110] aria-disabled:text-ds-fg-subtle"
            aria-label="Previous"
          />
          <DsButton
            onClick={goToNext}
            aria-disabled={!canGoNext}
            iconLeft={ChevronRight}
            className="absolute right-5 top-1/2 -translate-y-1/2 hidden lg:flex z-[110] aria-disabled:text-ds-fg-subtle"
            aria-label="Next"
          />
        </>
      )}
    </div>
  );
}
