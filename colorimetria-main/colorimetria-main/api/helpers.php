<?php
// api/helpers.php

if (!function_exists('stats_standard_deviation')) {
    function stats_standard_deviation($a) {
        $n = count($a);
        if ($n === 0) return 0;
        $mean = array_sum($a) / $n;
        $sum = 0;
        foreach ($a as $v) {
            $sum += ($v - $mean) ** 2;
        }
        return sqrt($sum / $n);
    }
}

if (!function_exists('normalizar_fecha')) {
    function normalizar_fecha($valor) {
        if ($valor === null || $valor === '') return null;
        if ($valor instanceof DateTimeInterface) return $valor->format('d/m/Y H:i');
        $texto = trim((string)$valor);
        if ($texto === '') return null;
        $formatos = [
            'Y-m-d H:i:s', 'Y-m-d H:i', 'Y-m-d\TH:i:s',
            'Y-m-d\TH:i:s.u', 'd/m/Y H:i:s', 'd/m/Y H:i'
        ];
        foreach ($formatos as $formato) {
            $dt = DateTime::createFromFormat($formato, $texto);
            if ($dt instanceof DateTime) return $dt->format('d/m/Y H:i');
        }
        $dt = date_create($texto);
        if ($dt instanceof DateTime) return $dt->format('d/m/Y H:i');
        return $texto;
    }
}

if (!function_exists('ejecutar_consulta')) {
    function ejecutar_consulta($conn, $sql) {
        $stmt = sqlsrv_query($conn, $sql);
        if ($stmt === false) {
            http_response_code(500);
            echo json_encode([
                'error'   => true,
                'mensaje' => 'Error en la consulta SQL',
                'detalle' => sqlsrv_errors()
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
        return $stmt;
    }
}

function eliminarImagenSiHuérfana($rutaRelativa, $conn) {
    if (empty($rutaRelativa)) return;
    $sql1 = "SELECT COUNT(*) AS cnt FROM mediciones_lab WHERE imagen_muestra = ?";
    $stmt1 = sqlsrv_query($conn, $sql1, [$rutaRelativa]);
    $cnt1 = 0;
    if ($stmt1 && $row = sqlsrv_fetch_array($stmt1, SQLSRV_FETCH_ASSOC)) {
        $cnt1 = intval($row['cnt']);
    }
    $sql2 = "SELECT COUNT(*) AS cnt FROM aromaticas WHERE imagen_muestra = ?";
    $stmt2 = sqlsrv_query($conn, $sql2, [$rutaRelativa]);
    $cnt2 = 0;
    if ($stmt2 && $row = sqlsrv_fetch_array($stmt2, SQLSRV_FETCH_ASSOC)) {
        $cnt2 = intval($row['cnt']);
    }
    if ($cnt1 === 0 && $cnt2 === 0) {
        $rutaFisica = __DIR__ . '/../' . $rutaRelativa;
        if (file_exists($rutaFisica)) {
            unlink($rutaFisica);
        }
    }
}
