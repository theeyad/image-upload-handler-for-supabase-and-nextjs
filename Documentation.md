# Full Documentation

Now after you created your supabase bucket and enabled rls policies on it, you can use this component by simply installing these dependencies:

##### Install dependencies

```text
npm install lucide-react tailwind-merge clsx
```

and creating these 3 files:

#### `lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function to merge class names with Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to generate a unique ID
export function generateUniqueId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}
```

---

#### `lib/upload.ts`

```typescript
// your supabase client
import { createClient } from "@/lib/supabase/client";
import { generateUniqueId } from "@/lib/utils";

export interface UploadResult {
  publicUrl?: string;
  error?: string;
}

export interface StagedImage {
  id?: string;
  file?: File;
  previewUrl: string;
  url?: string;
  is_primary: boolean;
}

export interface UploadedImage {
  url: string;
  is_primary: boolean;
}

export async function uploadStorageImage(
  file: File,
  bucket: string, // bucket name
  folder?: string, // folder name inside that bucket (if there)
): Promise<UploadResult> {
  /**
   * Uploads a single file to Supabase Storage and returns its public URL.
   * Intended to be called on client-side upon form submission.
   */

  // Use your supabase client not server so that the upload
  // is done on the client side.
  const supabase = createClient();

  // Split file name to get extension.
  const fileExt = file.name.split(".").pop();

  // Generate unique filename to avoid storage path collisions
  const fileName = `${generateUniqueId(Date.now().toString())}.${fileExt}`;

  // Create file path with folder name and unique filename
  const filePath = folder ? `${folder}/${fileName}` : `${fileName}`;

  // Store the file in the bucket ('uploads') and folder ('images') so
  // that everything is organized in folders and all are in the same bucket.
  // 
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) return { error: error.message };

  // Get public URL of the uploaded file so we can add it to our supabase table.
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl };
}

/**
 * Uploads an array of staged gallery images to Supabase Storage.
 * Only newly staged items (where item.file exists) are uploaded.
 * Existing remote images are preserved as-is.
 * This is for the MultiImageUploader component.
 */
export async function uploadStagedImages(
  images: StagedImage[],
  bucket: string,
  folder?: string,
): Promise<{ uploaded: UploadedImage[]; error?: string }> {
  const uploaded: UploadedImage[] = [];

  for (const item of images) {
    if (item.file) {
      const result = folder ? await uploadStorageImage(item.file, bucket, folder) : await uploadStorageImage(item.file, bucket);
      if (result.error) {
        return { uploaded, error: result.error };
      }
      uploaded.push({
        url: result.publicUrl!,
        is_primary: item.is_primary,
      });
    } else {
      // Existing remote URL, preserve as-is
      const existingUrl = item.url || item.previewUrl;
      uploaded.push({
        url: existingUrl,
        is_primary: item.is_primary,
      });
    }
  }

  return { uploaded };
}
```

---

#### `components/shared/ImageUploader.tsx`

```typescript
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
```

---

in your formSubmitHandler function use the uploadStorageImage function like this:

```typescript
  async function formSubmitHandler(values: CreateCatInput) {
    let finalImageUrl =
      typeof values.cat_img === "string" ? values.cat_img : "";

    // Deferred Upload: Only upload the staged File to Supabase upon successful form submission
    if (values.cat_img instanceof File) {

      // Bucket name and folder name
      const uploadResult = await uploadStorageImage(values.cat_img, "uploads", "images");

      if (uploadResult.error) {
        setError("cat_img", {
          message: uploadResult.error,
        });
        return;
      }

      finalImageUrl = uploadResult.publicUrl || "";
    }

    // Submit validated data with Supabase public URL to Server Action
    const result = await createCategory({
      ...values,
      cat_img: finalImageUrl,
    });

    if (result?.error) {
      setError("root", {
        message: result.error,
      });
    }

    if (result?.success) {
      toast.add({
        title: "Category created",
        type: "success",
      });

      reset();
    }
  }
```

---

now you can use the component and connect it to react hook form like in this example:

```typescript
    <ImageUploader
    value={watch("cat_img")}
    onChange={(file) => setValue("cat_img", file ?? "", { shouldValidate: true })}
    onError={(message) => setError("cat_img", { message })}
    disabled={isSubmitting}
    />
```

let's breakdown each prop:

- `value`
Accepts a staged File (new upload), remote URL string (existing image), or null/"" (empty). this is for displaying the image without uploading to supabase, we only upload on form submition.

- `onChange`
Callback function triggered when an image is uploaded or removed.
When a file is picked / removed: Returns the staged File when selected, or null when removed. No upload happens until form submit.

- `onError`
Callback triggered when an error occurs during selection or upload (e.g., non-image file selected or file exceeds max size limit). `setError("cat_img", { message })` sets a field-level error in React Hook Form so UI error message displays below the field.

- `disabled` (Optional — defaults to false)
Accepts a boolean (like RHF's isSubmitting). When true, it disables file picking, drag-and-drop, and the remove button so users cannot upload or delete images while the form is submitting.


> **NOTE**: `ImageUploader` is a standard controlled React component. While I prefered to use React Hook Form (`watch`, `setValue`, `setError`, `isSubmitting`) in my examples, `ImageUploader` works equally well with standard React useState (`const [url, setUrl] = useState('')`).

---

What should you simply do?

just write your custom the bucket name and folder name (if any) as an arguments to the uploadStorageImage function (you will use it) in your form that you want to use ImageUploader component in 

---

For detailed example of usage with real form see `NewCategoryForm.tsx` in the root of this repo, and `admin.ts` in `src/actions` folder.

---

> **NOTE**: Brand new `MultiImageUploader` is available!

```typescript
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
```

you can use it like this:

```typescript
  <MultiImageUploader
    value={images}
    onChange={setImages}
    onError={(msg) => alert(msg)}
    disabled={isSubmitting}
    maxFiles={5}
    maxSizeInMB={5}
  />
```

and it will upload to supabase with `uploadStagedImages`

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setIsSubmitting(true);

  // Only newly staged files are uploaded; existing URLs are kept as-is
  const { uploaded, error } = await uploadStagedImages(images, "uploads", "products");
  if (error) return;

  // uploaded = Array<{ url: string; is_primary: boolean }>
  await saveProduct({ images: uploaded });
}
```


---