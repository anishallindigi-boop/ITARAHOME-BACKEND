const express = require('express');
const router = express.Router();
const subCategoryController = require('../controllers/subcategoryController');
const { authorizationUser, authorizationRoles } = require('../middleware/authMiddleware');

router.get('/get', subCategoryController.getAllSubCategories);
router.get('/get/:id', subCategoryController.getSubCategoryById);
router.get('/category/:categoryId', subCategoryController.getSubCategoriesByCategory);

router.post('/create', authorizationUser, authorizationRoles('admin'),subCategoryController.createSubCategory);
router.get('/getAdmin', authorizationUser, authorizationRoles('admin'),subCategoryController.getAdminAllSubCategories);

router.put('/update/:id', authorizationUser, authorizationRoles('admin'),subCategoryController.updateSubCategory);
router.patch('/update/status/:id',authorizationUser, authorizationRoles('admin'), subCategoryController.updateSubCategoryStatus);
router.delete('/delete/:id',authorizationUser, authorizationRoles('admin'), subCategoryController.deleteSubCategory);

module.exports = router;
