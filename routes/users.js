const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

mongoose.connect('mongodb://0.0.0.0/finalproject')
    .then(console.log("DB Connected"))
    .catch(err => console.error(err));

    const userSchema = mongoose.Schema({
        username: String,
        email: String,
        name: {
            type: String,
            default: "",
        },
        isSeller: {
            type: Boolean,
            default: false,
        },
        address: {
            type: String,
            default: "",
        },
        name: {
            type: String,
            default: "",
        },
        contact: {
            type: String,
            default: null,
        },
        profile: {
            type: String,
            default: "/images/IMG_20230721_143342_465.webp"
          },
        products: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "product"
        }],
        cart: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "cart"
        }
    });
    
    userSchema.plugin(plm);
    
    module.exports = mongoose.model('user', userSchema);
    