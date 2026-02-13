const ContactForm = require("../models/ContactForm");

exports.createContactForm = async (req, res) => {
  try {
    const { name, phone, email, message } = req.body;
    const contactForm = await ContactForm.create({ name, phone, email, message });
    res.status(201).json({success:true,contactForm});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getContactForm=async(req,res)=>{
    try {
        const getdata=await ContactForm.find().sort({ createdAt: -1 });
        res.status(201).json({success:true,getdata});
    } catch (error) {
          res.status(500).json({ message: error.message });
    }
}
