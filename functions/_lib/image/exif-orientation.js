/* ────────────────────────────────────────────────────────────────
   Lee el tag EXIF Orientation (0x0112) de un JPEG, sin dependencias.
   photon-rs no interpreta EXIF, así que la corrección de orientación
   se hace acá, antes de pasarle los bytes a Photon.
   ──────────────────────────────────────────────────────────────── */

/**
 * @param {Uint8Array} bytes
 * @returns {number} 1-8 (ver spec EXIF), 1 si no hay tag o no es JPEG
 */
export function readJpegOrientation(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = view.getUint16(offset + 2, false);
    if (marker === 0xe1) {
      // APP1 — debería contener "Exif\0\0"
      const exifStart = offset + 4;
      if (
        bytes[exifStart] === 0x45 &&
        bytes[exifStart + 1] === 0x78 &&
        bytes[exifStart + 2] === 0x69 &&
        bytes[exifStart + 3] === 0x66
      ) {
        return parseTiffOrientation(view, exifStart + 6);
      }
    }
    offset += 2 + segmentLength;
  }
  return 1;
}

function parseTiffOrientation(view, tiffStart) {
  const byteOrder = view.getUint16(tiffStart, false);
  const littleEndian = byteOrder === 0x4949;
  const firstIfdOffset = view.getUint32(tiffStart + 4, littleEndian);
  const ifdStart = tiffStart + firstIfdOffset;
  const entryCount = view.getUint16(ifdStart, littleEndian);

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    const tag = view.getUint16(entryOffset, littleEndian);
    if (tag === 0x0112) {
      return view.getUint16(entryOffset + 8, littleEndian);
    }
  }
  return 1;
}
