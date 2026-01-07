# MultiImageUpload
**Path**: `src/app/_components/multi-image-upload.tsx`

## Purpose
Compact multi-image upload component with thumbnail grid, client-side compression, optional cropping, and primary image selection.

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string[]` | Yes | - | Array of image URLs (first is primary) |
| `onChange` | `(urls: string[]) => void` | Yes | - | Called when images change |
| `onBlur` | `() => void` | No | - | Called on blur for form validation |
| `maxImages` | `number` | No | `10` | Maximum number of images allowed |

## Usage Example
```tsx
<MultiImageUpload
    value={images}
    onChange={setImages}
    maxImages={5}
/>
```

## Features
- **Thumbnail Grid**: 80×80px compact tiles
- **Multi-file Upload**: Drag & drop or click to select multiple files
- **Client-side Compression**: Auto-compresses to ≤200KB before upload
- **Optional Cropping**: Click crop icon on any thumbnail
- **Primary Selection**: First image is primary; click star to change
- **Upload Progress**: Loading spinner overlay during upload

## Dependencies
- `react-dropzone`: Drag-and-drop file handling
- `react-easy-crop`: Image cropping modal
- `~/lib/compress-image`: Client-side compression
- `~/lib/storage`: Cloudinary upload
- `lucide-react`: Icons
