<?php
/**
 * Copy this file to quotation-upload-config.php (same folder) and set a strong secret.
 * quotation-upload-config.php must NOT be committed (see .gitignore).
 */
return [
  /** Must match REACT_APP_QUOTATION_PDF_UPLOAD_API_KEY and Android UPLOAD_API_KEY */
  'api_secret' => 'REPLACE_WITH_LONG_RANDOM_STRING',

  /** Where PDFs are written (must be server-writable). Default: ./quotations next to this script */
  'storage_dir' => __DIR__ . '/quotations',

  /** Max upload size in bytes (default 40 MB) */
  'max_bytes' => 40 * 1024 * 1024,

  /**
   * Optional: CORS allow origins (full URL, no trailing slash). Same-host uploads do not need this.
   * Example: [ 'https://calculator.mugnee.com' ]
   */
  'allowed_origins' => [],
];
