 require('dotenv').config();

 const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS or ['1.1.1.1', '1.0.0.1'] for Cloudflare

 const app = require('./src/app');
const connectToDB= require('./src/config/database');
connectToDB();
const {resume, selfDescription , jobDescription} = require( "./src/services/temp");
const generateInterviewReport= require('./src/services/ai.service');
generateInterviewReport({resume,selfDescription,jobDescription}).catch(error => {
    console.error("Startup interview report generation failed:", error);
});

 app.listen(3000 , () => {
    console.log("Server running on port 3000")
 });
