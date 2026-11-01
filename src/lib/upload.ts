// Client-side Supabase storage upload helper functions
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

/**
 * Uploads a single file to Supabase Storage and returns its public URL.
 * Intended to be called on client-side upon form submission.
 */
export async function uploadStorageImage(
  file: File,
  bucket: string, // bucket name
  folder?: string, // folder name
): Promise<UploadResult> {
  const supabase = createClient();

  // Split file name to get extension
  const fileExt = file.name.split(".").pop();

  // Generate unique filename to avoid storage path collisions
  const fileName = `${generateUniqueId(Date.now().toString())}.${fileExt}`;

  // Create file path with folder name and unique filename
  const filePath = folder ? `${folder}/${fileName}` : `${fileName}`;

  // Upload file to Supabase storage bucket
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) return { error: error.message };

  // Retrieve public URL of the uploaded file
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { publicUrl };
}

/**
 * Uploads an array of staged gallery images to Supabase Storage.
 * Only newly staged items (where item.file exists) are uploaded.
 * Existing remote images are preserved as-is.
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
