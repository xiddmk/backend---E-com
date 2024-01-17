const mongoose = require('mongoose');

const cartSchema = mongoose.Schema({
    cartItems: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'cartItem',
    }],
    price: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model('cart', cartSchema);
