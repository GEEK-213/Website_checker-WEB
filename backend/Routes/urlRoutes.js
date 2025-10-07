const express = require("express");
const router = express.Router();

// --- Controllers ---
const {
  saveUrls,
  getUrls,
  exportUrls,
  importUrls,
  checkSoloWebsite,
  runAllChecks,
  getLatestResults
} = require("../controllers/urlController");

// --- Middleware ---
const upload = require("../middleware/multer");

// --- URL Management Routes ---
router.get("/all", getUrls);           
router.post("/save", saveUrls);        
// --- CSV Routes ---
router.get("/export", exportUrls);    
router.post("/import", upload.single("file"), importUrls); 

// --- Website Checking Routes ---
router.post("/check-solo", checkSoloWebsite);
router.get("/check-all", runAllChecks);    
router.get("/results", getLatestResults);     


router.all("*", (req, res) => {
  res.status(404).json({ message: "Endpoint not found. Please check the URL path." });
});

module.exports = router;
