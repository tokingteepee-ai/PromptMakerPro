import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const RELEASES_DIR = path.resolve(__dirname, '../../shared/releases');

// GET /releases/:file  -> downloads file if exists in releases dir
router.get('/releases/:file', (req: Request, res: Response) => {
  try {
    const raw = req.params.file || '';
    const fileName = path.basename(raw); // sanitize - prevents path traversal
    const fullPath = path.join(RELEASES_DIR, fileName);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('Not found');
    }
    
    // Only allow .zip and .tar.gz files
    const isZip = fileName.toLowerCase().endsWith('.zip');
    const isTarGz = fileName.toLowerCase().endsWith('.tar.gz');
    
    if (!isZip && !isTarGz) {
      return res.status(403).send('Forbidden');
    }

    res.download(fullPath, fileName, err => {
      if (err) {
        console.error('releases download error', err);
        if (!res.headersSent) res.status(500).send('Server error');
      }
    });
  } catch (err) {
    console.error('releases route error', err);
    return res.status(500).send('Server error');
  }
});

export default router;
