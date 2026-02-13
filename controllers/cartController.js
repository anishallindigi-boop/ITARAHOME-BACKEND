const CartItem = require('../models/CartItem');

/* ---------- Helper: Get full cart with populated product & variation ---------- */
const getUserCart = async (userId) => {
  const cartItems = await CartItem.find({ user: userId })
    .populate({
      path: 'productId',
      select: '',
    })
    .lean(); // Important for manual manipulation

  // Manually attach the correct variation to each cart item
  const populatedCart = cartItems.map(item => {
    if (item.variationId && item.productId?.variations) {
      const variation = item.productId.variations.find(
        v => v._id.toString() === item.variationId.toString()
      );
      return {
        ...item,
        variationId: variation || null, // Attach full variation object
      };
    }
    return item;
  });

  return populatedCart;
};

/* ---------- GET: Fetch user's cart ---------- */
exports.getCart = async (req, res) => {
  try {
    const cart = await getUserCart(req.user._id);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------- POST: Add to cart (supports variationId) ---------- */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, productvariationid: variationId } = req.body;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // Find existing cart item with same product + variation (or null variation)
    const filter = {
      user: userId,
      productId,
    };
    if (variationId) {
      filter.variationId = variationId;
    } else {
      filter.variationId = null;
    }

    const existingItem = await CartItem.findOne(filter);

    if (existingItem) {
      // Increment quantity if same item already exists
      existingItem.quantity += quantity;
      await existingItem.save();
    } else {
      // Create new cart item
      await CartItem.create({
        user: userId,
        productId,
        variationId: variationId || null, // explicitly set null if no variation
        quantity,
      });
    }

    // Return full updated cart
    const cart = await getUserCart(userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------- PUT: Update quantity of a cart item ---------- */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const item = await CartItem.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { quantity },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const cart = await getUserCart(userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------- DELETE: Remove single item from cart ---------- */
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user._id;

    const item = await CartItem.findOneAndDelete({
      _id: req.params.id,
      user: userId,
    });

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const cart = await getUserCart(userId);
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------- DELETE: Clear entire cart ---------- */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await CartItem.deleteMany({ user: userId });
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};