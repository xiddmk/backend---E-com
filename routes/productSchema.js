const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: String,
    price: String,
    desc: String,
    qty: Number,
    images: [{
        type: String
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    category: {
        type: String // You can adjust this type based on your specific needs (e.g., enum, array, etc.)
    }
});

module.exports = mongoose.model('product', productSchema);
