const mongoose= require('mongoose');

async function  connectToDB() {
    try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
}
catch(err) {
    throw new Error("MongoDB connection failed.", { cause: err });
}
}
module.exports=connectToDB;