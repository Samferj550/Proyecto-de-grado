<?php
// api.php — Router principal
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/helpers.php';

// Mantener funciones de clasificación originales para compatibilidad
function nivelMaduracionFruta(float $L, float $a, float $b,
                               float $hueAngle, float $chroma): float
{
    // Factor L* — piña madura tiene L* más alto
    if      ($L < 30) $fL = 0.20;
    elseif  ($L < 40) $fL = 0.40;
    elseif  ($L < 50) $fL = 0.55;
    elseif  ($L < 60) $fL = 0.70;
    elseif  ($L < 65) $fL = 0.82;
    elseif  ($L < 70) $fL = 0.90;
    elseif  ($L < 75) $fL = 0.95;
    else              $fL = 1.00;

    // Factor chroma — mayor saturación = más maduro
    if      ($chroma < 10) $fC = 0.50;
    elseif  ($chroma < 18) $fC = 0.75;
    elseif  ($chroma < 28) $fC = 0.90;
    else                   $fC = 1.00;

    // Hue: piña inmadura ~120-130°, madura ~75-85°
    // Normalizar: hue 130° -> score 0, hue 75° -> score 10
    $hueScore = (130.0 - $hueAngle) / 5.5;

    // a* positivo refuerza madurez (estados 5-6 tienen a* 0-8)
    $bonus = 0.0;
    if ($a >= 2 && $a <= 8)   $bonus = 0.5;
    elseif ($a >= 0 && $a < 2) $bonus = 0.3;

    $nivel = ($hueScore * $fL * $fC) + $bonus;
    return round(min(10.0, max(0.0, $nivel)), 1);
}

function confianzaFruta(float $L, float $chroma, array $reflectancias): int
{
    $ptEsp = 40;
    if (count($reflectancias) > 2) {
        $diffs = [];
        for ($i = 1; $i < count($reflectancias); $i++) {
            $diffs[] = abs($reflectancias[$i] - $reflectancias[$i - 1]);
        }
        $dMedio = array_sum($diffs) / count($diffs);
        if      ($dMedio < 2.0)  $ptEsp = 40;
        elseif  ($dMedio < 4.0)  $ptEsp = 32;
        elseif  ($dMedio < 6.5)  $ptEsp = 22;
        elseif  ($dMedio < 9.5)  $ptEsp = 12;
        else                     $ptEsp = 4;
    } else {
        $ptEsp = 16;
    }

    if      ($L >= 22 && $L <= 65)   $ptL = 35;
    elseif  ($L >= 15 && $L <  22)   $ptL = 20;
    elseif  ($L >  65 && $L <= 75)   $ptL = 22;
    elseif  ($L >= 10 && $L <  15)   $ptL = 8;
    else                              $ptL = 2;

    if      ($chroma >= 18) $ptC = 25;
    elseif  ($chroma >= 13) $ptC = 17;
    elseif  ($chroma >=  9) $ptC = 9;
    else                    $ptC = 2;

    return min(100, max(0, $ptEsp + $ptL + $ptC));
}

function nivelPigmentacionAromatica(float $L, float $a, float $b,
                                     float $hueAngle, float $chroma): float
{
    if      ($L < 20) $fL = 0.30;
    elseif  ($L < 28) $fL = 0.65;
    elseif  ($L < 35) $fL = 0.85;
    else              $fL = 1.00;

    if      ($chroma <  8) $fC = 0.40;
    elseif  ($chroma < 14) $fC = 0.75;
    elseif  ($chroma < 18) $fC = 0.90;
    else                   $fC = 1.00;

    $hueScore = ($hueAngle - 110.0) / 5.0;

    $bonus = 0.0;
    if      ($a < -16) $bonus = 0.8;
    elseif  ($a < -12) $bonus = 0.4;

    $nivel = ($hueScore * $fL * $fC) + $bonus;
    return round(min(10.0, max(0.0, $nivel)), 1);
}

function confianzaAromatica(float $L, float $chroma, array $reflectancias): int
{
    $ptEsp = 40;
    if (count($reflectancias) > 2) {
        $diffs = [];
        for ($i = 1; $i < count($reflectancias); $i++) {
            $diffs[] = abs($reflectancias[$i] - $reflectancias[$i - 1]);
        }
        $dMedio = array_sum($diffs) / count($diffs);
        if      ($dMedio < 1.5)  $ptEsp = 40;
        elseif  ($dMedio < 2.5)  $ptEsp = 34;
        elseif  ($dMedio < 3.2)  $ptEsp = 24;
        elseif  ($dMedio < 4.5)  $ptEsp = 12;
        else                     $ptEsp = 4;
    } else {
        $ptEsp = 16;
    }

    if      ($L >= 28 && $L <= 58)   $ptL = 35;
    elseif  ($L >= 20 && $L <  28)   $ptL = 22;
    elseif  ($L >  58 && $L <= 70)   $ptL = 20;
    elseif  ($L >= 14 && $L <  20)   $ptL = 9;
    else                              $ptL = 2;

    if      ($chroma >= 20) $ptC = 25;
    elseif  ($chroma >= 14) $ptC = 18;
    elseif  ($chroma >=  9) $ptC = 10;
    else                    $ptC = 3;

    return min(100, max(0, $ptEsp + $ptL + $ptC));
}

require_once __DIR__ . '/api/clasificacion.php';
require_once __DIR__ . '/api/proveedores.php';
require_once __DIR__ . '/api/configuracion.php';
require_once __DIR__ . '/api/frutas.php';
require_once __DIR__ . '/api/aromaticas.php';

$endpoint = $_GET['endpoint'] ?? '';

if (str_starts_with($endpoint, 'proveedores_') || str_starts_with($endpoint, 'proveedor_')) {
    handle_proveedores($endpoint, $conn);
} elseif (str_starts_with($endpoint, 'config_')) {
    handle_configuracion($endpoint, $conn);
} elseif (!str_contains($endpoint, 'aromatica')
       && (str_starts_with($endpoint, 'kpis_frutas') || str_starts_with($endpoint, 'tabla_frutas')
       || str_starts_with($endpoint, 'importar_') && (str_ends_with($endpoint, '_fruta') || str_ends_with($endpoint, 'promedio'))
             || in_array($endpoint, ['importar_csv_fruta_promedio'])
             || in_array($endpoint, ['reflectancias_frutas','detalle_color_frutas',
                                      'archivos_frutas','subir_imagen_fruta',
                                      'guardar_muestra_fruta','eliminar_muestras_fruta',
                                      'muestras_sin_imagen_fruta','frutas_con_datos',
                                      'subir_imagenes_lote_fruta','guardar_asignaciones_fruta',
                                      'detalle_individual_fruta']))) {
    handle_frutas($endpoint, $conn);
} elseif (str_contains($endpoint, 'aromaticas') || str_contains($endpoint, 'aromatica')) {
    handle_aromaticas($endpoint, $conn);
} else {
    http_response_code(400);
    echo json_encode(['error'=>true,'mensaje'=>"Endpoint '$endpoint' no existe."], JSON_UNESCAPED_UNICODE);
}

sqlsrv_close($conn);
