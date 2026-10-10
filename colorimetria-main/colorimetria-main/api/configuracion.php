<?php
// api/configuracion.php

function handle_configuracion(string $endpoint, $conn): void {

    switch ($endpoint) {

        case 'proveedor_config_obtener':
            $id = intval($_GET['proveedor_id'] ?? 0);
            if ($id <= 0) { echo json_encode([]); break; }
            $stmt = sqlsrv_query($conn,
                "SELECT id, proveedor_id, categoria, tipo_id
                 FROM proveedor_configuracion WHERE proveedor_id = ?", [$id]);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'proveedor_config_guardar':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405); echo json_encode(['error'=>true,'mensaje'=>'POST requerido']); break;
            }
            $d = json_decode(file_get_contents('php://input'), true);
            $proveedorId = intval($d['proveedor_id'] ?? 0);
            $config = $d['configuracion'] ?? [];
            if ($proveedorId <= 0) {
                http_response_code(400); echo json_encode(['error'=>true,'mensaje'=>'proveedor_id requerido']); break;
            }
            sqlsrv_begin_transaction($conn);
            $del = sqlsrv_query($conn, "DELETE FROM proveedor_configuracion WHERE proveedor_id = ?", [$proveedorId]);
            if ($del === false) { sqlsrv_rollback($conn); break; }
            foreach ($config as $item) {
                $cat = trim($item['categoria'] ?? '');
                $tipoId = intval($item['tipo_id'] ?? 0);
                if (!in_array($cat, ['frutas','aromaticas']) || $tipoId <= 0) continue;
                $ins = sqlsrv_query($conn,
                    "INSERT INTO proveedor_configuracion (proveedor_id, categoria, tipo_id) VALUES (?, ?, ?)",
                    [$proveedorId, $cat, $tipoId]);
                if ($ins === false) { sqlsrv_rollback($conn); break 2; }
            }
            sqlsrv_commit($conn);
            echo json_encode(['error'=>false,'mensaje'=>'Configuración guardada']);
            break;

        case 'config_frutas_listar':
            $stmt = sqlsrv_query($conn,
                "SELECT id, nombre, slug, icono, activo, coming_soon
                 FROM tipo_frutas ORDER BY nombre ASC");
            if ($stmt === false) {
                echo json_encode(['error'=>true,'mensaje'=>'Error al consultar tipo_frutas','detalle'=>sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
                break;
            }
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'config_aromaticas_listar':
            $stmt = sqlsrv_query($conn,
                "SELECT id, nombre, slug, icono, activo, coming_soon
                 FROM tipo_aromaticas ORDER BY nombre ASC");
            if ($stmt === false) {
                echo json_encode(['error'=>true,'mensaje'=>'Error al consultar tipo_aromaticas','detalle'=>sqlsrv_errors()], JSON_UNESCAPED_UNICODE);
                break;
            }
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'config_estados_fruta':
            $frutaId = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : 0;
            $categoria = $_GET['categoria'] ?? 'frutas';
            if ($frutaId <= 0) {
                http_response_code(400);
                echo json_encode(['error'=>true,'mensaje'=>'fruta_id es obligatorio']);
                break;
            }
            $checkCol = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'estados_maduracion_fruta' AND COLUMN_NAME = 'categoria'");
            $hasCat = ($checkCol !== false && sqlsrv_has_rows($checkCol));
            if ($categoria !== 'frutas' && !$hasCat) {
                require_once __DIR__ . '/clasificacion.php';
                echo json_encode(obtenerEstadosAromaticasHardcoded($frutaId));
                break;
            }
            $sql = "SELECT numero, nombre, color_badge, emoji, l_min, l_max, a_min, a_max, b_min, b_max
                    FROM estados_maduracion_fruta
                    WHERE fruta_id = ?";
            $params = [$frutaId];
            if ($hasCat) { $sql .= " AND categoria = ?"; $params[] = $categoria; }
            $sql .= " ORDER BY numero ASC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            $rows = [];
            $fallbackEmoji = ['🔴','🟠','🟡','🟨','🟩','🟢'];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                if (empty($row['emoji']) || $row['emoji'] === '??' || $row['emoji'] === '?') {
                    $row['emoji'] = $fallbackEmoji[($row['numero'] ?? 1) - 1] ?? '●';
                }
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error'=>true,'mensaje'=>"Endpoint '$endpoint' no existe en configuración"], JSON_UNESCAPED_UNICODE);
            break;
    }
}
