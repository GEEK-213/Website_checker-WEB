
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cron = require("node-cron");
const { sendDailyReport } = require("./services/reportService");
const app = express();
const port = process.env.PORT || 5001;


const frontendURL = "https://website-checker-web-one.vercel.app";


app.use(cors({
  origin: frontendURL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());


const urlRoutes = require("./Routes/urlRoutes");



app.use("/api/urls", urlRoutes);

// Optional: add root route
app.get("/", (req, res) => {
  res.send("✅ Website Checker API is running successfully!");
});


app.use("/", urlRoutes);


app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

// // Schedule the daily report at  current server time
// cron.schedule('*/2 * * * *', () => {
//   console.log('Running the scheduled test job every 2 minutes...');
//   sendDailyReport();
// }, {
//   scheduled: true,
//   timezone: "Asia/Kolkata" 
// });