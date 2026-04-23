import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { savePreferences, getPreferences } from '../controllers/preferences.controller';

const router = Router();

router.post('/', protect, savePreferences);
router.get('/', protect, getPreferences);

export default router;
