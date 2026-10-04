/**
 * routes/docs.routes.ts
 * Serves the interactive Swagger UI and OpenAPI 3.0 specification.
 */
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

function getSpecPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'src/docs/openapi.yaml'),
    path.resolve(__dirname, '../../src/docs/openapi.yaml'),
    path.resolve(__dirname, '../docs/openapi.yaml'),
    path.resolve(process.cwd(), 'dist/docs/openapi.yaml'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// Serve the raw OpenAPI YAML file
router.get('/spec', (_req: Request, res: Response) => {
  const specPath = getSpecPath();
  if (!specPath) {
    res.status(404).json({ success: false, message: 'OpenAPI specification not found' });
    return;
  }
  res.setHeader('Content-Type', 'text/yaml');
  fs.createReadStream(specPath).pipe(res);
});

// Serve the interactive Swagger UI HTML page
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Whispr Chat API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <link rel="icon" type="image/png" href="https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png" />
  <style>
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { display: none !important; }
    .swagger-ui .info { margin: 24px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`);
});

export default router;
