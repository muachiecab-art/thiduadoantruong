import type { Request, Response } from 'express';
import { createApiApp } from '../server/createApp.js';

let appInstance: ReturnType<typeof createApiApp> | null = null;

function getApp() {
  if (!appInstance) {
    appInstance = createApiApp();
  }
  return appInstance;
}

export default function handler(req: Request, res: Response) {
  try {
    const app = getApp();
    return app(req, res);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Lỗi khởi tạo máy chủ API.';
    res.status(500).json({ error: message });
  }
}
