var express = require('express');
var router = express.Router();
const cartModel = require('./cart')
var userModel = require('./users');
const passport = require('passport');
const productModel = require('./productSchema')
const cartItemModel = require('./cartItem')
var mongoose = require('mongoose')
const Razorpay = require('razorpay')




var localStrategy = require('passport-local').Strategy
passport.use(new localStrategy(userModel.authenticate()));


const cartItem = require('./cartItem');
const multer = require("multer");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/'); // Specify the destination folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + file.originalname);
  }
});

const upload = multer({ storage: storage });







/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

// sign up route
router.get('/signup', function (req, res, next) {
  res.render('signup');
});



// create user
router.post('/register', async (req, res) => {

  const newCart = await cartModel.create({})

  var user = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
    isSeller: req.body.isSeller == 'on',
    cart: newCart._id,
  })
  userModel.register(user, req.body.password)
    .then(function (createdUser) {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/homepage')
      })
    })
    .catch(function (err) {
      res.send(err)
    })
})


//  user log in
router.post('/signin', async (req, res, next) => {
  try {
    await passport.authenticate('local', {
      successRedirect: '/homepage',
      failureRedirect: '/'
    })(req, res, next);
  } catch (err) {
    console.error(err);
    // Handle the error appropriately, e.g., redirect to an error page or send a custom response.
    res.redirect('/error');
  }
});



// homepage
router.get('/homepage', isLoggedIn, async function (req, res, next) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const cart = await cartModel.findOne({ userId: user._id });

    let products;
    const searchQuery = req.query.search;
    const categoryFilter = req.query.category; // Get the category filter from the query parameters

    let query = {}; // Default query with no filters

    if (searchQuery) {
      // If there's a search query, add a filter for product name
      query.name = { $regex: new RegExp(searchQuery, 'i') };
    }

    if (categoryFilter) {
      // If there's a category filter, add a filter for the category
      query.category = categoryFilter;
    }

    // Use the combined query to find products
    products = await productModel.find(query);

    res.render('homepage', { user, cart, products, searchQuery, categoryFilter });
  } catch (error) {
    console.error(error);
    next(error);
  }
});


// add to cart
router.get('/cart', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('cart').populate({
    path: 'cart',
    populate: 'cartItems',
  });


  await Promise.all(user.cart.cartItems.map(async cartItem => {
    cartItem.product = await productModel.findById(cartItem.product)
  }))


  user.cart.cartItems.forEach(cartItem => {
    console.log(cartItem)
  })


  res.render('cart', { user })
});



// click on product goto single page with selected id
router.get("/single/:id", async (req, res, next) => {
  try {
    const product = await productModel.findOne({ _id: req.params.id });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const user = req.user;
    res.render('single', { user, product });
  } catch (error) {
    console.error(error);
    next(error);
  }
});




router.post('/update-address', isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id;

    // Validate input
    const newAddress = req.body.newAddress;
    const newName = req.body.name; // Update field name
    const newContact = req.body.contact;

    if (!newAddress || typeof newAddress !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid address format' });
    }

    // Validate newName if it exists
    if (newName !== undefined && typeof newName !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid name format' });
    }

    // Validate newContact if it exists
    if (newContact !== undefined && (typeof newContact !== 'string' && typeof newContact !== 'number')) {
      return res.status(400).json({ success: false, error: 'Invalid contact format' });
    }

    // Create an object with fields to update
    const updateFields = { address: newAddress };
    if (newName !== undefined) {
      updateFields.name = newName;
    }
    if (newContact !== undefined) {
      updateFields.contact = newContact;
    }

    // Find the user by ID and update the address, name, and contact fields
    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.redirect("/profile");
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});


//goto profilr page
router.get('/profile', isLoggedIn, async (req, res) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

    if (user && user.isSeller) {
      res.render('profile', { user });
    } else {
      res.render('userprofile', { user });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Internal Server Error');
  }
});


// edit profile page
router.get("/update", isLoggedIn, async (req, res, next) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });

    if (!user) {
      return res.status(404).send('User not found');
    }
    res.render('update', { user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

//  uploadd your product onle seller can upload products
router.get('/upload', isSeller, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('upload', { user })
});


router.get('/signout', (req, res) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
})

// router.get("/profile", isLoggedIn, async (req, res) => {
//   try {
//     if (req.user) {
//       const user = await userModel.findOne({ username: req.session.passport.user });

//       if (!user) {
//         // If user not found, return a 404 status and message
//         return res.status(404).send('User not found');
//       }

//       // Render the 'userprofile' view if the user is found
//       res.render('userprofile', { user });
//     } else {
//       // If not logged in, pass a null user and render the 'profile' view
//       res.render('profile', { user: null });
//     }
//   } catch (error) {
//     // Handle errors and send a 500 status with an error message
//     console.error(error);
//     res.status(500).send('Internal Server Error');
//   }
// });





function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/')
  }
}



async function isSeller(req, res, next) {
  var user = req.user;
  if (user.isSeller) {
    return next()
  } else {
    res.redirect("back")
  }
}


router.get("/addProduct", isLoggedIn, isSeller, async (req, res, next) => {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    res.render('upload', { user });
  } catch (error) {
    console.error(error);
    next(error);
  }
});



