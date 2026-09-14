"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2, Star } from "lucide-react";
import { uploadStorageImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  url: string;
  is_primary: boolean;
}

interface MultiImageUploaderProps {
  value: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  onError: (message: string) => void;
  bucket?: string;
  folder?: string;
  disabled?: boolean;
}

export function MultiImageUploader({
  value = [],
  onChange,
  onError,
  bucket = "uploads",
  folder = "images",
  disabled = false,
}: MultiImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function processFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      onError("Please select valid image files");
      return;
    }

    setUploading(true);
    const newUploadedImages: UploadedImage[] = [];

    try {
      for (const file of validFiles) {
        const result = await uploadStorageImage(file, bucket, folder);
        if (result.error) {
          onError(result.error);
        } else if (result.publicUrl) {
          newUploadedImages.push({
            url: result.publicUrl,
            is_primary: false,
          });
        }
      }

      if (newUploadedImages.length > 0) {
        const updatedList = [...value, ...newUploadedImages];
        // If no image is marked as primary, make the first one primary
        const hasPrimary = updatedList.some((img) => img.is_primary);
        if (!hasPrimary && updatedList.length > 0) {
          updatedList[0].is_primary = true;
        }
        onChange(updatedList);
      }
    } catch {
      onError("Failed to upload image(s)");
    } finally {
      setUploading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
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

    if (disabled || uploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLLabelElement>) {
    if ((e.key === "Enter" || e.key === " ") && !disabled && !uploading) {
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
        tabIndex={disabled || uploading ? -1 : 0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          disabled || uploading
            ? "cursor-not-allowed opacity-60 pointer-events-none"
            : "cursor-pointer",
          isDragging
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-input bg-background/50 hover:border-muted-foreground/50"
        )}
      >
        <div className="flex flex-col items-center justify-center pt-4 pb-4">
          {uploading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>Uploading images to Supabase...</span>
            </div>
          ) : (
            <>
              <Upload
                className={cn(
                  "w-7 h-7 mb-2 transition-transform duration-200",
                  isDragging ? "scale-110 text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Click to upload product images
                </span>{" "}
                or drag and drop multiple files
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                PNG, JPG, WebP, GIF, or SVG
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || uploading}
          onChange={handleImageUpload}
          className="hidden"
        />
      </label>

      {/* Gallery Grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, idx) => (
            <div
              key={`${img.url}-${idx}`}
              className={cn(
                "relative group w-full h-28 rounded-lg overflow-hidden border shadow-sm transition-all duration-150",
                img.is_primary ? "ring-2 ring-primary border-primary" : "border-input"
              )}
            >
              <Image
                src={img.url}
                alt={`Product image ${idx + 1}`}
                fill
                className="object-cover"
              />

              {/* Primary Badge / Action */}
              <button
                type="button"
                onClick={() => setPrimaryImage(idx)}
                disabled={disabled}
                title={img.is_primary ? "Primary Image" : "Set as Primary"}
                className={cn(
                  "absolute top-2 left-2 p-1.5 rounded-full transition-colors cursor-pointer",
                  img.is_primary
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-black/60 text-white/80 hover:bg-black/90 hover:text-white"
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
          ))}
        </div>
      )}
    </div>
  );
}
