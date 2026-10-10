<?php
// api/clasificacion.php

function clasificarEstado(float $L, float $a, float $b, int $fruta_id, $conn, string $categoria = 'frutas'): array {
    $checkCol = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'estados_maduracion_fruta' AND COLUMN_NAME = 'categoria'");
    $hasCat = ($checkCol !== false && sqlsrv_has_rows($checkCol));

    if ($categoria !== 'frutas' && !$hasCat) {
        $estados = obtenerEstadosAromaticasHardcoded($fruta_id);
        $estadoDetectado = ['numero' => 0, 'nombre' => 'Sin clasificar',
                            'color_badge' => '#9e9e9e', 'emoji' => '⚪'];
        foreach ($estados as $row) {
            if ($L >= $row['l_min'] && $L <= $row['l_max'] &&
                $a >= $row['a_min'] && $a <= $row['a_max'] &&
                $b >= $row['b_min'] && $b <= $row['b_max']) {
                $estadoDetectado = [
                    'numero'      => $row['numero'],
                    'nombre'      => $row['nombre'],
                    'color_badge' => $row['color_badge'],
                    'emoji'       => $row['emoji']
                ];
                break;
            }
        }
        if ($estadoDetectado['numero'] === 0) {
            $estadoDetectado = clasificarPorCercania($L, $fruta_id, $conn, $categoria);
        }
        return $estadoDetectado;
    }

    $sql = "SELECT numero, nombre, color_badge, emoji,
                   l_min, l_max, a_min, a_max, b_min, b_max
            FROM estados_maduracion_fruta
            WHERE fruta_id = ?";
    $params = [$fruta_id];
    if ($hasCat) { $sql .= " AND categoria = ?"; $params[] = $categoria; }
    $sql .= " ORDER BY numero ASC";
    $stmt = sqlsrv_query($conn, $sql, $params);

    $estadoDetectado = ['numero' => 0, 'nombre' => 'Sin clasificar',
                        'color_badge' => '#9e9e9e', 'emoji' => '⚪'];

    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $dentroL = ($L >= floatval($row['l_min']) && $L <= floatval($row['l_max']));
        $dentroA = ($a >= floatval($row['a_min']) && $a <= floatval($row['a_max']));
        $dentroB = ($b >= floatval($row['b_min']) && $b <= floatval($row['b_max']));

        if ($dentroL && $dentroA && $dentroB) {
            $estadoDetectado = [
                'numero'      => intval($row['numero']),
                'nombre'      => $row['nombre'],
                'color_badge' => $row['color_badge'],
                'emoji'       => $row['emoji']
            ];
            break;
        }
    }

    if ($estadoDetectado['numero'] === 0) {
        $estadoDetectado = clasificarPorCercania($L, $fruta_id, $conn, $categoria);
    }

    return $estadoDetectado;
}

function clasificarPorCercania(float $L, int $fruta_id, $conn, string $categoria = 'frutas'): array {
    $checkCol = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'estados_maduracion_fruta' AND COLUMN_NAME = 'categoria'");
    $hasCat = ($checkCol !== false && sqlsrv_has_rows($checkCol));
    if ($categoria !== 'frutas' && !$hasCat) {
        $estados = obtenerEstadosAromaticasHardcoded($fruta_id);
        if (count($estados) === 0) {
            return ['numero' => 0, 'nombre' => 'Sin clasificar', 'color_badge' => '#9e9e9e', 'emoji' => '⚪'];
        }
        $mejor = null;
        $mejorDist = PHP_FLOAT_MAX;
        foreach ($estados as $row) {
            $mid = $row['l_min'] + ($row['l_max'] - $row['l_min']) / 2.0;
            $dist = abs($mid - $L);
            if ($dist < $mejorDist) {
                $mejorDist = $dist;
                $mejor = $row;
            }
        }
        if ($mejor) {
            return [
                'numero'      => $mejor['numero'],
                'nombre'      => $mejor['nombre'],
                'color_badge' => $mejor['color_badge'],
                'emoji'       => $mejor['emoji']
            ];
        }
        return ['numero' => 0, 'nombre' => 'Sin clasificar', 'color_badge' => '#9e9e9e', 'emoji' => '⚪'];
    }
    $sql = "SELECT TOP 1 numero, nombre, color_badge, emoji,
                   ABS(l_min + (l_max - l_min)/2.0 - ?) AS distancia
            FROM estados_maduracion_fruta
            WHERE fruta_id = ?";
    $params = [$L, $fruta_id];
    if ($hasCat) { $sql .= " AND categoria = ?"; $params[] = $categoria; }
    $sql .= " ORDER BY distancia ASC";
    $stmt = sqlsrv_query($conn, $sql, $params);
    if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        return [
            'numero'      => intval($row['numero']),
            'nombre'      => $row['nombre'],
            'color_badge' => $row['color_badge'],
            'emoji'       => $row['emoji']
        ];
    }
    return ['numero' => 0, 'nombre' => 'Sin clasificar', 'color_badge' => '#9e9e9e', 'emoji' => '⚪'];
}

