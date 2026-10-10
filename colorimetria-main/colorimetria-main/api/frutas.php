<?php
// api/frutas.php

function handle_frutas(string $endpoint, $conn): void {

    switch ($endpoint) {

        case 'kpis_frutas':
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $sqlKpis = "SELECT l, a, b, hue_angle, chroma FROM mediciones_lab WHERE carpeta = 'csv_promedio'";
            $paramsKpis = [];
            if ($proveedorId) { $sqlKpis .= " AND proveedor_id = ?"; $paramsKpis[] = $proveedorId; }
            $stmtAll = sqlsrv_query($conn, $sqlKpis, $paramsKpis);
            if ($stmtAll === false) $stmtAll = ejecutar_consulta($conn, $sqlKpis);
            $total = 0; $optimas = 0; $en_proceso = 0; $no_maduras = 0;
            while ($f = sqlsrv_fetch_array($stmtAll, SQLSRV_FETCH_ASSOC)) {
                $total++;
                $nivel = nivelMaduracionFruta(
                    floatval($f['l']         ?? 0),
                    floatval($f['a']         ?? 0),
                    floatval($f['b']         ?? 0),
                    floatval($f['hue_angle'] ?? 0),
                    floatval($f['chroma']    ?? 0)
                );
                if ($nivel >= 7)     $optimas++;
                elseif ($nivel >= 4) $en_proceso++;
                else                 $no_maduras++;
            }
            echo json_encode([
                'total'      => $total,
                'optimas'    => $optimas,
                'en_proceso' => $en_proceso,
                'no_maduras' => $no_maduras
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'tabla_frutas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    id,
                    CONVERT(varchar(19), fecha_carga, 120) AS fecha,
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    carpeta,
                    imagen_muestra,
                    fruta_id,
                    archivo_origen,
                    CONVERT(varchar(10), fecha_sesion, 120) AS fecha_sesion,
                    ROUND(chroma, 2) AS chroma,
                    ROUND(hue_angle, 2) AS hue_angle,
                    ROUND(l, 2) AS l,
                    ROUND(a, 2) AS a,
                    ROUND(b, 2) AS b,
                    nm380, nm390, nm400, nm410, nm420, nm430, nm440, nm450, nm460, nm470,
                    nm480, nm490, nm500, nm510, nm520, nm530, nm540, nm550, nm560, nm570,
                    nm580, nm590, nm600, nm610, nm620, nm630, nm640, nm650, nm660, nm670,
                    nm680, nm690, nm700, nm710, nm720, nm730, nm740, nm750, nm760, nm770, nm780
                FROM mediciones_lab
                WHERE carpeta = 'csv_promedio'
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);

            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                if (isset($fila['fecha'])) {
                    $fila['fecha'] = normalizar_fecha($fila['fecha']);
                }
                $fila['nivel_maduracion'] = nivelMaduracionFruta(
                    floatval($fila['l']         ?? 0),
                    floatval($fila['a']         ?? 0),
                    floatval($fila['b']         ?? 0),
                    floatval($fila['hue_angle'] ?? 0),
                    floatval($fila['chroma']    ?? 0)
                );
                $reflectancias = [];
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    $col = "nm$nm";
                    if (isset($fila[$col]) && is_numeric($fila[$col]) && floatval($fila[$col]) > 0) {
                        $reflectancias[] = floatval($fila[$col]);
                    }
                }
                $fila['confianza'] = confianzaFruta(
                    floatval($fila['l']      ?? 0),
                    floatval($fila['chroma'] ?? 0),
                    $reflectancias
                );
                if (empty($reflectancias)) {
                    $fila['sin_espectro'] = true;
                }
                if ($fila['nivel_maduracion'] >= 7 && floatval($fila['a'] ?? 0) < 14) {
                    $fila['confianza'] = 0;
                    $fila['alerta_falso_optimo'] = true;
                }
                $fidEst = intval($fila['fruta_id'] ?? 1);
                if ($fidEst) {
                    $est = clasificarEstado(
                        floatval($fila['l'] ?? 0),
                        floatval($fila['a'] ?? 0),
                        floatval($fila['b'] ?? 0),
                        $fidEst, $conn, 'frutas'
                    );
                    $fila['estado_id']         = $est['numero'];
                    $fila['estado_nombre']     = $est['nombre'];
                    $fila['estado_color_badge'] = $est['color_badge'];
                }
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    unset($fila["nm$nm"]);
                }
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'detalle_color_frutas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    ROUND(l, 2) AS l,
                    ROUND(a, 2) AS a,
                    ROUND(b, 2) AS b,
                    ROUND(delta_e, 2) AS delta_e,
                    ROUND(hue_angle, 2) AS hue_angle,
                    ROUND(chroma, 2) AS chroma,
                    CONVERT(varchar(19), fecha_carga, 120) AS fecha
                FROM mediciones_lab
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                if (isset($row['fecha'])) $row['fecha'] = normalizar_fecha($row['fecha']);
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'reflectancias_frutas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    nm380, nm390, nm400, nm410, nm420, nm430, nm440, nm450, nm460, nm470,
                    nm480, nm490, nm500, nm510, nm520, nm530, nm540, nm550, nm560, nm570,
                    nm580, nm590, nm600, nm610, nm620, nm630, nm640, nm650, nm660, nm670,
                    nm680, nm690, nm700, nm710, nm720, nm730, nm740, nm750, nm760, nm770, nm780
                FROM mediciones_lab
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                foreach ($row as $key => &$val) {
                    if (!in_array($key, ['nombre_muestra', 'nombre_muestra_personalizado'])) {
                        $val = ($val !== null && is_numeric($val)) ? round(floatval($val), 2) : null;
                    }
                }
                unset($val);
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'archivos_frutas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    archivo_origen
                FROM mediciones_lab
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'subir_imagen_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'No se recibió ninguna imagen válida']);
                break;
            }
            $permitidos = ['image/jpeg', 'image/png', 'image/webp'];
            $tipo = mime_content_type($_FILES['imagen']['tmp_name']);
            if (!in_array($tipo, $permitidos)) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'Formato de imagen no permitido']);
                break;
            }
            if ($_FILES['imagen']['size'] > 5 * 1024 * 1024) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'La imagen supera el tamaño máximo (5MB)']);
                break;
            }
            $extension = match ($tipo) {
                'image/jpeg' => 'jpg',
                'image/png'  => 'png',
                'image/webp' => 'webp',
            };
            $nombreSeguro = preg_replace('/[^a-zA-Z0-9_-]/', '_', $_POST['nombre_muestra'] ?? 'muestra');
            $nombreArchivo = date('Ymd_His') . '_' . $nombreSeguro . '.' . $extension;
            $carpetaDestino = __DIR__ . '/../uploads/frutas/';
            if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0775, true);
            $rutaDestino = $carpetaDestino . $nombreArchivo;
            if (!move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaDestino)) {
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'No se pudo guardar la imagen']);
                break;
            }
            $rutaRelativa = 'uploads/frutas/' . $nombreArchivo;
            echo json_encode([
                'error' => false,
                'ruta'  => $rutaRelativa
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'guardar_muestra_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            $datos = json_decode(file_get_contents('php://input'), true);
            $nombreMuestra = $datos['nombre_muestra'] ?? null;
            $rutaImagen    = $datos['imagen_muestra'] ?? null;
            $nombrePersonalizado = $datos['nombre_muestra_personalizado'] ?? null;
            if (!$nombreMuestra || !$rutaImagen) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'Faltan datos obligatorios (nombre_muestra, imagen_muestra)']);
                break;
            }
            $sql = "UPDATE mediciones_lab SET imagen_muestra = ?";
            $params = [$rutaImagen];
            if ($nombrePersonalizado !== null) {
                $sql .= ", nombre_muestra_personalizado = ?";
                $params[] = $nombrePersonalizado;
            }
            $sql .= " WHERE id = (SELECT TOP (1) id FROM mediciones_lab WHERE nombre_muestra = ? ORDER BY fecha_carga DESC)";
            $params[] = $nombreMuestra;
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al actualizar', 'detalle' => sqlsrv_errors()]);
                break;
            }
            echo json_encode(['error' => false, 'mensaje' => 'Muestra actualizada correctamente']);
            break;

        case 'muestras_sin_imagen_fruta':
            $sql = "SELECT id, nombre_muestra FROM mediciones_lab WHERE imagen_muestra IS NULL ORDER BY id ASC";
            $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'subir_imagenes_lote_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            if (!isset($_FILES['imagenes'])) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'No se recibieron imágenes']);
                break;
            }
            $archivos = [];
            $total = count($_FILES['imagenes']['name']);
            $permitidos = ['image/jpeg', 'image/png', 'image/webp'];
            $carpetaDestino = __DIR__ . '/../uploads/frutas/';
            if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0775, true);
            for ($i = 0; $i < $total; $i++) {
                if ($_FILES['imagenes']['error'][$i] !== UPLOAD_ERR_OK) continue;
                $tipo = mime_content_type($_FILES['imagenes']['tmp_name'][$i]);
                if (!in_array($tipo, $permitidos)) continue;
                if ($_FILES['imagenes']['size'][$i] > 5 * 1024 * 1024) continue;
                $nombreOriginal = $_FILES['imagenes']['name'][$i];
                $extension = match ($tipo) {
                    'image/jpeg' => 'jpg',
                    'image/png'  => 'png',
                    'image/webp' => 'webp',
                };
                $nombreSeguro = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($nombreOriginal, PATHINFO_FILENAME));
                $nombreArchivo = date('Ymd_His') . '_' . $nombreSeguro . '.' . $extension;
                $rutaDestino = $carpetaDestino . $nombreArchivo;
                if (move_uploaded_file($_FILES['imagenes']['tmp_name'][$i], $rutaDestino)) {
                    $archivos[] = [
                        'nombre_original' => $nombreOriginal,
                        'nombre_archivo'  => $nombreArchivo,
                        'ruta'            => 'uploads/frutas/' . $nombreArchivo,
                    ];
                }
            }
            echo json_encode([
                'error'    => false,
                'archivos' => $archivos,
                'total'    => count($archivos)
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'guardar_asignaciones_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            $datos = json_decode(file_get_contents('php://input'), true);
            if (!is_array($datos) || empty($datos)) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'No se recibieron asignaciones']);
                break;
            }
            $errores = 0;
            $actualizados = 0;
            sqlsrv_begin_transaction($conn);
            foreach ($datos as $asignacion) {
                $id = $asignacion['id'] ?? null;
                $ruta = $asignacion['ruta_imagen'] ?? null;
                if (!$id || !$ruta) { $errores++; continue; }
                $sql = "UPDATE mediciones_lab SET imagen_muestra = ? WHERE id = ?";
                $stmt = sqlsrv_query($conn, $sql, [$ruta, $id]);
                if ($stmt === false) { $errores++; }
                else { $actualizados++; }
            }
            if ($errores > 0) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode([
                    'error'    => true,
                    'mensaje'  => "Error al guardar asignaciones",
                    'detalle'  => "$actualizados actualizados, $errores errores"
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            } else {
                sqlsrv_commit($conn);
                echo json_encode([
                    'error'   => false,
                    'mensaje' => "$actualizados muestras actualizadas correctamente"
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            break;

        case 'importar_csv_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'No se recibió ningún archivo CSV válido']);
                break;
            }
            $rutaTemp = $_FILES['csv']['tmp_name'];
            $nombreOriginal = $_FILES['csv']['name'];
            $handle = fopen($rutaTemp, 'r');
            if (!$handle) {
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'No se pudo leer el archivo CSV']);
                break;
            }
            $encabezados = fgetcsv($handle);
            if (!$encabezados) {
                fclose($handle);
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'CSV vacío o sin encabezados']);
                break;
            }
            $encabezados = array_map('trim', $encabezados);
            $mapa = [];
            foreach ($encabezados as $i => $col) {
                $lower = strtolower($col);
                if ($lower === 'name') { $mapa['nombre_muestra'] = $i; }
                elseif ($lower === 'l') { $mapa['l'] = $i; }
                elseif ($lower === 'a') { $mapa['a'] = $i; }
                elseif ($lower === 'b') { $mapa['b'] = $i; }
                elseif (preg_match('/^(\d+)nm$/', $col, $m) || preg_match('/^nm(\d+)$/', $col, $m)) {
                    $nm = intval($m[1]);
                    if ($nm >= 380 && $nm <= 780) {
                        $mapa["nm$nm"] = $i;
                    }
                }
            }
            if (!isset($mapa['nombre_muestra'], $mapa['l'], $mapa['a'], $mapa['b'])) {
                fclose($handle);
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'CSV debe tener columnas: name, L, a, b']);
                break;
            }
            $insertados = 0;
            $errores = 0;
            sqlsrv_begin_transaction($conn);
            $columnasNM = [];
            for ($nm = 380; $nm <= 780; $nm += 10) {
                if (isset($mapa["nm$nm"])) $columnasNM[] = $nm;
            }
            $proveedorId  = isset($_POST['proveedor_id'])  ? intval($_POST['proveedor_id'])  : null;
            $frutaId      = isset($_POST['fruta_id'])       ? intval($_POST['fruta_id'])      : null;
            $fechaSesion  = $_POST['fecha_sesion']  ?? null;
            $nMuestras    = isset($_POST['n_muestras']) ? intval($_POST['n_muestras']) : null;
            while (($fila = fgetcsv($handle)) !== false) {
                if (count($fila) < 4) { $errores++; continue; }
                $nombreMuestra = trim($fila[$mapa['nombre_muestra']] ?? '');
                $l = floatval($fila[$mapa['l']] ?? 0);
                $a = floatval($fila[$mapa['a']] ?? 0);
                $b = floatval($fila[$mapa['b']] ?? 0);
                if (empty($nombreMuestra)) { $errores++; continue; }
                $chroma = round(sqrt($a * $a + $b * $b), 4);
                $hueAngle = round(rad2deg(atan2($b, $a)), 4);
                if ($hueAngle < 0) $hueAngle += 360;
                $deltaE = round(sqrt($l * $l + $a * $a + $b * $b), 4);
                $indiceColor = ($l * $b) != 0 ? round(1000 * $a / ($l * $b), 4) : 0;
                $sql = "INSERT INTO mediciones_lab
                    (nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                     carpeta, archivo_origen, proveedor_id, fruta_id, fecha_sesion, n_muestras_sesion";
                $params = [$nombreMuestra, $l, $a, $b, $deltaE, $chroma, $hueAngle, $indiceColor,
                           'csv_import', $nombreOriginal, $proveedorId, $frutaId,
                           $fechaSesion ? new DateTime($fechaSesion) : null,
                           $nMuestras];
                foreach ($columnasNM as $nm) {
                    $sql .= ", nm$nm";
                    $val = isset($fila[$mapa["nm$nm"]]) && $fila[$mapa["nm$nm"]] !== ''
                        ? floatval($fila[$mapa["nm$nm"]]) : null;
                    $params[] = $val;
                }
                $sql .= ") VALUES (" . implode(', ', array_fill(0, count($params), '?')) . ")";
                $stmt = sqlsrv_query($conn, $sql, $params);
                if ($stmt === false) { $errores++; }
                else { $insertados++; }
            }
            fclose($handle);
            if ($errores > 0 && $insertados === 0) {
                sqlsrv_rollback($conn);
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => "No se pudo importar ningún registro ($errores errores)"]);
            } else {
                if ($errores > 0) {
                    sqlsrv_commit($conn);
                    echo json_encode([
                        'error'   => false,
                        'mensaje' => "Importados $insertados registros ($errores omitidos por errores)"
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                } else {
                    sqlsrv_commit($conn);
                    echo json_encode([
                        'error'   => false,
                        'mensaje' => "$insertados registros importados correctamente"
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
            }
            break;

        case 'importar_csv_fruta_promedio':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'POST requerido']);
                break;
            }
            $rutaTemp = $_FILES['csv']['tmp_name'] ?? null;
            if (!$rutaTemp) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'CSV no recibido']);
                break;
            }
            $handle = fopen($rutaTemp, 'r');
            $encabezados = array_map('trim', fgetcsv($handle));
            $mapa = [];
            foreach ($encabezados as $i => $col) {
                $lower = strtolower($col);
                if ($lower === 'name') $mapa['nombre_muestra'] = $i;
                elseif ($lower === 'l') $mapa['l'] = $i;
                elseif ($lower === 'a') $mapa['a'] = $i;
                elseif ($lower === 'b') $mapa['b'] = $i;
                elseif (preg_match('/^(\d+)nm$/', $col, $m) || preg_match('/^nm(\d+)$/', $col, $m)) {
                    $nm = intval($m[1]);
                    if ($nm >= 380 && $nm <= 780) $mapa["nm$nm"] = $i;
                }
            }
            $acum = ['l' => 0, 'a' => 0, 'b' => 0];
            $acumNM = [];
            for ($nm = 380; $nm <= 780; $nm += 10) $acumNM[$nm] = 0;
            $count = 0;
            $primerNombre = null;
            $filasIndividuales = [];
            while (($fila = fgetcsv($handle)) !== false) {
                if (count($fila) < 4) continue;
                $nombre = trim($fila[$mapa['nombre_muestra']] ?? '');
                if (empty($nombre)) continue;
                if (!$primerNombre) $primerNombre = $nombre;
                $lVal = floatval($fila[$mapa['l']] ?? 0);
                $aVal = floatval($fila[$mapa['a']] ?? 0);
                $bVal = floatval($fila[$mapa['b']] ?? 0);
                $acum['l'] += $lVal;
                $acum['a'] += $aVal;
                $acum['b'] += $bVal;
                $nmRow = [];
                foreach ($acumNM as $nm => $_) {
                    $key = "nm$nm";
                    if (isset($mapa[$key])) {
                        $val = $fila[$mapa[$key]] ?? 0;
                        $acumNM[$nm] += (is_numeric($val) ? floatval($val) : 0);
                        $nmRow[$key] = is_numeric($val) ? floatval($val) : null;
                    }
                }
                $filasIndividuales[] = [
                    'nombre_muestra' => $nombre,
                    'l' => $lVal, 'a' => $aVal, 'b' => $bVal,
                    'nm' => $nmRow
                ];
                $count++;
            }
            fclose($handle);
            if ($count === 0) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'CSV sin filas válidas']);
                break;
            }
            $lProm = round($acum['l'] / $count, 4);
            $aProm = round($acum['a'] / $count, 4);
            $bProm = round($acum['b'] / $count, 4);
            $chroma    = round(sqrt($aProm * $aProm + $bProm * $bProm), 4);
            $hueAngle  = round(rad2deg(atan2($bProm, $aProm)), 4);
            if ($hueAngle < 0) $hueAngle += 360;
            $deltaE    = round(sqrt($lProm * $lProm + $aProm * $aProm + $bProm * $bProm), 4);
            $indColor  = ($lProm * $bProm) != 0 ? round(1000 * $aProm / ($lProm * $bProm), 4) : 0;
            $nombreOriginal = $_FILES['csv']['name'];
            if (!empty($_POST['nombre_muestra'])) {
                $nombreMuestraFinal = trim($_POST['nombre_muestra']);
            } else {
                $nombreMuestraFinal = pathinfo($nombreOriginal, PATHINFO_FILENAME);
            }
            $nombreMuestraFinal = preg_replace('/\.\d+\.\d+$/', '', $nombreMuestraFinal);
            $nombreMuestraFinal = preg_replace('/^([a-zA-ZñÑ]+)(\d+)$/', '$1 $2', $nombreMuestraFinal);
            $proveedorId = isset($_POST['proveedor_id']) ? intval($_POST['proveedor_id']) : null;
            $frutaId     = isset($_POST['fruta_id'])     ? intval($_POST['fruta_id'])     : null;
            $fechaSesion = $_POST['fecha_sesion'] ?? null;
            $rutaImagen = null;
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
                $permitidos = ['image/jpeg', 'image/png', 'image/webp'];
                $tipo = mime_content_type($_FILES['imagen']['tmp_name']);
                if (in_array($tipo, $permitidos) && $_FILES['imagen']['size'] <= 5 * 1024 * 1024) {
                    $ext = match ($tipo) {
                        'image/jpeg' => 'jpg',
                        'image/png'  => 'png',
                        'image/webp' => 'webp',
                    };
                    $nombreSeguro = preg_replace('/[^a-zA-Z0-9_-]/', '_', $nombreMuestraFinal);
                    $nombreArchivo = date('Ymd_His') . '_' . $nombreSeguro . '.' . $ext;
                    $carpetaDestino = __DIR__ . '/../uploads/frutas/';
                    if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0775, true);
                    $rutaDestino = $carpetaDestino . $nombreArchivo;
                    if (move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaDestino)) {
                        $rutaImagen = 'uploads/frutas/' . $nombreArchivo;
                    }
                }
            }
            $cols = "nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                     carpeta, archivo_origen, proveedor_id, fruta_id, fecha_sesion, n_muestras_sesion";
            $vals = [$nombreMuestraFinal, $lProm, $aProm, $bProm, $deltaE, $chroma, $hueAngle, $indColor,
                     'csv_promedio', $nombreOriginal, $proveedorId, $frutaId,
                     $fechaSesion ? new DateTime($fechaSesion) : null, $count];
            if ($rutaImagen) {
                $cols .= ", imagen_muestra";
                $vals[] = $rutaImagen;
            }
            $placeholders = array_fill(0, count($vals), '?');
            for ($nm = 380; $nm <= 780; $nm += 10) {
                $cols .= ", nm$nm";
                $vals[] = round($acumNM[$nm] / $count, 4);
                $placeholders[] = '?';
            }
            $sql = "INSERT INTO mediciones_lab ($cols) VALUES (" . implode(', ', $placeholders) . ")";
            sqlsrv_begin_transaction($conn);
            $stmt = sqlsrv_query($conn, $sql, $vals);
            if ($stmt === false) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al insertar promedio', 'detalle' => sqlsrv_errors()]);
                break;
            }
            $insertCols = "nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color, carpeta, archivo_origen, proveedor_id, fruta_id, fecha_sesion, n_muestras_sesion";
            $insertVals = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
            for ($nm = 380; $nm <= 780; $nm += 10) { $insertCols .= ", nm$nm"; $insertVals[] = '?'; }
            if ($rutaImagen) { $insertCols .= ", imagen_muestra"; $insertVals[] = '?'; }
            $placeholdersInd = array_fill(0, count($insertVals), '?');
            $sqlInd = "INSERT INTO mediciones_lab ($insertCols) VALUES (" . implode(', ', $placeholdersInd) . ")";
            $indOk = true;
            foreach ($filasIndividuales as $fila) {
                $l = $fila['l']; $a = $fila['a']; $b = $fila['b'];
                $chromaInd   = round(sqrt($a * $a + $b * $b), 4);
                $hueAngleInd = round(rad2deg(atan2($b, $a)), 4);
                if ($hueAngleInd < 0) $hueAngleInd += 360;
                $deltaEInd   = round(sqrt($l * $l + $a * $a + $b * $b), 4);
                $indColorInd = ($l * $b) != 0 ? round(1000 * $a / ($l * $b), 4) : 0;
                $params = [$fila['nombre_muestra'], $l, $a, $b, $deltaEInd, $chromaInd, $hueAngleInd, $indColorInd,
                           'csv_detalle', $nombreOriginal, $proveedorId, $frutaId,
                           $fechaSesion ? new DateTime($fechaSesion) : null, 1];
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    $params[] = $fila['nm']["nm$nm"] ?? null;
                }
                if ($rutaImagen) $params[] = $rutaImagen;
                $stmt = sqlsrv_query($conn, $sqlInd, $params);
                if ($stmt === false) { $indOk = false; break; }
            }
            if (!$indOk) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al insertar filas individuales', 'detalle' => sqlsrv_errors()]);
            } else {
                sqlsrv_commit($conn);
                echo json_encode([
                    'error'    => false,
                    'mensaje'  => "Promedio calculado de $count muestras e insertado correctamente",
                    'n_muestras' => $count,
                    'l_prom'   => $lProm,
                    'a_prom'   => $aProm,
                    'b_prom'   => $bProm
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'importar_json_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['rows']) || !is_array($input['rows'])) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'JSON inválido: se requiere rows[]']);
                break;
            }
            $rows = $input['rows'];
            $asignaciones = $input['asignaciones'] ?? [];
            $nombrePersonalizado = $input['nombre_muestra_personalizado'] ?? null;
            $archivoOrigenGlobal = $input['archivo_origen'] ?? null;
            $fechaSesionGlobal = $input['fecha_sesion'] ?? null;
            $proveedorId = isset($input['proveedor_id']) ? intval($input['proveedor_id']) : null;
            $insertados = 0;
            $errores = 0;
            sqlsrv_begin_transaction($conn);
            foreach ($rows as $idx => $r) {
                $nombreMuestra = trim($r['nombre_muestra'] ?? '');
                $l = floatval($r['l'] ?? 0);
                $a = floatval($r['a'] ?? 0);
                $b = floatval($r['b'] ?? 0);
                if (empty($nombreMuestra)) { $errores++; continue; }
                $chroma = round(sqrt($a * $a + $b * $b), 4);
                $hueAngle = round(rad2deg(atan2($b, $a)), 4);
                if ($hueAngle < 0) $hueAngle += 360;
                $deltaE = round(sqrt($l * $l + $a * $a + $b * $b), 4);
                $indiceColor = ($l * $b) != 0 ? round(1000 * $a / ($l * $b), 4) : 0;
                $archivoOrigenRow = $r['archivo_origen'] ?? $archivoOrigenGlobal ?? 'csv_import';
                $fechaSesionRow = $r['fecha_sesion'] ?? $fechaSesionGlobal;
                $sql = "INSERT INTO mediciones_lab
                    (nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                     carpeta, archivo_origen, proveedor_id";
                $params = [$nombreMuestra, $l, $a, $b, $deltaE, $chroma, $hueAngle, $indiceColor,
                           'csv_import', $archivoOrigenRow, $proveedorId];
                $nombrePersonalizadoRow = $r['nombre_muestra_personalizado'] ?? $nombrePersonalizado;
                $rutaImg = $asignaciones[strval($idx)] ?? null;
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    $key = 'nm' . $nm;
                    if (array_key_exists($key, $r) && $r[$key] !== '' && $r[$key] !== null) {
                        $sql .= ", $key";
                        $params[] = floatval($r[$key]);
                    }
                }
                if ($rutaImg) {
                    $sql .= ", imagen_muestra";
                    $params[] = $rutaImg;
                }
                if (!empty($nombrePersonalizadoRow)) {
                    $sql .= ", nombre_muestra_personalizado";
                    $params[] = $nombrePersonalizadoRow;
                }
                if (!empty($fechaSesionRow)) {
                    $sql .= ", fecha_sesion";
                    $params[] = $fechaSesionRow;
                }
                $sql .= ") VALUES (" . implode(', ', array_fill(0, count($params), '?')) . ")";
                $stmt = sqlsrv_query($conn, $sql, $params);
                if ($stmt === false) { $errores++; }
                else { $insertados++; }
            }
            if ($errores > 0 && $insertados === 0) {
                sqlsrv_rollback($conn);
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => "No se pudo importar ningún registro ($errores errores)"]);
            } else {
                if ($errores > 0) {
                    sqlsrv_commit($conn);
                    echo json_encode([
                        'error'   => false,
                        'mensaje' => "Importados $insertados registros ($errores omitidos por errores)"
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                } else {
                    sqlsrv_commit($conn);
                    echo json_encode([
                        'error'   => false,
                        'mensaje' => "$insertados registros importados correctamente"
                    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                }
            }
            break;

        case 'eliminar_muestras_fruta':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            $input = json_decode(file_get_contents('php://input'), true);
            $ids = $input['ids'] ?? [];
            if (!is_array($ids) || empty($ids)) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'No se recibieron IDs válidos']);
                break;
            }
            $ids = array_map('intval', $ids);
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $sqlPaths = "SELECT DISTINCT imagen_muestra FROM mediciones_lab WHERE id IN ($placeholders)";
            $stmtPaths = sqlsrv_query($conn, $sqlPaths, $ids);
            $pathsAEliminar = [];
            if ($stmtPaths) {
                while ($row = sqlsrv_fetch_array($stmtPaths, SQLSRV_FETCH_ASSOC)) {
                    if (!empty($row['imagen_muestra'])) {
                        $pathsAEliminar[] = $row['imagen_muestra'];
                    }
                }
            }
            $sqlOrigen = "SELECT DISTINCT archivo_origen FROM mediciones_lab WHERE id IN ($placeholders) AND carpeta = 'csv_promedio'";
            $stmtOrigen = sqlsrv_query($conn, $sqlOrigen, $ids);
            $origenValues = [];
            if ($stmtOrigen) {
                while ($row = sqlsrv_fetch_array($stmtOrigen, SQLSRV_FETCH_ASSOC)) {
                    if (!empty($row['archivo_origen'])) $origenValues[] = $row['archivo_origen'];
                }
            }
            if (!empty($origenValues)) {
                $origenPh = implode(',', array_fill(0, count($origenValues), '?'));
                $sqlExtra = "SELECT id FROM mediciones_lab WHERE archivo_origen IN ($origenPh) AND carpeta = 'csv_detalle'";
                $stmtExtra = sqlsrv_query($conn, $sqlExtra, $origenValues);
                if ($stmtExtra) {
                    while ($row = sqlsrv_fetch_array($stmtExtra, SQLSRV_FETCH_ASSOC)) {
                        $ids[] = intval($row['id']);
                    }
                }
                $ids = array_unique($ids);
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
            }
            set_time_limit(30);
            sqlsrv_begin_transaction($conn);
            $sql = "DELETE FROM mediciones_lab WHERE id IN ($placeholders)";
            $options = ['QueryTimeout' => 15];
            $stmt = sqlsrv_query($conn, $sql, array_values($ids), $options);
            if ($stmt === false) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al eliminar', 'detalle' => sqlsrv_errors()]);
                break;
            }
            $eliminadas = sqlsrv_rows_affected($stmt);
            sqlsrv_commit($conn);
            foreach ($pathsAEliminar as $path) {
                eliminarImagenSiHuérfana($path, $conn);
            }
            echo json_encode([
                'error'   => false,
                'mensaje' => "$eliminadas muestra(s) eliminada(s) correctamente"
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'detalle_individual_fruta':
            $archivoOrigen = $_GET['archivo_origen'] ?? '';
            if (empty($archivoOrigen)) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'archivo_origen es requerido']);
                break;
            }
            $sql = "
                SELECT
                    id,
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    ROUND(l, 2) AS l,
                    ROUND(a, 2) AS a,
                    ROUND(b, 2) AS b,
                    ROUND(chroma, 2) AS chroma,
                    ROUND(hue_angle, 2) AS hue_angle,
                    ROUND(delta_e, 2) AS delta_e,
                    CONVERT(varchar(19), fecha_carga, 120) AS fecha
                FROM mediciones_lab
                WHERE archivo_origen = ? AND carpeta = 'csv_detalle'
                ORDER BY nombre_muestra ASC
            ";
            $stmt = sqlsrv_query($conn, $sql, [$archivoOrigen]);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                if (isset($fila['fecha'])) {
                    $fila['fecha'] = normalizar_fecha($fila['fecha']);
                }
                $fila['nivel_maduracion'] = nivelMaduracionFruta(
                    floatval($fila['l']         ?? 0),
                    floatval($fila['a']         ?? 0),
                    floatval($fila['b']         ?? 0),
                    floatval($fila['hue_angle'] ?? 0),
                    floatval($fila['chroma']    ?? 0)
                );
                $reflectancias = [];
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    $col = "nm$nm";
                    if (isset($fila[$col]) && is_numeric($fila[$col]) && floatval($fila[$col]) > 0) {
                        $reflectancias[] = floatval($fila[$col]);
                    }
                }
                $fila['confianza'] = confianzaFruta(
                    floatval($fila['l']      ?? 0),
                    floatval($fila['chroma'] ?? 0),
                    $reflectancias
                );
                if ($fila['nivel_maduracion'] >= 7 && floatval($fila['a'] ?? 0) < 14) {
                    $fila['confianza'] = 0;
                    $fila['alerta_falso_optimo'] = true;
                }
                for ($nm = 380; $nm <= 780; $nm += 10) {
                    unset($fila["nm$nm"]);
                }
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'frutas_con_datos':
            $sql = "SELECT tf.id, tf.nombre, tf.slug, tf.icono,
                           COUNT(ml.id) AS total_registros
                    FROM tipo_frutas tf
                    INNER JOIN mediciones_lab ml ON ml.fruta_id = tf.id AND ml.carpeta = 'csv_promedio'
                    GROUP BY tf.id, tf.nombre, tf.slug, tf.icono
                    HAVING COUNT(ml.id) > 0
                    ORDER BY tf.nombre ASC";
            $stmt = sqlsrv_query($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(400);
            echo json_encode(['error'=>true,'mensaje'=>"Endpoint '$endpoint' no existe en frutas"], JSON_UNESCAPED_UNICODE);
            break;
    }
}
