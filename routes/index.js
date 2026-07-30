const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const productController = require('../controllers/productController');

router.get('/', homeController.home);
router.get('/testing', productController.showTestingMenu);
router.get('/testing/clear', productController.clearDatabase);
router.get('/testing/generate', productController.showTestingGeneratePage);
router.post('/testing/generate', productController.generateDummyProducts);
router.get('/register', productController.showRegistration);
router.post('/register', productController.submitRegistration);
router.get('/modify', productController.showModifyList);
router.get('/generate', productController.showGenerateSticker);
router.post('/print', productController.showPrintPage);
router.get('/edit/:id', productController.showEditEntry);
router.post('/edit/:id', productController.submitEditEntry);

module.exports = router;
