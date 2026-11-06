 const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS or ['1.1.1.1', '1.0.0.1'] for Cloudflare
require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/config/database")

connectToDB()


app.listen(3000, () => {
    console.log("Server is running on port 3000")
})