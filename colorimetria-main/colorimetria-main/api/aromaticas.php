<?php
// api/aromaticas.php

function handle_aromaticas(string $endpoint, $conn): void {

    switch ($endpoint) {

        case 'kpis_aromaticas':
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $frutaIdAro = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : null;
            $sqlAro = "SELECT l, a, b, hue_angle, chroma, aromatica_id FROM aromaticas WHERE carpeta = 'csv_promedio'";
            $paramsAro = [];
            if ($proveedorId) { $sqlAro .= " AND proveedor_id = ?"; $paramsAro[] = $proveedorId; }
            if ($frutaIdAro)  { $sqlAro .= " AND aromatica_id = ?";      $paramsAro[] = $frutaIdAro; }
            $stmtAll = sqlsrv_query($conn, $sqlAro, $paramsAro);
            if ($stmtAll === false) $stmtAll = ejecutar_consulta($conn, $sqlAro);
            $total = 0; $optimas = 0; $en_proceso = 0; $bajas = 0;
            $acumPorEstado = [];
            while ($f = sqlsrv_fetch_array($stmtAll, SQLSRV_FETCH_ASSOC)) {
                $total++;
                $fid = intval($f['aromatica_id'] ?? 0);
                $nivel = nivelPigmentacionAromatica(
                    floatval($f['l']         ?? 0),
                    floatval($f['a']         ?? 0),
                    floatval($f['b']         ?? 0),
                    floatval($f['hue_angle'] ?? 0),
                    floatval($f['chroma']    ?? 0)
                );
                if ($nivel >= 7)     $optimas++;
                elseif ($nivel >= 4) $en_proceso++;
                else                 $bajas++;

                if ($fid) {
                    $estado = clasificarEstado(
                        floatval($f['l'] ?? 0),
                        floatval($f['a'] ?? 0),
                        floatval($f['b'] ?? 0),
                        $fid, $conn, 'aromaticas'
                    );
                    $num = $estado['numero'];
                    if (!isset($acumPorEstado[$fid][$num])) $acumPorEstado[$fid][$num] = 0;
                    $acumPorEstado[$fid][$num]++;
                }
            }
            echo json_encode([
                'total'      => $total,
                'optimas'    => $optimas,
                'en_proceso' => $en_proceso,
                'bajas'      => $bajas,
                'estados_kpis' => $acumPorEstado
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'tabla_aromaticas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $frutaIdAro = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    id,
                    CONVERT(varchar(19), fecha_carga, 120) AS fecha,
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    imagen_muestra,
                    aromatica_id,
                    archivo_origen,
                    CONVERT(varchar(10), fecha_sesion, 120) AS fecha_sesion,
                    ROUND(l, 2) AS l,
                    ROUND(a, 2) AS a,
                    ROUND(b, 2) AS b,
                    ROUND(chroma, 2) AS chroma,
                    ROUND(hue_angle, 2) AS hue_angle,
                    nm390, nm400, nm410, nm420, nm430, nm440, nm450, nm460, nm470,
                    nm480, nm490, nm500, nm510, nm520, nm530, nm540, nm550, nm560, nm570,
                    nm580, nm590, nm600, nm610, nm620, nm630, nm640, nm650, nm660, nm670,
                    nm680, nm690, nm700, nm710
                FROM aromaticas
                WHERE carpeta = 'csv_promedio'
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            if ($frutaIdAro)  { $sql .= " AND aromatica_id = ?";      $params[] = $frutaIdAro; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                if (isset($fila['fecha'])) {
                    $fila['fecha'] = normalizar_fecha($fila['fecha']);
                }
                $fila['nivel_maduracion'] = nivelPigmentacionAromatica(
                    floatval($fila['l']         ?? 0),
                    floatval($fila['a']         ?? 0),
                    floatval($fila['b']         ?? 0),
                    floatval($fila['hue_angle'] ?? 0),
                    floatval($fila['chroma']    ?? 0)
                );
                $reflectancias = [];
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    $col = "nm$nm";
                    if (isset($fila[$col]) && is_numeric($fila[$col]) && floatval($fila[$col]) > 0) {
                        $reflectancias[] = floatval($fila[$col]);
                    }
                }
                $fila['confianza'] = confianzaAromatica(
                    floatval($fila['l']      ?? 0),
                    floatval($fila['chroma'] ?? 0),
                    $reflectancias
                );
                if ($fila['nivel_maduracion'] >= 7 && floatval($fila['a'] ?? 0) > -10) {
                    $fila['confianza'] = 0;
                    $fila['alerta_falso_optimo'] = true;
                }
                $fidEst = intval($fila['aromatica_id'] ?? 0);
                if ($fidEst) {
                    $est = clasificarEstado(
                        floatval($fila['l'] ?? 0),
                        floatval($fila['a'] ?? 0),
                        floatval($fila['b'] ?? 0),
                        $fidEst, $conn, 'aromaticas'
                    );
                    $fila['estado_id']         = $est['numero'];
                    $fila['estado_nombre']     = $est['nombre'];
                    $fila['estado_color_badge'] = $est['color_badge'];
                    $fila['estado_emoji']       = $est['emoji'];
                }
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    unset($fila["nm$nm"]);
                }
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'evolucion_aromaticas':
            $sql = "
                SELECT nombre_muestra, ROUND(AVG(CAST(l AS FLOAT)), 2) AS promedio_l
                FROM aromaticas
                GROUP BY nombre_muestra
                ORDER BY promedio_l DESC
            ";
            $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'detalle_color_aromaticas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $frutaIdAro = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : null;
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
                FROM aromaticas
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            if ($frutaIdAro)  { $sql .= " AND aromatica_id = ?";      $params[] = $frutaIdAro; }
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

        case 'reflectancias_aromaticas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $frutaIdAro = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    nm390, nm400, nm410, nm420, nm430, nm440, nm450, nm460, nm470,
                    nm480, nm490, nm500, nm510, nm520, nm530, nm540, nm550, nm560, nm570,
                    nm580, nm590, nm600, nm610, nm620, nm630, nm640, nm650, nm660, nm670,
                    nm680, nm690, nm700, nm710
                FROM aromaticas
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            if ($frutaIdAro)  { $sql .= " AND aromatica_id = ?";      $params[] = $frutaIdAro; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                foreach ($row as $key => &$val) {
                    if (!in_array($key, ['nombre_muestra', 'nombre_muestra_personalizado']) && is_numeric($val)) {
                        $val = round(floatval($val), 2);
                    }
                }
                unset($val);
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'archivos_aromaticas':
            $limite = max(1, min(9999, intval($_GET['limite'] ?? 9999)));
            $proveedorId = isset($_GET['proveedor_id']) ? intval($_GET['proveedor_id']) : null;
            $frutaIdAro = isset($_GET['fruta_id']) ? intval($_GET['fruta_id']) : null;
            $sql = "
                SELECT TOP ($limite)
                    nombre_muestra,
                    nombre_muestra_personalizado,
                    archivo_origen
                FROM aromaticas
                WHERE (carpeta IS NULL OR carpeta = 'csv_detalle')
            ";
            $params = [];
            if ($proveedorId) { $sql .= " AND proveedor_id = ?"; $params[] = $proveedorId; }
            if ($frutaIdAro)  { $sql .= " AND aromatica_id = ?";      $params[] = $frutaIdAro; }
            $sql .= " ORDER BY fecha_carga DESC";
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $rows[] = $row;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'subir_imagen_aromaticas':
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
            $carpetaDestino = __DIR__ . '/../uploads/aromaticas/';
            if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0775, true);
            $rutaDestino = $carpetaDestino . $nombreArchivo;
            if (!move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaDestino)) {
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'No se pudo guardar la imagen']);
                break;
            }
            $rutaRelativa = 'uploads/aromaticas/' . $nombreArchivo;
            echo json_encode([
                'error' => false,
                'ruta'  => $rutaRelativa
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'guardar_muestra_aromaticas':
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
                echo json_encode(['error' => true, 'mensaje' => 'Faltan datos obligatorios']);
                break;
            }
            $sql = "UPDATE aromaticas SET imagen_muestra = ?";
            $params = [$rutaImagen];
            if ($nombrePersonalizado !== null) {
                $sql .= ", nombre_muestra_personalizado = ?";
                $params[] = $nombrePersonalizado;
            }
            $sql .= " WHERE id = (SELECT TOP (1) id FROM aromaticas WHERE nombre_muestra = ? ORDER BY fecha_carga DESC)";
            $params[] = $nombreMuestra;
            $stmt = sqlsrv_query($conn, $sql, $params);
            if ($stmt === false) {
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al actualizar', 'detalle' => sqlsrv_errors()]);
                break;
            }
            echo json_encode(['error' => false, 'mensaje' => 'Muestra actualizada correctamente']);
            break;

        case 'muestras_sin_imagen_aromaticas':
            $sql = "SELECT id, nombre_muestra FROM aromaticas WHERE imagen_muestra IS NULL ORDER BY id ASC";
            $stmt = ejecutar_consulta($conn, $sql);
            $rows = [];
            while ($fila = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'subir_imagenes_lote_aromaticas':
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
            $carpetaDestino = __DIR__ . '/../uploads/aromaticas/';
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
                        'ruta'            => 'uploads/aromaticas/' . $nombreArchivo,
                    ];
                }
            }
            echo json_encode([
                'error'    => false,
                'archivos' => $archivos,
                'total'    => count($archivos)
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'guardar_asignaciones_aromaticas':
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
                $sql = "UPDATE aromaticas SET imagen_muestra = ? WHERE id = ?";
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

        case 'importar_csv_aromaticas_promedio':
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
            $mapaAro = [];
            foreach ($encabezados as $i => $col) {
                $lower = strtolower($col);
                if ($lower === 'name') $mapaAro['nombre_muestra'] = $i;
                elseif ($lower === 'l') $mapaAro['l'] = $i;
                elseif ($lower === 'a') $mapaAro['a'] = $i;
                elseif ($lower === 'b') $mapaAro['b'] = $i;
                elseif (preg_match('/^(\d+)nm$/', $col, $m) || preg_match('/^nm(\d+)$/', $col, $m)) {
                    $nm = intval($m[1]);
                    if ($nm >= 390 && $nm <= 710) $mapaAro["nm$nm"] = $i;
                }
            }
            $acumAro = ['l' => 0, 'a' => 0, 'b' => 0];
            $acumNMAro = [];
            for ($nm = 390; $nm <= 710; $nm += 10) $acumNMAro[$nm] = 0;
            $countAro = 0;
            $primerNombreAro = null;
            $filasIndividualesAro = [];
            while (($fila = fgetcsv($handle)) !== false) {
                if (count($fila) < 4) continue;
                $nombre = trim($fila[$mapaAro['nombre_muestra']] ?? '');
                if (empty($nombre)) continue;
                if (!$primerNombreAro) $primerNombreAro = $nombre;
                $lVal = floatval($fila[$mapaAro['l']] ?? 0);
                $aVal = floatval($fila[$mapaAro['a']] ?? 0);
                $bVal = floatval($fila[$mapaAro['b']] ?? 0);
                $acumAro['l'] += $lVal;
                $acumAro['a'] += $aVal;
                $acumAro['b'] += $bVal;
                $nmRowAro = [];
                foreach ($acumNMAro as $nm => $_) {
                    $key = "nm$nm";
                    if (isset($mapaAro[$key])) {
                        $val = $fila[$mapaAro[$key]] ?? 0;
                        $acumNMAro[$nm] += (is_numeric($val) ? floatval($val) : 0);
                        $nmRowAro[$key] = is_numeric($val) ? floatval($val) : null;
                    }
                }
                $filasIndividualesAro[] = [
                    'nombre_muestra' => $nombre,
                    'l' => $lVal, 'a' => $aVal, 'b' => $bVal,
                    'nm' => $nmRowAro
                ];
                $countAro++;
            }
            fclose($handle);
            if ($countAro === 0) {
                http_response_code(400);
                echo json_encode(['error' => true, 'mensaje' => 'CSV sin filas válidas']);
                break;
            }
            $lPromAro = round($acumAro['l'] / $countAro, 4);
            $aPromAro = round($acumAro['a'] / $countAro, 4);
            $bPromAro = round($acumAro['b'] / $countAro, 4);
            $chromaAro    = round(sqrt($aPromAro * $aPromAro + $bPromAro * $bPromAro), 4);
            $hueAngleAro  = round(rad2deg(atan2($bPromAro, $aPromAro)), 4);
            if ($hueAngleAro < 0) $hueAngleAro += 360;
            $deltaEAro    = round(sqrt($lPromAro * $lPromAro + $aPromAro * $aPromAro + $bPromAro * $bPromAro), 4);
            $indColorAro  = ($lPromAro * $bPromAro) != 0 ? round(1000 * $aPromAro / ($lPromAro * $bPromAro), 4) : 0;
            $nombreOriginalAro = $_FILES['csv']['name'];
            if (!empty($_POST['nombre_muestra'])) {
                $nombreMuestraFinalAro = trim($_POST['nombre_muestra']);
            } else {
                $nombreMuestraFinalAro = pathinfo($nombreOriginalAro, PATHINFO_FILENAME);
            }
            $nombreMuestraFinalAro = preg_replace('/\.\d+\.\d+$/', '', $nombreMuestraFinalAro);
            $nombreMuestraFinalAro = preg_replace('/^([a-zA-ZñÑ]+)(\d+)$/', '$1 $2', $nombreMuestraFinalAro);
            $proveedorIdAro = isset($_POST['proveedor_id']) ? intval($_POST['proveedor_id']) : null;
            $frutaIdAro = isset($_POST['fruta_id']) ? intval($_POST['fruta_id']) : null;
            $fechaSesionAro = $_POST['fecha_sesion'] ?? null;
            $rutaImagenAro = null;
            if (isset($_FILES['imagen']) && $_FILES['imagen']['error'] === UPLOAD_ERR_OK) {
                $permitidos = ['image/jpeg', 'image/png', 'image/webp'];
                $tipo = mime_content_type($_FILES['imagen']['tmp_name']);
                if (in_array($tipo, $permitidos) && $_FILES['imagen']['size'] <= 5 * 1024 * 1024) {
                    $ext = match ($tipo) {
                        'image/jpeg' => 'jpg',
                        'image/png'  => 'png',
                        'image/webp' => 'webp',
                    };
                    $nombreSeguro = preg_replace('/[^a-zA-Z0-9_-]/', '_', $nombreMuestraFinalAro);
                    $nombreArchivo = date('Ymd_His') . '_' . $nombreSeguro . '.' . $ext;
                    $carpetaDestino = __DIR__ . '/../uploads/aromaticas/';
                    if (!is_dir($carpetaDestino)) mkdir($carpetaDestino, 0775, true);
                    $rutaDestino = $carpetaDestino . $nombreArchivo;
                    if (move_uploaded_file($_FILES['imagen']['tmp_name'], $rutaDestino)) {
                        $rutaImagenAro = 'uploads/aromaticas/' . $nombreArchivo;
                    }
                }
            }
            $colsAro = "nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                        carpeta, archivo_origen, proveedor_id, aromatica_id, fecha_sesion, n_muestras_sesion";
            $valsAro = [$nombreMuestraFinalAro, $lPromAro, $aPromAro, $bPromAro, $deltaEAro, $chromaAro, $hueAngleAro, $indColorAro,
                        'csv_promedio', $nombreOriginalAro, $proveedorIdAro, $frutaIdAro,
                        $fechaSesionAro ? new DateTime($fechaSesionAro) : null, $countAro];
            if ($rutaImagenAro) {
                $colsAro .= ", imagen_muestra";
                $valsAro[] = $rutaImagenAro;
            }
            $placeholdersAro = array_fill(0, count($valsAro), '?');
            for ($nm = 390; $nm <= 710; $nm += 10) {
                $colsAro .= ", nm$nm";
                $valsAro[] = round($acumNMAro[$nm] / $countAro, 4);
                $placeholdersAro[] = '?';
            }
            $sqlAro = "INSERT INTO aromaticas ($colsAro) VALUES (" . implode(', ', $placeholdersAro) . ")";
            sqlsrv_begin_transaction($conn);
            $stmtAro = sqlsrv_query($conn, $sqlAro, $valsAro);
            if ($stmtAro === false) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al insertar promedio', 'detalle' => sqlsrv_errors()]);
                break;
            }
            $insertColsAro = "nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color, carpeta, archivo_origen, proveedor_id, aromatica_id, fecha_sesion, n_muestras_sesion";
            $insertValsAro = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?'];
            for ($nm = 390; $nm <= 710; $nm += 10) { $insertColsAro .= ", nm$nm"; $insertValsAro[] = '?'; }
            if ($rutaImagenAro) { $insertColsAro .= ", imagen_muestra"; $insertValsAro[] = '?'; }
            $placeholdersIndAro = array_fill(0, count($insertValsAro), '?');
            $sqlIndAro = "INSERT INTO aromaticas ($insertColsAro) VALUES (" . implode(', ', $placeholdersIndAro) . ")";
            $indOkAro = true;
            foreach ($filasIndividualesAro as $fila) {
                $l = $fila['l']; $a = $fila['a']; $b = $fila['b'];
                $chromaInd   = round(sqrt($a * $a + $b * $b), 4);
                $hueAngleInd = round(rad2deg(atan2($b, $a)), 4);
                if ($hueAngleInd < 0) $hueAngleInd += 360;
                $deltaEInd   = round(sqrt($l * $l + $a * $a + $b * $b), 4);
                $indColorInd = ($l * $b) != 0 ? round(1000 * $a / ($l * $b), 4) : 0;
                $paramsAro = [$fila['nombre_muestra'], $l, $a, $b, $deltaEInd, $chromaInd, $hueAngleInd, $indColorInd,
                              'csv_detalle', $nombreOriginalAro, $proveedorIdAro, $frutaIdAro,
                              $fechaSesionAro ? new DateTime($fechaSesionAro) : null, 1];
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    $paramsAro[] = $fila['nm']["nm$nm"] ?? null;
                }
                if ($rutaImagenAro) $paramsAro[] = $rutaImagenAro;
                $stmtAro = sqlsrv_query($conn, $sqlIndAro, $paramsAro);
                if ($stmtAro === false) { $indOkAro = false; break; }
            }
            if (!$indOkAro) {
                sqlsrv_rollback($conn);
                http_response_code(500);
                echo json_encode(['error' => true, 'mensaje' => 'Error al insertar filas individuales', 'detalle' => sqlsrv_errors()]);
            } else {
                sqlsrv_commit($conn);
                echo json_encode([
                    'error'    => false,
                    'mensaje'  => "Promedio calculado de $countAro muestras e insertado correctamente",
                    'n_muestras' => $countAro,
                    'l_prom'   => $lPromAro,
                    'a_prom'   => $aPromAro,
                    'b_prom'   => $bPromAro
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'importar_csv_aromaticas':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                http_response_code(405);
                echo json_encode(['error' => true, 'mensaje' => 'Método no permitido']);
                break;
            }
            $proveedorId = isset($_POST['proveedor_id']) ? intval($_POST['proveedor_id']) : null;
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
                    if ($nm >= 390 && $nm <= 710) {
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
            for ($nm = 390; $nm <= 710; $nm += 10) {
                if (isset($mapa["nm$nm"])) $columnasNM[] = $nm;
            }
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
                $sql = "INSERT INTO aromaticas
                    (nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                     carpeta, archivo_origen, proveedor_id";
                $params = [$nombreMuestra, $l, $a, $b, $deltaE, $chroma, $hueAngle, $indiceColor,
                           'csv_import', $nombreOriginal, $proveedorId];
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

        case 'importar_json_aromaticas':
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
            $proveedorId = isset($input['proveedor_id']) ? intval($input['proveedor_id']) : null;
            $frutaIdInput = isset($input['fruta_id']) ? intval($input['fruta_id']) : null;
            $rows = $input['rows'];
            $asignaciones = $input['asignaciones'] ?? [];
            $nombrePersonalizado = $input['nombre_muestra_personalizado'] ?? null;
            $archivoOrigenGlobal = $input['archivo_origen'] ?? null;
            $fechaSesionGlobal = $input['fecha_sesion'] ?? null;
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
                $sql = "INSERT INTO aromaticas
                    (nombre_muestra, l, a, b, delta_e, chroma, hue_angle, indice_color,
                     carpeta, archivo_origen, proveedor_id, aromatica_id";
                $params = [$nombreMuestra, $l, $a, $b, $deltaE, $chroma, $hueAngle, $indiceColor,
                           'csv_import', $archivoOrigenRow, $proveedorId, $frutaIdInput];
                $nombrePersonalizadoRow = $r['nombre_muestra_personalizado'] ?? $nombrePersonalizado;
                $rutaImg = $asignaciones[strval($idx)] ?? null;
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    $key = 'nm' . $nm;
                    if (isset($r[$key]) && $r[$key] !== '') {
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

        case 'detalle_individual_aromatica':
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
                FROM aromaticas
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
                $fila['nivel_maduracion'] = nivelPigmentacionAromatica(
                    floatval($fila['l']         ?? 0),
                    floatval($fila['a']         ?? 0),
                    floatval($fila['b']         ?? 0),
                    floatval($fila['hue_angle'] ?? 0),
                    floatval($fila['chroma']    ?? 0)
                );
                $reflectancias = [];
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    $col = "nm$nm";
                    if (isset($fila[$col]) && is_numeric($fila[$col]) && floatval($fila[$col]) > 0) {
                        $reflectancias[] = floatval($fila[$col]);
                    }
                }
                $fila['confianza'] = confianzaAromatica(
                    floatval($fila['l']      ?? 0),
                    floatval($fila['chroma'] ?? 0),
                    $reflectancias
                );
                if ($fila['nivel_maduracion'] >= 7 && floatval($fila['a'] ?? 0) > -10) {
                    $fila['confianza'] = 0;
                    $fila['alerta_falso_optimo'] = true;
                }
                for ($nm = 390; $nm <= 710; $nm += 10) {
                    unset($fila["nm$nm"]);
                }
                $rows[] = $fila;
            }
            echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;

        case 'aromaticas_con_datos':
            $sql = "SELECT ta.id, ta.nombre, ta.slug, ta.icono,
                           COUNT(a.id) AS total_registros
                    FROM tipo_aromaticas ta
                    INNER JOIN aromaticas a ON a.aromatica_id = ta.id AND a.carpeta = 'csv_promedio'
                    GROUP BY ta.id, ta.nombre, ta.slug, ta.icono
                    HAVING COUNT(a.id) > 0
                    ORDER BY ta.nombre ASC";
            $stmt = sqlsrv_query($conn, $sql);
            $rows = [];
            while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) $rows[] = $row;
            echo json_encode($rows, JSON_UNESCAPED_UNICODE);
            break;

        case 'eliminar_muestras_aromaticas':
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
            $sqlPaths = "SELECT DISTINCT imagen_muestra FROM aromaticas WHERE id IN ($placeholders)";
            $stmtPaths = sqlsrv_query($conn, $sqlPaths, $ids);
            $pathsAEliminar = [];
            if ($stmtPaths) {
                while ($row = sqlsrv_fetch_array($stmtPaths, SQLSRV_FETCH_ASSOC)) {
                    if (!empty($row['imagen_muestra'])) {
                        $pathsAEliminar[] = $row['imagen_muestra'];
                    }
                }
            }
            $sqlOrigen = "SELECT DISTINCT archivo_origen FROM aromaticas WHERE id IN ($placeholders) AND carpeta = 'csv_promedio'";
            $stmtOrigen = sqlsrv_query($conn, $sqlOrigen, $ids);
            $origenValues = [];
            if ($stmtOrigen) {
                while ($row = sqlsrv_fetch_array($stmtOrigen, SQLSRV_FETCH_ASSOC)) {
                    if (!empty($row['archivo_origen'])) $origenValues[] = $row['archivo_origen'];
                }
            }
            if (!empty($origenValues)) {
                $origenPh = implode(',', array_fill(0, count($origenValues), '?'));
                $sqlExtra = "SELECT id FROM aromaticas WHERE archivo_origen IN ($origenPh) AND carpeta = 'csv_detalle'";
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
            $sql = "DELETE FROM aromaticas WHERE id IN ($placeholders)";
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

        default:
            http_response_code(400);
            echo json_encode(['error'=>true,'mensaje'=>"Endpoint '$endpoint' no existe en aromaticas"], JSON_UNESCAPED_UNICODE);
            break;
    }
}
