const Newsletter=require('../models/Newsletter');


exports.createNewsletter=async(req,res)=>{
    try {
        const letter=await Newsletter.create(req.body);

        res.status(201).json({
      success: true,
      letter,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    }
}


exports.getNewsletter=async(req,res)=>{
    try {
        const letter=await Newsletter.find().sort({ createdAt: -1 });

 res.status(201).json({
      success: true,
      letter,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    }
}