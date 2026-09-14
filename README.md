# image-upload-handler-for-supabase-and-nextjs

A simple reusable image upload component and handler for supabase and nextjs with drag and drop and keyboard accessibility features.

**MAJOR UPDATE**: we added our new component MultiImageUploader, it works just as ImageUploader but with multiple images! check it out.

> NOTE: all 4 demo videos in _Examples_ are from a web app I worked on so you can see all features (more in that in the _Notes on Usage_ section below). the video below is what you actually will see

https://github.com/user-attachments/assets/4c2feeda-efd9-4575-9e88-109a0c7f6d1f

Supported stacks:

- Supabase with Nextjs, Tailwind, shadcn/ui, React Hook Form and Zod

See the [Examples](#-examples) section below for more demos.

## Getting Started

Currently this project works for Nextjs and supabase but I believe it will work fine with React too with simple modifications and actually with any file type not just images.

```bash
git clone https://github.com/theeyad/image-upload-handler-for-supabase-and-nextjs.git
cd image-upload-handler-for-supabase-and-nextjs
npm install
npm run dev
```

Now let's take a look at this

```text
image-upload-handler-for-supabase-and-nextjs/
├── src/
│   ├── actions/
│   │   └── admin.ts                # Server action to create category and add it to Supabase
│   ├── app/                        # Next.js App Router layout, page & global CSS
│   ├── components/
│   │   ├── shared/
│   │   │   ├── ImageUploader.tsx   # The main UI component
│   │   │   └── NewCategoryForm.tsx # Full Form Demo Component
│   │   └── ui/                     # shadcn/ui components (button, field, label, toast, etc.)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client helper
│   │   │   └── server.ts           # Server Supabase client helper
│   │   ├── validation/
│   │   │   └── categories/
│   │   │       └── createCat.ts    # Zod schema
│   │   ├── upload.ts               # Storage upload helper function
│   │   └── utils.ts                # cn() & generateUniqueId() helpers
│   └── supabase/
│       └── storage-policies.sql    # Storage bucket & RLS SQL setup script
├── next.config.ts                  # remotePatterns config example
└── README.md                       # Full documentation & RHF + Zod examples
```

Here we have the simplest implementation of our image upload handler, in `src/components/shared/NewCategoryForm.tsx` you will find a full form using shadcn/ui and our `ImageUploader.tsx`

## Examples

**Normal Upload**

https://github.com/user-attachments/assets/5db89a70-b32a-40fe-850e-ffc5a5a18013

**Drag & Drop**

https://github.com/user-attachments/assets/87e52d77-c733-4421-abe7-3cd2f3c6e96f

**Keyboard Accessibility**

https://github.com/user-attachments/assets/bd643272-1009-4959-a6ff-b61cdaedaaa4

## Notes on Usage

> This demo will not function untill `.env.example` is provided with real values. and supabase storage bucket is created and RLS policies are enabled on that bucket.

Follow these steps:

1. first you need a storage bucket in supabase and RLS policies enabled on that bucket.

2. then you can use the `ImageUploader.tsx` component in your project with the props: `value`, `onChange`, `onError`, `bucket`, `folder`, `disabled`. those props are connected to react hook form (RHF) and supabase bucket.

3. `ImageUploader.tsx` uses the `upload.ts` helper function to upload images to supabase.

4. the `createCat.ts` schema is used in `NewCategoryForm.tsx` to validate images.

5. `admin.ts` server action is used to create categories and add them to supabase.

6. `generateUniqueId()` helper function is used to generate unique ids.

7. `app/page.tsx` uses `NewCategoryForm.tsx` component to display a full form using shadcn/ui and our `ImageUploader.tsx`.

8. `next.config.ts` remotePatterns config example to configure remote patterns for images, this is needed for next `<Image>` component so it can display the preview of uploaded image.

> To use the `ImageUploader` component and understand the whole flow see [Full Documentation](Documentation.md).

## License

MIT License — Feel free to use, modify, and distribute in your own projects!
