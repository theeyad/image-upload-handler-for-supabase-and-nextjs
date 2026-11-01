"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageUploaderProps {
  value?: File | string | null;
  onChange: (file: File | string | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  maxSizeInMB?: number;
}
export function ImageUploader({
  value,
  onChange,
  onError,
  disabled = false,
  maxSizeInMB = 5,
}: ImageUploaderProps) {

  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Compute preview URL: prioritize localPreview for File, or string value for remote URL
  const previewUrl =
    !value
      ? ""
      : value instanceof File
        ? localPreview
        : typeof value === "string"
          ? value
          : "";

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      onError?.("Please select a valid image file");
      return;
    }

    if (file.size > maxSizeInMB * 1024 * 1024) {
      onError?.(`Image size must be less than ${maxSizeInMB}MB`);
      return;
    }

    // Revoke previous object URL if one exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    // Create 0ms instant preview locally without network requests
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLocalPreview(url);

    // Stage raw File locally in form state
    onChange(file);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
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

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLLabelElement>) {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  function handleRemoveImage() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLocalPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onChange(null);
  }

  return (
    <div>
      {previewUrl ? (
        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-input shadow-sm">
          <Image
            src={previewUrl}
            alt="Image preview"
            fill
            className="object-cover"
            unoptimized={
              previewUrl.startsWith("blob:") || previewUrl.startsWith("data:")
            }
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled}
            aria-label="Remove image"
            className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label
          tabIndex={disabled ? -1 : 0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg transition-all duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            disabled
              ? "cursor-not-allowed opacity-60 pointer-events-none"
              : "cursor-pointer",
            isDragging
              ? "border-primary bg-primary/10 scale-[0.99]"
              : "border-input bg-background/50 hover:border-muted-foreground/50",
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload
              className={cn(
                "w-7 h-7 mb-2 transition-transform duration-200",
                isDragging ? "scale-110 text-primary" : "text-muted-foreground",
              )}
            />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              PNG, JPG, WebP, GIF, or SVG (max {maxSizeInMB}MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