// add product for sell
router.post('/createProduct', isSeller, isLoggedIn, upload.single('images'), async (req, res, next) => {
  try {
    console.log(req.body);

    // Find the user based on the session
    const user = await userModel.findOne({ username: req.session.passport.user });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create the product with the provided details
    const product = await productModel.create({
      name: req.body.name,
      price: req.body.price,
      desc: req.body.desc,
      qty: req.body.qty,
      images: [req.file.filename],
      owner: user._id,
      category: req.body.category,
    });

    // Save the product
    await product.save();

    // Update the user's products array with the product's ID
    user.products.push(product._id);
    await user.save();

    // Update categories with the product ID (assuming you have a category model)
    const category = await categoryModel.findOne({ name: req.body.category });

    if (category) {
      category.products.push(product._id);
      await category.save();
    }

    console.log(product);

    res.send('Product created');
  } catch (error) {
    console.error(error);
    next(error);
  }
});




// add to cart product
router.get('/addCart/:id', isLoggedIn, async (req, res, next) => {
  try {
    const user = await userModel.findOne({ username: req.user.username }).populate("cart")
    var isProductAlreadyInCart = false

    const product = await productModel.findOne({ _id: req.params.id });

    await Promise.all(user.cart.cartItems.map(async cartItem => {
      const currentCartItem = await cartItemModel.findById(cartItem)
      if (currentCartItem.product.equals(product._id)) {
        isProductAlreadyInCart = true
        currentCartItem.quantity = currentCartItem.quantity + 1
        await currentCartItem.save()

        await cartModel.findByIdAndUpdate(user.cart._id, { price: user.cart.price + Number(product.price) })

      }
    }))

    console.log(user)

    if (!isProductAlreadyInCart) {

      const newCartProduct = await cartItemModel.create({ product: product._id, cart: user.cart._id });
      await cartModel.findByIdAndUpdate(user.cart._id, {
        $push: { cartItems: newCartProduct._id },
        price: user.cart.price + Number(product.price)
      })

    }
    res.redirect('back');
    console.log(await cart.findById(req.cart._id))

  } catch (error) {
    console.error(error);
    next(error);
  }
});




// remove cart item
router.get("/removeCart/:id", isLoggedIn, async (req, res, next) => {
  try {
    const user = await userModel.findOne({ username: req.user.username }).populate("cart");
    const product = await productModel.findOne({ _id: req.params.id });

    let isProductRemoved = false;

    await Promise.all(user.cart.cartItems.map(async (cartItem) => {
      const currentCartItem = await cartItemModel.findById(cartItem);

      if (currentCartItem.product.equals(product._id)) {

        if (currentCartItem.quantity > 1) {

          currentCartItem.quantity = currentCartItem.quantity - 1;
          await currentCartItem.save();

        } else {

          await cartItemModel.deleteOne({ _id: currentCartItem._id });

          await cartModel.findByIdAndUpdate(user.cart._id, {
            $pull: { cartItems: currentCartItem._id },
            price: user.cart.price - Number(product.price)
          });
        }


        await cartModel.findByIdAndUpdate(user.cart._id, {
          price: user.cart.price - Number(product.price)
        });

        isProductRemoved = true;
      }
    }));

    if (!isProductRemoved) {

      res.status(404).send("Product not found in the cart");
      return;
    }

    res.redirect('back');
  } catch (error) {
    console.error(error);
    next(error);
  }
});


// delete cart item
router.get('/deleteCartItem/:cartItem_id', isLoggedIn, async (req, res, next) => {

  const current_cart_item = await cartItemModel.findById(req.params.cartItem_id)

  if (!current_cart_item) {
    console.log('cart item not found')
    res.redirect('/homepage')
    return
  }

  const currentCart = await cartModel.findById(current_cart_item.cart)

  if (!currentCart) {
    console.log('cart not found')
    res.redirect('/homepage')
    return
  }

  const currentProduct = await productModel.findById(current_cart_item.product)

  if (!currentProduct) {
    console.log('product not found')
    res.redirect('/homepage')
    return
  }

  const productValue = Number(current_cart_item.quantity) * Number(currentProduct.price)

  await cartModel.findOneAndUpdate({ _id: currentCart._id }, {
    $pull: {
      cartItems: current_cart_item._id
    },
    price: currentCart.price - productValue
  })

  await cartItemModel.findByIdAndDelete(current_cart_item._id)


  res.redirect('back')



})









router.post('/profilepic', isLoggedIn, upload.single('profilepic'), async (req, res) => {
  var user = await userModel.findOne({ username: req.session.passport.user })
  user.profile = req.file.filename
  await user.save()
  res.redirect("back")
})






























const razorpayInstance = new Razorpay({
  key_id: 'rzp_test_bI0IzXukUxGWWc',
  key_secret: '2O10UB5KsbRziqYilSXcNaWL',
});

router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = 'order_rcptid_11' } = req.body;

    const options = {
      amount: amount * 100,
      currency: currency,
      receipt: receipt,
    };

    const order = await razorpayInstance.orders.create(options);

    res.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, error: 'Missing parameters' });
    }

    const payload = `${orderId}|${paymentId}`;
    const isValidSignature = razorpayInstance.webhooks.validateSignature(
      payload,
      signature,
      'your_webhook_secret'
    );

    if (isValidSignature) {
      // Payment is verified
      res.json({ success: true });
    } else {
      // Invalid signature
      res.status(403).json({ success: false, error: 'Invalid Signature' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
