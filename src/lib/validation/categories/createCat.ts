import * as z from "zod";

export const createCatSchema = z.object({
  cat_name: z.string().min(1, "Category name is required"),
  cat_desc: z.string().min(1, "Category description is required"),
  cat_img: z
    .custom<File | string>((val) => {
      if (!val) return false;
      if (typeof val === "string") return val.trim().length > 0;
      if (typeof File !== "undefined" && val instanceof File) return true;
      return false;
    }, "Category image is required")
    .refine((val) => {
      if (typeof File !== "undefined" && val instanceof File) {
        return val.size <= 5 * 1024 * 1024; // 5MB max
      }
      return true;
    }, "Image size must be less than 5MB"),
});

export type CreateCatInput = z.infer<typeof createCatSchema>;
