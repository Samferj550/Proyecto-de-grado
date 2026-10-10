<?php
// Run from browser: http://localhost/colorimetria/api/migrar_proveedor_nulos.php
require_once __DIR__ . '/config.php';
global $conn;

header('Content-Type: text/html; charset=utf-8');
echo '<h2>Migración de proveedores nulos</h2>';

$stmtF = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM mediciones_lab WHERE proveedor_id IS NULL");
$rF = sqlsrv_fetch_array($stmtF, SQLSRV_FETCH_ASSOC);
$nullF = (int)($rF['c'] ?? 0);

$stmtA = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM aromaticas WHERE proveedor_id IS NULL");
$rA = sqlsrv_fetch_array($stmtA, SQLSRV_FETCH_ASSOC);
$nullA = (int)($rA['c'] ?? 0);

echo "<p>Fruta(s) sin proveedor: <strong>$nullF</strong></p>";
echo "<p>Aromática(s) sin proveedor: <strong>$nullA</strong></p>";

if ($nullF === 0 && $nullA === 0) {
    echo '<p style="color:green;">✓ No hay datos sin proveedor.</p>';
    exit;
}

$stmtP = sqlsrv_query($conn, "SELECT COUNT(*) as c FROM proveedores WHERE activo = 1");
$rP = sqlsrv_fetch_array($stmtP, SQLSRV_FETCH_ASSOC);
$numProv = (int)($rP['c'] ?? 0);

if ($numProv === 0) {
    echo '<p style="color:red;">✗ No hay proveedores activos. Crea un proveedor primero.</p>';
    exit;
}

if ($numProv > 1) {
    echo '<p style="color:orange;">⚠ Hay más de 1 proveedor activo. No se puede asignar automáticamente.</p>';
    echo '<p>Elimina los proveedores que no correspondan o asigna manualmente vía SQL.</p>';
    exit;
}

// Only 1 provider — assign all NULL rows to it
$stmtP2 = sqlsrv_query($conn, "SELECT id, nombre FROM proveedores WHERE activo = 1");
$prov = sqlsrv_fetch_array($stmtP2, SQLSRV_FETCH_ASSOC);
$pid = $prov['id'];

$updF = sqlsrv_query($conn, "UPDATE mediciones_lab SET proveedor_id = ? WHERE proveedor_id IS NULL", [$pid]);
$updA = sqlsrv_query($conn, "UPDATE aromaticas SET proveedor_id = ? WHERE proveedor_id IS NULL", [$pid]);

$actF = $updF ? sqlsrv_rows_affected($updF) : 0;
$actA = $updA ? sqlsrv_rows_affected($updA) : 0;

echo "<p style='color:green;'>✓ Se actualizaron <strong>$actF</strong> fruta(s) y <strong>$actA</strong> aromática(s) al proveedor <strong>{$prov['nombre']}</strong>.</p>";
echo '<p>Ahora la eliminación de proveedores estará protegida.</p>';
echo '<p><a href="javascript:window.close()">Cerrar</a></p>';
