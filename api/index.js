// Vercel serverless entrypoint. All /api/* requests are rewritten here.
// The Express app is exported directly as the Node function handler.
import app from '../server/src/app.js';

export default app;
