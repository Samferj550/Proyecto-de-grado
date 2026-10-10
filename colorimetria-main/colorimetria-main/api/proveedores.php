<?php
// api/proveedores.php

function handle_proveedores(string $endpoint, $conn): void {

    switch ($endpoint) {

        case 'proveedores_listar':
            $stmt = sqlsrv_query($conn,
                "SELECT id, nombre, nit, contacto, telefono, ciudad, notas, activo,
                        CONVERT(varchar(10), fecha_alta, 103) AS fecha_alta
                 FROM proveedores WHERE activo = 1 ORDER BY nombre ASC");
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'proveedores_crear':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405); echo json_encode(['error'=>true,'mensaje'=>'POST requerido']); break;
            }
            $d = json_decode(file_get_contents('php://input'), true);
            if (empty($d['nombre'])) {
                http_response_code(400); echo json_encode(['error'=>true,'mensaje'=>'El nombre es obligatorio']); break;
            }
            $sql = "INSERT INTO proveedores (nombre, nit, contacto, telefono, ciudad, notas)
                    VALUES (?, ?, ?, ?, ?, ?)";
            $params = [
                trim($d['nombre']),
                $d['nit']      ?? null,
                $d['contacto'] ?? null,
                $d['telefono'] ?? null,
                $d['ciudad']   ?? null,
                $d['notas']    ?? null
            ];
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error'=>true,'mensaje'=>'Error al crear','detalle'=>sqlsrv_errors()]);
            } else {
                $idStmt = sqlsrv_query($conn, "SELECT @@IDENTITY AS id");
                $idRow  = sqlsrv_fetch_array($idStmt, SQLSRV_FETCH_ASSOC);
                echo json_encode(['error'=>false,'mensaje'=>'Proveedor creado','id'=>$idRow['id']], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'proveedores_editar':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405); echo json_encode(['error'=>true,'mensaje'=>'POST requerido']); break;
            }
            $d = json_decode(file_get_contents('php://input'), true);
            if (empty($d['id']) || empty($d['nombre'])) {
                http_response_code(400); echo json_encode(['error'=>true,'mensaje'=>'id y nombre son obligatorios']); break;
            }
            $sql = "UPDATE proveedores
                    SET nombre=?, nit=?, contacto=?, telefono=?, ciudad=?, notas=?
                    WHERE id=?";
            $params = [
                trim($d['nombre']), $d['nit']??null, $d['contacto']??null,
                $d['telefono']??null, $d['ciudad']??null, $d['notas']??null,
                intval($d['id'])
            ];
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error'=>true,'mensaje'=>'Error al editar','detalle'=>sqlsrv_errors()]);
            } else {
                echo json_encode(['error'=>false,'mensaje'=>'Proveedor actualizado'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'proveedores_eliminar':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405); echo json_encode(['error'=>true,'mensaje'=>'POST requerido']); break;
            }
            $d = json_decode(file_get_contents('php://input'), true);
            if (empty($d['id'])) {
                http_response_code(400); echo json_encode(['error'=>true,'mensaje'=>'id es obligatorio']); break;
            }
            $stmt = sqlsrv_query($conn, "UPDATE proveedores SET activo=0 WHERE id=?", [intval($d['id'])]);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error'=>true,'detalle'=>sqlsrv_errors()]);
            } else {
                echo json_encode(['error'=>false,'mensaje'=>'Proveedor eliminado'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'proveedores_con_datos':
            $stmt = sqlsrv_query($conn,
                "SELECT DISTINCT p.id, p.nombre
                 FROM proveedores p
                 WHERE p.activo = 1 AND (
                     EXISTS (SELECT 1 FROM mediciones_lab m WHERE m.proveedor_id = p.id)
                     OR
                     EXISTS (SELECT 1 FROM aromaticas a WHERE a.proveedor_id = p.id)
                 )
                 ORDER BY p.nombre ASC");
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'proveedor_tiene_muestras':
            $id = intval($_GET['id'] ?? 0);
            if (!$id) { echo json_encode(['tiene_muestras' => false, 'total' => 0]); break; }

            $stmtF = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM mediciones_lab WHERE proveedor_id = ? AND carpeta = 'csv_promedio'", [$id]);
            $countF = 0;
            if ($stmtF) {
                $rowF = sqlsrv_fetch_array($stmtF, SQLSRV_FETCH_ASSOC);
                $countF = (int)($rowF['c'] ?? 0);
            }

            $stmtA = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM aromaticas WHERE proveedor_id = ? AND carpeta = 'csv_promedio'", [$id]);
            $countA = 0;
            if ($stmtA) {
                $rowA = sqlsrv_fetch_array($stmtA, SQLSRV_FETCH_ASSOC);
                $countA = (int)($rowA['c'] ?? 0);
            }

            // Per-fruit-type breakdown
            $frutasDetalle = [];
            $stmtFd = sqlsrv_query($conn, "SELECT m.fruta_id, t.nombre, COUNT(*) AS cnt
                FROM mediciones_lab m
                LEFT JOIN tipo_frutas t ON t.id = m.fruta_id
                WHERE m.proveedor_id = ? AND m.carpeta = 'csv_promedio'
                GROUP BY m.fruta_id, t.nombre ORDER BY t.nombre", [$id]);
            if ($stmtFd) {
                while ($row = sqlsrv_fetch_array($stmtFd, SQLSRV_FETCH_ASSOC)) {
                    $frutasDetalle[] = ['id' => (int)$row['fruta_id'], 'nombre' => $row['nombre'] ?? 'Sin tipo', 'cnt' => (int)$row['cnt']];
                }
            }

            // Per-aromatica-type breakdown
            $aroDetalle = [];
            $stmtAd = sqlsrv_query($conn, "SELECT a.aromatica_id, t.nombre, COUNT(*) AS cnt
                FROM aromaticas a
                LEFT JOIN tipo_aromaticas t ON t.id = a.aromatica_id
                WHERE a.proveedor_id = ? AND a.carpeta = 'csv_promedio'
                GROUP BY a.aromatica_id, t.nombre ORDER BY t.nombre", [$id]);
            if ($stmtAd) {
                while ($row = sqlsrv_fetch_array($stmtAd, SQLSRV_FETCH_ASSOC)) {
                    $aroDetalle[] = ['id' => (int)$row['aromatica_id'], 'nombre' => $row['nombre'] ?? 'Sin tipo', 'cnt' => (int)$row['cnt']];
                }
            }

            // Also count orphaned samples (NULL proveedor_id) — if any exist, block deletion
            $orphanF = 0; $orphanA = 0;
            $stmtOF = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM mediciones_lab WHERE proveedor_id IS NULL");
            if ($stmtOF) { $rOF = sqlsrv_fetch_array($stmtOF, SQLSRV_FETCH_ASSOC); $orphanF = (int)($rOF['c'] ?? 0); }
            $stmtOA = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM aromaticas WHERE proveedor_id IS NULL");
            if ($stmtOA) { $rOA = sqlsrv_fetch_array($stmtOA, SQLSRV_FETCH_ASSOC); $orphanA = (int)($rOA['c'] ?? 0); }

            $total = $countF + $countA + $orphanF + $orphanA;
            echo json_encode([
                'tiene_muestras' => $total > 0,
                'total'          => $total,
                'frutas'         => $countF,
                'aromaticas'     => $countA,
                'sin_proveedor'  => $orphanF + $orphanA,
                'frutas_detalle' => $frutasDetalle,
                'aro_detalle'    => $aroDetalle
            ]);
            break;
    }
}
