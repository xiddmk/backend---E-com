const mongoose = require('mongoose');

const cartItemSchema = mongoose.Schema({
    quantity: {
        type: Number,
        default: 1,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
    },
    cart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cart',
    },
});

module.exports = mongoose.model('cartItem', cartItemSchema);
