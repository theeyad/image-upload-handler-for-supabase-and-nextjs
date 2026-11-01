"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Star } from "lucide-react";
import { cn, generateUniqueId } from "@/lib/utils";

export interface StagedImage {
  id: string;
  file?: File;
  previewUrl: string;
  url?: string;
  is_primary: boolean;
}

export interface MultiImageUploaderProps {
  value?: StagedImage[];
  onChange: (images: StagedImage[]) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeInMB?: number;
}
export function MultiImageUploader({
  value = [],
  onChange,
  onError,
  disabled = false,
  maxFiles,
  maxSizeInMB = 5,
}: MultiImageUploaderProps) {

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  // Clean up any remaining object URLs created by this component on unmount
  useEffect(() => {
    const urlsToClean = createdUrlsRef.current;
    return () => {
      urlsToClean.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urlsToClean.clear();
    };
  }, []);

  function processFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) {
        onError?.(`"${file.name}" is not a valid image file`);
        continue;
      }

      if (file.size > maxSizeInMB * 1024 * 1024) {
        onError?.(`"${file.name}" exceeds the ${maxSizeInMB}MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (maxFiles && value.length + validFiles.length > maxFiles) {
      onError?.(`You can only upload a maximum of ${maxFiles} images`);
      return;
    }

    // Create 0ms local preview URLs without any network calls
    const newItems: StagedImage[] = validFiles.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(objectUrl);

      return {
        id: generateUniqueId("img"),
        file,
        previewUrl: objectUrl,
        is_primary: false,
      };
    });

    const updatedList = [...value, ...newItems];

    // If no image is marked as primary, make the first one primary
    const hasPrimary = updatedList.some((img) => img.is_primary);
    if (!hasPrimary && updatedList.length > 0) {
      updatedList[0].is_primary = true;
    }

    onChange(updatedList);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so the same file can be re-selected if removed
      e.target.value = "";
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLLabelElement>) {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function setPrimaryImage(indexToMakePrimary: number) {
    const updated = value.map((img, idx) => ({
      ...img,
      is_primary: idx === indexToMakePrimary,
    }));
    onChange(updated);
  }

  function removeImage(indexToRemove: number) {
    const itemToRemove = value[indexToRemove];
    if (itemToRemove) {
      const url = itemToRemove.previewUrl || itemToRemove.url;
      if (url && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
        createdUrlsRef.current.delete(url);
      }
    }

    const updated = value.filter((_, idx) => idx !== indexToRemove);

    // If we removed the primary image and there are remaining images, set the first as primary
    if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
      updated[0].is_primary = true;
    }

    onChange(updated);
  }

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <label
        tabIndex={disabled ? -1 : 0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          disabled
            ? "cursor-not-allowed opacity-60 pointer-events-none"
            : "cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-input bg-background/50 hover:border-muted-foreground/50",
        )}
      >
        <div className="flex flex-col items-center justify-center pt-4 pb-4">
          <Upload
            className={cn(
              "w-7 h-7 mb-2 transition-transform duration-200",
              isDragging ? "scale-110 text-primary" : "text-muted-foreground",
            )}
          />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              Click to upload images
            </span>{" "}
            or drag and drop multiple files
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            PNG, JPG, WebP, GIF, or SVG (max {maxSizeInMB}MB)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      {/* Gallery Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, idx) => {
            const displayUrl = img.previewUrl || img.url || "";
            return (
              <div
                key={img.id || `${displayUrl}-${idx}`}
                className={cn(
                  "relative group w-full h-28 rounded-lg overflow-hidden border shadow-sm transition-all duration-150",
                  img.is_primary
                    ? "ring-2 ring-primary border-primary"
                    : "border-input",
                )}
              >
                <Image
                  src={displayUrl}
                  alt={`Image ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized={
                    displayUrl.startsWith("blob:") ||
                    displayUrl.startsWith("data:")
                  }
                />

                {/* Primary Badge / Action */}
                <button
                  type="button"
                  onClick={() => setPrimaryImage(idx)}
                  disabled={disabled}
                  title={img.is_primary ? "Primary Image" : "Set as Primary"}
                  aria-label={
                    img.is_primary ? "Primary Image" : "Set as Primary"
                  }
                  className={cn(
                    "absolute top-2 left-2 p-1.5 rounded-full transition-colors cursor-pointer",
                    img.is_primary
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-black/60 text-white/80 hover:bg-black/90 hover:text-white",
                  )}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  disabled={disabled}
                  title="Remove image"
                  aria-label="Remove image"
                  className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Primary Tag indicator at bottom */}
                {img.is_primary && (
                  <span className="absolute bottom-1 left-1.5 bg-primary/90 text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                    Primary
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
