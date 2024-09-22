// Import mongoose
const mongoose = require("mongoose");
const dbConnect = async () => {
   try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("DB connection established")
 
   } catch (error) {
    console.error(error.message);    
   }   
};
module.exports = dbConnect;
