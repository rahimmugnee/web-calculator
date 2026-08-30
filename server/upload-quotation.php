<?php
/**
 * Quotation PDF backup endpoint for Mugnee Calculator (web + Android).
 *
 * Deploy: copy entire server/ folder (or at least this file + quotations/ + config) to your site,
 * e.g. https://calculator.mugnee.com/api/upload-quotation.php
 *
 * POST multipart fields: file (PDF), refNo (string), source ("web"|"android"), generatedAt (ISO string)
 * Header: Authorization: Bearer <api_secret>
 *
 * Response: JSON { "ok": true, "savedAs": "web/filename.pdf" } or { "ok": false, "error": "..." }
 */
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

$configPath = __DIR__ . '/quotation-upload-config.php';
if (!is_readable($configPath)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Server missing quotation-upload-config.php']);
  exit;
}

/** @var array{api_secret:string,storage_dir?:string,max_bytes?:int,allowed_origins?:string[]} $config */
$config = require $configPath;
$secret = (string) ($config['api_secret'] ?? '');
if ($secret === '' || $secret === 'REPLACE_WITH_LONG_RANDOM_STRING') {
  http_response_code(500);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Configure api_secret in quotation-upload-config.php']);
  exit;
}

$storageDir = isset($config['storage_dir']) ? (string) $config['storage_dir'] : (__DIR__ . '/quotations');
$maxBytes = isset($config['max_bytes']) ? (int) $config['max_bytes'] : 40 * 1024 * 1024;
$allowedOrigins = isset($config['allowed_origins']) && is_array($config['allowed_origins'])
  ? $config['allowed_origins']
  : [];

$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($requestOrigin !== '' && $allowedOrigins !== []) {
  if (in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Max-Age: 86400');
  }
} elseif ($requestOrigin !== '' && $allowedOrigins === []) {
  // Same-origin browser uploads send no Origin; if present and list empty, do not reflect (safer).
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/^Bearer\\s+(.+)$/i', $auth, $m) || !hash_equals($secret, trim($m[1]))) {
  http_response_code(401);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

$refNo = isset($_POST['refNo']) ? (string) $_POST['refNo'] : '';
$source = isset($_POST['source']) ? (string) $_POST['source'] : '';
$generatedAt = isset($_POST['generatedAt']) ? (string) $_POST['generatedAt'] : '';

if (!in_array($source, ['web', 'android'], true)) {
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Invalid source']);
  exit;
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Missing file']);
  exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Upload error ' . (string) ($file['error'] ?? '')]);
  exit;
}

if (($file['size'] ?? 0) > $maxBytes) {
  http_response_code(413);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'File too large']);
  exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: '';
if ($mime !== 'application/pdf') {
  http_response_code(400);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Expected application/pdf']);
  exit;
}

function sanitize_ref(string $ref): string
{
  $s = preg_replace('/[^a-zA-Z0-9._-]/', '-', $ref);
  $s = trim((string) $s, '-');
  if ($s === '') {
    $s = 'unknown-ref';
  }
  return substr($s, 0, 160);
}

$baseName = sanitize_ref($refNo);
$dir = rtrim($storageDir, '/\\') . DIRECTORY_SEPARATOR . $source;
if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Cannot create storage directory']);
  exit;
}

$destPath = $dir . DIRECTORY_SEPARATOR . $baseName . '.pdf';
if (is_file($destPath)) {
  $baseName .= '-' . substr(md5($generatedAt . (string) mt_rand()), 0, 10);
  $destPath = $dir . DIRECTORY_SEPARATOR . $baseName . '.pdf';
}

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
  http_response_code(500);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['ok' => false, 'error' => 'Save failed']);
  exit;
}

chmod($destPath, 0640);

$relative = $source . '/' . basename($destPath);
header('Content-Type: application/json; charset=UTF-8');
echo json_encode([
  'ok' => true,
  'savedAs' => $relative,
  'refNo' => $refNo,
  'generatedAt' => $generatedAt,
]);
