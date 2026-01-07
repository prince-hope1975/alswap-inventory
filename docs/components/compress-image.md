# compress-image
**Path**: `src/lib/compress-image.ts`

## Purpose
Client-side image compression utility using browser-image-compression library.

## Functions

### `compressImage`
Compresses a single image file.

```typescript
function compressImage(
    file: File,
    options?: CompressionOptions
): Promise<File>
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | The image file to compress |
| `options` | `CompressionOptions` | No | Compression options |

**CompressionOptions:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxSizeMB` | `number` | `0.2` | Maximum file size in MB (200KB) |
| `maxWidthOrHeight` | `number` | `1200` | Maximum dimension in pixels |
| `useWebWorker` | `boolean` | `true` | Use web worker for compression |

**Returns:** `Promise<File>` - Compressed file

---

### `compressImages`
Compresses multiple images in parallel with progress callback.

```typescript
function compressImages(
    files: File[],
    options?: CompressionOptions,
    onProgress?: (completed: number, total: number) => void
): Promise<File[]>
```

**Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | `File[]` | Yes | Array of image files |
| `options` | `CompressionOptions` | No | Compression options |
| `onProgress` | `function` | No | Progress callback |

**Returns:** `Promise<File[]>` - Array of compressed files

## Usage Example
```typescript
import { compressImage, compressImages } from "~/lib/compress-image";

// Single image
const compressed = await compressImage(file);

// Multiple images with progress
const results = await compressImages(files, {}, (done, total) => {
    console.log(`${done}/${total} complete`);
});
```

## Dependencies
- `browser-image-compression`: Core compression library
