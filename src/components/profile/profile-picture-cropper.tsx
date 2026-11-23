"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

interface ProfilePictureCropperProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdated: (newAvatarUrl: string | null) => void;
}

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 400;

export default function ProfilePictureCropper({
  currentAvatarUrl,
  onAvatarUpdated,
}: ProfilePictureCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);

  // Crop / Transform state
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(3);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dialog & Async states
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Clamp offset so the image always covers the VIEWPORT_SIZE box
  const clampOffset = useCallback(
    (x: number, y: number, currentScale: number, natWidth: number, natHeight: number) => {
      const renderedWidth = natWidth * currentScale;
      const renderedHeight = natHeight * currentScale;

      const maxOffsetX = (renderedWidth - VIEWPORT_SIZE) / 2;
      const minOffsetX = -maxOffsetX;

      const maxOffsetY = (renderedHeight - VIEWPORT_SIZE) / 2;
      const minOffsetY = -maxOffsetY;

      return {
        x: Math.min(Math.max(x, minOffsetX), maxOffsetX),
        y: Math.min(Math.max(y, minOffsetY), maxOffsetY),
      };
    },
    []
  );

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image file exceeds 5MB limit. Please choose a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate mime
    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      setErrorMessage("Only JPEG, PNG, and WebP images are allowed. SVG and other formats are rejected.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const url = URL.createObjectURL(file);
    setImageSrc(url);

    const img = new Image();
    img.onload = () => {
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      setNaturalDimensions({ width: natW, height: natH });

      // Calculate minScale to ensure crop box is fully covered
      const baseMinScale = Math.max(VIEWPORT_SIZE / natW, VIEWPORT_SIZE / natH);
      setMinScale(baseMinScale);
      setMaxScale(baseMinScale * 3);
      setScale(baseMinScale);
      setOffset({ x: 0, y: 0 });
      setIsOpen(true);
    };
    img.onerror = () => {
      setErrorMessage("Could not load image. Please select a valid image file.");
      URL.revokeObjectURL(url);
    };
    img.src = url;

    // Reset file input value to allow re-selecting the same file if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Close modal and cleanup
  const handleClose = () => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
    }
    setNaturalDimensions(null);
    setIsOpen(false);
    setErrorMessage(null);
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !naturalDimensions) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    const rawX = offsetStartRef.current.x + deltaX;
    const rawY = offsetStartRef.current.y + deltaY;

    const clamped = clampOffset(
      rawX,
      rawY,
      scale,
      naturalDimensions.width,
      naturalDimensions.height
    );
    setOffset(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Zoom handler
  const handleScaleChange = (newScale: number) => {
    if (!naturalDimensions) return;
    const clampedScale = Math.min(Math.max(newScale, minScale), maxScale);
    setScale(clampedScale);
    setOffset((prev) =>
      clampOffset(prev.x, prev.y, clampedScale, naturalDimensions.width, naturalDimensions.height)
    );
  };

  // Update live preview canvas
  useEffect(() => {
    if (!isOpen || !imageSrc || !naturalDimensions || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Save canvas state
      ctx.save();

      // Circular clip preview
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const renderedW = naturalDimensions.width * scale;
      const renderedH = naturalDimensions.height * scale;

      // Scale factor from VIEWPORT_SIZE to preview canvas size
      const previewFactor = canvas.width / VIEWPORT_SIZE;

      const drawX = (canvas.width - renderedW * previewFactor) / 2 + offset.x * previewFactor;
      const drawY = (canvas.height - renderedH * previewFactor) / 2 + offset.y * previewFactor;

      ctx.drawImage(img, drawX, drawY, renderedW * previewFactor, renderedH * previewFactor);
      ctx.restore();
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, naturalDimensions, scale, offset]);

  // Crop & Upload
  const handleConfirmCrop = async () => {
    if (!imageSrc || !naturalDimensions) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Create high-res offscreen canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = OUTPUT_SIZE;
      offscreen.height = OUTPUT_SIZE;
      const ctx = offscreen.getContext("2d");
      if (!ctx) throw new Error("Could not initialize 2D context");

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for crop"));
        img.src = imageSrc;
      });

      const renderedW = naturalDimensions.width * scale;
      const renderedH = naturalDimensions.height * scale;

      const factor = OUTPUT_SIZE / VIEWPORT_SIZE;
      const drawX = (OUTPUT_SIZE - renderedW * factor) / 2 + offset.x * factor;
      const drawY = (OUTPUT_SIZE - renderedH * factor) / 2 + offset.y * factor;

      // Draw high resolution image to offscreen canvas
      ctx.drawImage(img, drawX, drawY, renderedW * factor, renderedH * factor);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        offscreen.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      if (!blob) throw new Error("Failed to produce cropped image blob");

      // Send to POST /api/me/profile/avatar
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");

      const res = await fetch("/api/me/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload avatar");
      }

      // Notify parent with cache-busting timestamp
      const newUrl = `/api/me/profile/avatar?t=${Date.now()}`;
      onAvatarUpdated(newUrl);
      handleClose();
    } catch (err) {
      console.error("Crop upload error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove avatar action
  const handleDeleteAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/me/profile/avatar", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to remove avatar");
      }
      onAvatarUpdated(null);
    } catch (err) {
      console.error("Avatar delete error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove avatar.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shadow-inner">
            {currentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentAvatarUrl}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-12 h-12 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            )}
          </div>
        </div>

        {/* Action Buttons & Guidance */}
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="avatar-file-input"
            />
            <label
              htmlFor="avatar-file-input"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 cursor-pointer shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Picture
            </label>

            {currentAvatarUrl && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 transition disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Remove"}
              </button>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
            Supports JPEG, PNG, or WebP. Max size: 5MB. Interactive 1:1 square crop editor opens upon file selection.
          </p>

          {errorMessage && !isOpen && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* Interactive Crop Modal */}
      {isOpen && imageSrc && naturalDimensions && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cropper-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h3 id="cropper-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Crop & Position Profile Picture
              </h3>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                aria-label="Close"
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Error Banner inside modal */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Viewport Cropper Area */}
            <div className="flex flex-col items-center">
              <div
                style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                className="relative rounded-2xl overflow-hidden bg-zinc-950 touch-none select-none cursor-grab active:cursor-grabbing border border-zinc-700 shadow-inner flex items-center justify-center"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* Active Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc}
                  alt="Crop Target"
                  draggable={false}
                  style={{
                    width: naturalDimensions.width * scale,
                    height: naturalDimensions.height * scale,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                  className="pointer-events-none transition-none"
                />

                {/* Circular Mask & Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
                    className="rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                  />
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                Click and drag to reposition image inside circular boundary
              </p>
            </div>

            {/* Zoom Controls & Preview */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Zoom</span>
                <button
                  type="button"
                  onClick={() => handleScaleChange(scale - 0.15)}
                  disabled={scale <= minScale}
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="range"
                  min={minScale}
                  max={maxScale}
                  step={0.01}
                  value={scale}
                  onChange={(e) => handleScaleChange(Number.parseFloat(e.target.value))}
                  aria-label="Image zoom slider"
                  className="flex-1 accent-blue-600 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleScaleChange(scale + 0.15)}
                  disabled={scale >= maxScale}
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
                >
                  +
                </button>

                {/* Live Square Preview Thumbnail */}
                <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-700">
                  <canvas
                    ref={previewCanvasRef}
                    width={48}
                    height={48}
                    className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-600 shadow-xs bg-zinc-100 dark:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  "Crop & Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
