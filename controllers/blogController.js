const Blog = require('../models/Blog');
const BlogCategory=require('../models/BlogCategory');
const { default: slugify } = require('slugify');

//-----------------------------create blog----------------------------------

exports.createBlog = async (req, res) => {

    try {

        const { title, content, metatitle, metadescription, metakeywords,category,slug,image} = req.body;
     const author=req.user._id;


        // Validate incoming data
        if (!title || !content || !image) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Create a new blog post
        const blog = new Blog({
            title,
            content,
            metatitle,
            metadescription,
            metakeywords,
            image,
            slug,
            author,
            category,
         
        });

        // Save the blog to the database
        await blog.save();

        return res.status(201).json({
            message: 'Blog post created successfully!',
            blog
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create blog post', error: error.message });
    }
}



//-----------------------------get all blogs----------------------------------

exports.getAllBlogs = async (req, res, next) => {
    try {
        const blogs = await Blog.find().populate('author', 'name').populate('category', 'name slug').sort({ createdAt: -1 });
        res.status(200).json(blogs);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ message: error.message });
    }
};



//----------------------------------get blog by category--------------------------


exports.getBlogByCategory = async (req, res) => {
    const slug  = req.params.id;


    try {
        // Step 1: Find the category based on the slug
        const category = await BlogCategory.findOne({ slug: slug });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Step 2: Find all blogs that belong to this category
        const blogs = await Blog.find({ category: category._id })
            .populate('author', 'username')
            .populate('category', 'name slug'); // Only return slug here if needed

        // Step 3: Return the blogs
        return res.json({ success: true, blogs });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};





//-----------------------------get single blog by Id----------------------------------

exports.getBlogById = async (req, res) => {
        try {
            const slug = req.params.id;
            console.log(slug,"slug")
          
            const blog = await Blog.findById( slug ).populate('author', 'username').populate('category', 'name slug');
            if (!blog) return res.status(404).json({ message: 'Blog not found' });
            res.status(200).json(blog);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to retrieve blog', error: error.message });
        }
    };



    //-----------------------------get single blog by slug----------------------------------


    exports.getBlogBySlug = async (req, res) => {
        try {
            const slug = req.params.id;
            console.log(slug,"slug")
          
            const blog = await Blog.findOne({ slug: slug }).populate('author', 'username').populate('category', 'name slug');
            if (!blog) return res.status(404).json({ message: 'Blog not found' });
            res.status(200).json(blog);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to retrieve blog', error: error.message });
        }
    };


//-------------------------update status -----------

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // expected 'draft' or 'published'

    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `BlogCategory status updated to ${status}`,
      blog,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};



    
    //-----------------------------update blog----------------------------------


    exports.updateBlog = async (req, res) => {
  try {
    const id = req.params.id;

    // Get new data from request body
    const {
      title,
      content,
      metatitle,
      metadescription,
      metakeywords,
      category,
      excerpt,
      image
    } = req.body;


 const author=req.user._id;

    // 3️⃣ Update the blo
    const updatedBlog = await Blog.findByIdAndUpdate(id, req.body,author, 
     { new: true, runValidators: true 
    });

    return res.status(200).json({
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    console.error("Update blog error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update blog", error: error.message });
  }
};

      


    //-------------------------------------------delete blog------------------------------

    exports.deleteBlog = async (req, res) => {
        try {
            const { id } = req.params;  // Access id directly from req.params
            console.log(id)
            const blog = await Blog.findByIdAndDelete(id);

            if (!blog) {
                return res.status(404).json({ message: "Blog not found" });
            }

            return res.status(200).json({ message: "Deleted successfully" });

        } catch (error) {
            return res.status(500).json({ message: "Failed to delete", error: error.message });
        }
    };