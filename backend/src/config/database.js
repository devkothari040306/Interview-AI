const mongoose= require('mongoose');

async function  connectToDB() {
    try{
    await mongoose.connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 30_000,
        serverSelectionTimeoutMS: 5_000
    });
    console.log("MongoDB connected successfully");
}
catch(err) {
    throw new Error("MongoDB connection failed.", { cause: err });
}
}
module.exports=connectToDB;