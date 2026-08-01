import { PhotonImage, SamplingFilter, resize, watermark, fliph, flipv, rotate } from '@cf-wasm/photon/workerd';
import { readJpegOrientation } from './exif-orientation.js';

const CATALOG_SIZE = 1000;
const THUMBNAIL_SIZE = 300;
const MARGIN_RATIO = 0.08; // 8% de margen de cada lado sobre el lienzo de catálogo
const MAX_UPSCALE_FACTOR = 3; // no estirar una imagen chica más allá de esto

/**
 * Corrige la orientación EXIF de un JPEG aplicando la rotación/flip que
 * corresponda. NOTA: `rotate()` de photon-rs rota en el sentido matemático
 * (antihorario); si al probar con una foto real rotada se ve invertida,
 * cambiar el signo de los ángulos acá.
 * @param {PhotonImage} image
 * @param {Uint8Array} originalBytes
 * @returns {PhotonImage}
 */
function applyExifOrientation(image, originalBytes) {
  const orientation = readJpegOrientation(originalBytes);
  switch (orientation) {
    case 2:
      fliph(image);
      return image;
    case 3: {
      const rotated = rotate(image, 180);
      image.free();
      return rotated;
    }
    case 4:
      flipv(image);
      return image;
    case 6: {
      const rotated = rotate(image, -90);
      image.free();
      return rotated;
    }
    case 8: {
      const rotated = rotate(image, 90);
      image.free();
      return rotated;
    }
    case 5: {
      fliph(image);
      const rotated = rotate(image, -90);
      image.free();
      return rotated;
    }
    case 7: {
      fliph(image);
      const rotated = rotate(image, 90);
      image.free();
      return rotated;
    }
    default:
      return image;
  }
}

function whiteCanvas(size) {
  const rawPixels = new Uint8Array(size * size * 4).fill(255);
  return new PhotonImage(rawPixels, size, size);
}

/**
 * @param {Uint8Array} bytes Imagen original ya descargada y validada
 * @param {{ minWidth: number, minHeight: number }} opts
 * @returns {{
 *   catalogWebp: Uint8Array,
 *   thumbnailWebp: Uint8Array,
 *   originalWidth: number,
 *   originalHeight: number,
 *   lowResWarning: boolean,
 * }}
 */
export function normalizeProductImage(bytes, { minWidth, minHeight }) {
  let image = PhotonImage.new_from_byteslice(bytes);
  image = applyExifOrientation(image, bytes);

  const originalWidth = image.get_width();
  const originalHeight = image.get_height();
  const lowResWarning = originalWidth < minWidth || originalHeight < minHeight;

  const contentSize = CATALOG_SIZE * (1 - 2 * MARGIN_RATIO);
  let scale = Math.min(contentSize / originalWidth, contentSize / originalHeight);
  scale = Math.min(scale, MAX_UPSCALE_FACTOR);

  const newWidth = Math.max(1, Math.round(originalWidth * scale));
  const newHeight = Math.max(1, Math.round(originalHeight * scale));

  const resized = resize(image, newWidth, newHeight, SamplingFilter.Lanczos3);
  image.free();

  const canvas = whiteCanvas(CATALOG_SIZE);
  const x = BigInt(Math.floor((CATALOG_SIZE - newWidth) / 2));
  const y = BigInt(Math.floor((CATALOG_SIZE - newHeight) / 2));
  watermark(canvas, resized, x, y);
  resized.free();

  const catalogWebp = canvas.get_bytes_webp();

  const thumbCanvas = resize(canvas, THUMBNAIL_SIZE, THUMBNAIL_SIZE, SamplingFilter.Lanczos3);
  const thumbnailWebp = thumbCanvas.get_bytes_webp();

  canvas.free();
  thumbCanvas.free();

  return { catalogWebp, thumbnailWebp, originalWidth, originalHeight, lowResWarning };
}
