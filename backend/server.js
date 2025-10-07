// Import required packages
const express = require("express");
const cors = require('cors');
require("dotenv").config();


const app = express();
const port = process.env.PORT || 5001;

// --- MIDDLEWARE ---
app.use(cors()); 
app.use(express.json()); 

// --- ROUTES ---
app.use("/api/urls", require("./Routes/urlRoutes"));
app.get('/', (req, res) => {
    res.send('Website Checker API is running!');
});



app.listen(port, () => {
  console.log(` Server is running at http://localhost:${port}`);
});