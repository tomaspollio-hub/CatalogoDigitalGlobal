/* ────────────────────────────────────────────────────────────────
   Helpers de respuesta HTTP + mensajes de error orientados al
   usuario (nunca el detalle técnico ni nada que pueda filtrar la
   API key).
   ──────────────────────────────────────────────────────────────── */

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}

const USER_MESSAGES = {
  provider_not_configured: 'La búsqueda de imágenes no está configurada todavía. Avisá al administrador del sitio.',
  provider_invalid_key: 'La búsqueda de imágenes no está disponible en este momento. Avisá al administrador del sitio.',
  provider_timeout: 'La búsqueda tardó demasiado. Probá de nuevo en un momento.',
  provider_unreachable: 'No pudimos conectarnos con el proveedor de imágenes. Probá de nuevo en un momento.',
  provider_rate_limited: 'El proveedor de imágenes está limitando las consultas. Probá de nuevo en unos minutos.',
  provider_error: 'No pudimos completar la búsqueda. Probá de nuevo en un momento.',
  provider_invalid_response: 'El proveedor de imágenes devolvió una respuesta inválida. Probá de nuevo.',
  daily_limit_reached: 'Se alcanzó el límite de consultas diarias a Barcode Lookup. Probá de nuevo mañana.',
  no_results_barcode: 'No encontramos una imagen para este código de barras. Probá buscar por título, marca y presentación.',
  no_results_text: 'No encontramos resultados con esos datos. Probá ajustar el título, la marca o la presentación.',
  url_no_permitida: 'La imagen seleccionada no se puede descargar por seguridad. Probá con otro candidato.',
  descarga_timeout: 'La descarga de la imagen tardó demasiado. Probá de nuevo.',
  descarga_fallida: 'No pudimos descargar la imagen desde la fuente externa.',
  imagen_demasiado_grande: 'La imagen es demasiado pesada.',
  formato_no_permitido: 'El archivo no es una imagen en un formato admitido.',
  imagen_corrupta: 'La imagen está dañada o no se pudo procesar.',
  product_not_found: 'No encontramos el producto.',
  image_not_found: 'No encontramos esa imagen.',
  medication_confirmation_required:
    'Para medicamentos hace falta confirmar que revisaste laboratorio, concentración y presentación antes de aprobar.',
  illustrative_not_allowed_for_medication: 'No se permiten imágenes ilustrativas para medicamentos.',
  replace_confirmation_required: 'Este producto ya tiene una imagen — confirmá que querés reemplazarla.',
  storage_error: 'Ocurrió un problema al guardar la imagen. Probá de nuevo.',
  validation_error: 'Los datos enviados no son válidos.',
  unknown_error: 'Ocurrió un error inesperado. Probá de nuevo.',
};

/**
 * @param {number} status
 * @param {string} code Clave de USER_MESSAGES
 */
export function errorResponse(status, code) {
  return json({ error: USER_MESSAGES[code] || USER_MESSAGES.unknown_error, code }, { status });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    const err = new Error('validation_error');
    err.code = 'validation_error';
    throw err;
  }
}
