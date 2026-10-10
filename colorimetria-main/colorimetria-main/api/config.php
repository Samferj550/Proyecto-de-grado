<?php
// api/config.php
sqlsrv_configure("WarningsReturnAsErrors", 0);

$servidor  = "localhost\\SQLEXPRESS";
$basedatos = 'colorimetria';

$connectionInfo = [
    "Database"     => $basedatos,
    "CharacterSet" => "UTF-8",
    "UID"          => "prueba",
    "PWD"          => "prueba"
];

$conn = sqlsrv_connect($servidor, $connectionInfo);

if (!$conn) {
    http_response_code(500);
    echo json_encode([
        'error'   => true,
        'mensaje' => 'No se pudo conectar a SQL Server',
        'detalle' => sqlsrv_errors()
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
