
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cron = require("node-cron");
const { sendDailyReport } = require("./services/reportService");
const app = express();
const port = process.env.PORT || 5001;


const frontendURL = "https://website-checker-web-one.vercel.app";


app.use(cors()); // Allow all for local dev
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());


const urlRoutes = require("./Routes/urlRoutes");



app.use("/api/urls", urlRoutes);

// Optional: add root route
app.get("/", (req, res) => {
  res.send("✅ Website Checker API is running successfully!");
});


app.use("/api/urls", urlRoutes);
app.use("/api/auth", require("./Routes/authRoutes"));

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

// Schedule the daily report at 9:00 AM IST
cron.schedule('0 9 * * *', () => {
  console.log('Executing daily infrastructure status report (0900 IST)...');
  sendDailyReport();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" 
});