/**
 * ⚠️ SOLO PARA DISPLAY. Nunca pasar el resultado a la BD.
 * Convierte "Piña3.2.1" → "Muestra 3 – Lado 2 – Toma 1"
 * @param {string} name - Ej: "Piña3.2.1", "Fresa10.1.3"
 * @returns {string} - Ej: "Muestra 3 – Lado 2 – Toma 1"
 */
function formatearNombreMuestra(name) {
    if (!name) return '–';
    const match = name.match(/^[\p{L}]+(\d+)\.(\d+)\.(\d+)$/u);
    if (!match) return name;
    const [, muestra, lado, toma] = match;
    return `${t('Muestra ')}${muestra}${t(' – Lado ')}${lado}${t(' – Toma ')}${toma}`;
}

/**
 * Extrae el tipo de fruta del nombre crudo.
 * @param {string} name - Ej: "Piña3.2.1"
 * @returns {string} - Ej: "Piña"
 */
function extraerTipoFruta(name) {
    if (!name) return '';
    const match = name.match(/^([\p{L}]+)\d+\.\d+\.\d+$/u);
    return match ? match[1] : '';
}

/**
 * Formatea fecha a DD/MM/YYYY HH:mm o DD/MM/YYYY
 */
function formatearFecha(str, soloFecha = false) {
    if (!str) return '–';
    const d = new Date(str);
    if (isNaN(d)) return str;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (soloFecha) return `${dd}/${mm}/${yyyy}`;
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}
