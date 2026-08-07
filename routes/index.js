const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const homeController = require('../controllers/homeController');
const productController = require('../controllers/productController');

const routeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(routeLimiter);

router.get('/', homeController.home);
router.get('/testing', productController.showTestingMenu);
router.get('/testing/clear', productController.clearDatabase);
router.get('/testing/generate', productController.showTestingGeneratePage);
router.post('/testing/generate', productController.generateDummyProducts);
router.get('/register', productController.showRegistration);
router.post('/register', productController.submitRegistration);
router.post('/register/json', productController.submitRegistrationJson);
router.get('/register/success', productController.showRegistrationSuccess);
router.get('/modify', productController.showModifyList);
router.get('/generate', productController.showGenerateSticker);
router.post('/print', productController.showPrintPage);
router.get('/report/select', productController.showReportSelection);
router.post('/report', productController.showReportPage);
router.post('/report/save', productController.saveReport);
router.get('/reports', productController.showReports);
router.get('/reports/:id', productController.showSavedReport);
router.get('/reports/:id/print', productController.showSavedReportPrint);
router.get('/vendors', productController.showVendors);
router.post('/vendors/add', productController.addVendor);
router.get('/vendors/edit/:id', productController.showEditVendor);
router.post('/vendors/edit/:id', productController.submitEditVendor);
router.get('/vendors/delete/:id', productController.deleteVendor);
router.get('/edit/:id', productController.showEditEntry);
router.post('/edit/:id', productController.submitEditEntry);

module.exports = router;