function obtenerEstadosAromaticasHardcoded(int $fruta_id): array {
    $mapa = [
        1 => [
            ['numero'=>1,'nombre'=>'Juvenil (Inmaduro)','color_badge'=>'#4ade80','emoji'=>'🌱','l_min'=>30,'l_max'=>40,'a_min'=>-18,'a_max'=>-12,'b_min'=>18,'b_max'=>28],
            ['numero'=>2,'nombre'=>'Desarrollo vegetativo','color_badge'=>'#facc15','emoji'=>'🌿','l_min'=>35,'l_max'=>45,'a_min'=>-16,'a_max'=>-10,'b_min'=>20,'b_max'=>30],
            ['numero'=>3,'nombre'=>'Madurez óptima (cosecha)','color_badge'=>'#fb923c','emoji'=>'🌾','l_min'=>40,'l_max'=>50,'a_min'=>-14,'a_max'=>-6,'b_min'=>22,'b_max'=>32],
            ['numero'=>4,'nombre'=>'Senescencia','color_badge'=>'#ef4444','emoji'=>'🍂','l_min'=>50,'l_max'=>65,'a_min'=>-5,'a_max'=>5,'b_min'=>30,'b_max'=>45],
        ],
        2 => [
            ['numero'=>1,'nombre'=>'Juvenil (Inmaduro)','color_badge'=>'#4ade80','emoji'=>'🌱','l_min'=>45,'l_max'=>60,'a_min'=>-10,'a_max'=>-5,'b_min'=>15,'b_max'=>25],
            ['numero'=>2,'nombre'=>'Desarrollo vegetativo','color_badge'=>'#facc15','emoji'=>'🌿','l_min'=>50,'l_max'=>65,'a_min'=>-8,'a_max'=>-3,'b_min'=>20,'b_max'=>35],
            ['numero'=>3,'nombre'=>'Madurez óptima (cosecha)','color_badge'=>'#fb923c','emoji'=>'🌾','l_min'=>75,'l_max'=>85,'a_min'=>-2,'a_max'=>3,'b_min'=>35,'b_max'=>60],
            ['numero'=>4,'nombre'=>'Senescencia','color_badge'=>'#ef4444','emoji'=>'🍂','l_min'=>80,'l_max'=>90,'a_min'=>2,'a_max'=>8,'b_min'=>40,'b_max'=>70],
        ],
        3 => [
            ['numero'=>1,'nombre'=>'Juvenil (Inmaduro)','color_badge'=>'#4ade80','emoji'=>'🌱','l_min'=>25,'l_max'=>35,'a_min'=>-20,'a_max'=>-14,'b_min'=>15,'b_max'=>22],
            ['numero'=>2,'nombre'=>'Desarrollo vegetativo','color_badge'=>'#facc15','emoji'=>'🌿','l_min'=>28,'l_max'=>40,'a_min'=>-18,'a_max'=>-10,'b_min'=>18,'b_max'=>28],
            ['numero'=>3,'nombre'=>'Madurez óptima (cosecha)','color_badge'=>'#fb923c','emoji'=>'🌾','l_min'=>35,'l_max'=>45,'a_min'=>-12,'a_max'=>-5,'b_min'=>20,'b_max'=>30],
            ['numero'=>4,'nombre'=>'Senescencia','color_badge'=>'#ef4444','emoji'=>'🍂','l_min'=>45,'l_max'=>60,'a_min'=>-2,'a_max'=>6,'b_min'=>25,'b_max'=>45],
        ],
    ];
    return $mapa[$fruta_id] ?? [];
}

function calcularConfianza(float $L, float $chroma, array $reflectancias): int {
    $ptEsp = 40;
    if (count($reflectancias) > 2) {
        $diffs = [];
        for ($i = 1; $i < count($reflectancias); $i++) {
            $diffs[] = abs($reflectancias[$i] - $reflectancias[$i - 1]);
        }
        $dMedio = array_sum($diffs) / count($diffs);
        $ptEsp = match(true) {
            $dMedio < 2.0 => 40,
            $dMedio < 4.0 => 32,
            $dMedio < 6.5 => 22,
            $dMedio < 9.5 => 12,
            default       => 4
        };
    } else {
        $ptEsp = 16;
    }
    $ptL = match(true) {
        $L >= 22 && $L <= 65 => 35,
        $L >= 15 && $L <  22 => 20,
        $L >  65 && $L <= 75 => 22,
        $L >= 10 && $L <  15 => 8,
        default              => 2
    };
    $ptC = match(true) {
        $chroma >= 18 => 25,
        $chroma >= 13 => 17,
        $chroma >=  9 => 9,
        default       => 2
    };
    return min(100, max(0, $ptEsp + $ptL + $ptC));
}
