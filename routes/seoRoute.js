const express = require("express");
const router = express.Router();
const {
  createSeo,getAllSeo,
  getSeoBySlug,
  updateSeo,
  deleteSeo,
} = require("../controllerS/seoController");
const { authorizationUser,
    authorizationRoles } = require('../middleware/authMiddleware');

// GET ALL SEO (Admin list)
router.route("/getAll").get(authorizationUser,authorizationRoles("admin"),getAllSeo);
router.route("/create").post(authorizationUser,authorizationRoles("admin"),createSeo);
router.route('/get/:slug').get(getSeoBySlug);
router.route('/update/:id').put(authorizationUser,authorizationRoles("admin"),updateSeo);
router.route('/delete/:id').delete(authorizationUser,authorizationRoles("admin"),deleteSeo);


module.exports = router;
