// remember that RHF needs a "use client"
// toast and field are from shadcn/ui

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { createCategory } from "@/actions/admin";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCatSchema,
  type CreateCatInput,
} from "@/lib/validation/categories/createCat";
import { ImageUploader } from "@/components/shared/ImageUploader";
import { uploadStorageImage } from "@/lib/upload";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { toast } from "@/components/ui/toast";

export default function NewCategoryForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<CreateCatInput>({
    resolver: zodResolver(createCatSchema),
    defaultValues: {
      cat_name: "",
      cat_desc: "",
      cat_img: "",
    },
  });

  // Explicitly register cat_img field with React Hook Form
  useEffect(() => {
    register("cat_img");
  }, [register]);

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

  return (
    <div className="bg-sidebar mx-4 my-8 rounded-xl p-8">
      <FieldGroup>
        {errors.root && (
          <FieldError className="mb-4 text-sm text-black bg-[#ef767a] p-3 rounded">
            {errors.root.message}
          </FieldError>
        )}

        <form onSubmit={handleSubmit(formSubmitHandler)} className="space-y-4">
          <FieldGroup>
            <Field data-invalid={!!errors.cat_name}>
              <div className="w-fit">
                <FieldLabel htmlFor="cat_name">Category Name</FieldLabel>
              </div>
              <input
                id="cat_name"
                {...register("cat_name")}
                type="text"
                className="w-full outline-0 border border-input shadow-sm rounded-lg px-3 py-2 text-sm focus:outline-3 focus:border-muted transition-all duration-150"
              />
              {errors.cat_name && (
                <FieldError>{errors.cat_name.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.cat_desc}>
              <div className="w-fit">
                <FieldLabel htmlFor="cat_desc">Category Description</FieldLabel>
              </div>
              <input
                id="cat_desc"
                {...register("cat_desc")}
                type="text"
                className="w-full outline-0 border border-input shadow-sm rounded-lg px-3 py-2 text-sm focus:outline-3 focus:border-muted transition-all duration-150"
              />
              {errors.cat_desc && (
                <FieldError>{errors.cat_desc.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!errors.cat_img}>
              <div className="w-fit">
                <FieldLabel>Category Image</FieldLabel>
              </div>

              <ImageUploader
                value={watch("cat_img")}
                onChange={(file) => setValue("cat_img", file ?? "", { shouldValidate: true })}
                onError={(message) => setError("cat_img", { message })}
                disabled={isSubmitting}
              />

              {errors.cat_img && (
                <FieldError>{errors.cat_img.message}</FieldError>
              )}
            </Field>

            <Field>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black outline-0 text-white py-2 rounded-lg text-sm font-medium hover:tracking-[0.5px] transition-all duration-150 focus:outline-4 focus:border-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Please wait..." : "Create category"}
              </button>
            </Field>
          </FieldGroup>
        </form>
      </FieldGroup>
    </div>
  );
}
