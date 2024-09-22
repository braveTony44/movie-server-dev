const USERFEED = require("../models/feedbackSchema");
const mongoose = require("mongoose");
const { error, success } = require("../services/errors");
const nodeCache = require("../services/cacheing");
const cloudinary = require("../services/cloudinary");


const createFeedback = async (req, res) => {
    try {
        const { userName, userEmail, userMessage } = req.body;
        let complainSampleIMG = null;

        // Validation: Ensure all necessary fields are present
        if (!userName || !userEmail || !userMessage) {
            return res.send(error(400, "All fields are required", "create feedback"));
        }


         // Upload file to Cloudinary if present
         if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'feedback_images', // Folder where images will be stored in Cloudinary
                use_filename: true,
                format: 'avif', // Converts image to WebP format
                transformation: [
                    { quality: '70' }   // Reduce quality by 30% (100 - 30 = 70)
                ]
            });
            complainSampleIMG = result.secure_url; // Get the uploaded image URL
        }


        // Save feedback to database (assuming you have a Feedback model)
        const feedback = await USERFEED.create({userName,userEmail,userMessage,complainSampleIMG});
         // Invalidate the cache
         nodeCache.del("getAllFeedback");
        return res.send(success(201, "Feedback submitted successfully", feedback));
    } catch (e) {
        console.error(`Error creating feedback: ${e.message}`);
        return res.send(error(500, "Internal server error", "create feedback"));
    }
};

// get all feedback
const getAllFeedback = async (req, res) => {
    try {
        // Check if feedbacks are cached
        const cachedFeedbacks = nodeCache.get("getAllFeedback");

        if (cachedFeedbacks) {
            // Return cached feedbacks
            return res.send(success(200, "Fetch feedback successfully", cachedFeedbacks));
        }

        // Fetch feedbacks from the database
        const feedbacks = await USERFEED.find();

        if (!feedbacks || feedbacks.length === 0) {
            // Handle case where no feedbacks are found
            return res.send(error(404, "Feedback not found", "getAllFeedback"));
        }

        // Cache the fetched feedbacks
        nodeCache.set("getAllFeedback", feedbacks);

        // Return fetched feedbacks
        return res.send(success(200, "Fetch feedback successfully", feedbacks));
    } catch (e) {
        // Handle any unexpected errors
        return res.send(error(500, e.message, "getAllFeedback"));
    }
};

// delete all feedback
const deleteAllFeedback = async (req,res)=>{
    try {
        const {id} = req.params;

     // Validate if the ID is a valid MongoDB ObjectId
     if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.send(error(400, "Invalid feedback ID", "delete feedback"));
      }

       // Find and delete the movie by ID
    const feedback = await USERFEED.findByIdAndDelete(id).lean();

    // If no movie is found, send a 404 error
    if (!feedback) {
      return res.send(error(404, "Feedback not found", "delete feedback"));
    }

    return res.send(success(200, "Feedback deleted successfully", feedback));
    } catch (e) {
        return res.send(error(500,e.message,"Error deleting"));
    }
}

module.exports = {createFeedback,getAllFeedback,deleteAllFeedback};