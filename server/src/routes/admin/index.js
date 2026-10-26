import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import dashboardRoutes from './dashboard.routes.js';
import productRoutes from './products.routes.js';
import categoryRoutes from './categories.routes.js';
import homepageRoutes from './homepage.routes.js';
import orderRoutes from './orders.routes.js';
import customerRoutes from './customers.routes.js';
import inventoryRoutes from './inventory.routes.js';
import deliveryRoutes from './delivery.routes.js';
import reportRoutes from './reports.routes.js';
import settingsRoutes from './settings.routes.js';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/homepage', homepageRoutes);
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

export default router;
