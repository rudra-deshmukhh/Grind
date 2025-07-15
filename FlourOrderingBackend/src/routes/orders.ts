import { Router } from 'express';

const router = Router();

// Placeholder routes - to be implemented
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Orders API - Coming Soon',
    timestamp: new Date(),
  });
});

export default router;