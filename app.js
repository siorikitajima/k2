const express = require('express');
require('dotenv').config();
const nodemailer = require('nodemailer')
const bodyParser = require('body-parser').json({limit: '50mb'});
const { render } = require('ejs');
const mongoose = require('mongoose');
const blogController = require('./controllers/blogController');
const authController = require('./controllers/authController');
const passport = require('passport');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const initializePassport = require('./controllers/passport-config');
const User = require('./models/user');
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const methodOverride = require('method-override');

const app = express();
const port = process.env.PORT || 7070;
let salt = process.env.HASH_NUMBER;
let salfInt = parseInt(salt);

var store = new MongoDBStore({
    uri: process.env.DB_URL,
    collection: 'mySessions'
  });

var sess = {
secret: process.env.SESSION_SECRET,
resave: false,
saveUninitialized: false,
store: store,
cookie:{
    secure: process.env.NODE_ENV == "production" ? true : false ,
    maxAge: 1000 * 60 * 60 * 24 * 7
}
}
app.use(session(sess));


mongoose.connect(process.env.DB_URL)
    .then(() => app.listen(port))
    .catch((err) => console.log(err));
const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => {
        User.find()
        .then((result) => { 
            initializePassport(
                passport, 
                name => result.find(user => user.name === name),
                id => result.find(user => user.id === id)
            );
        }).catch((err) => console.log(err));
    });

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(bodyParser);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    res.render('home', { title: '?????????', nav: 'home' });
})

app.get('/consult', (req, res) => {
    res.render('consult', { title: '??????????????????', nav: 'consult' });
})

app.get('/info', blogController.info_get);
app.get('/info/:blogId', blogController.info_single_get);

app.get('/service', (req, res) => {
    res.render('service', { title: '????????????', nav: 'service' });
})

app.get('/about', (req, res) => {
    res.render('about', { title: '?????????????????????', nav: 'about' });
})

app.get('/contact', (req, res) => {
    res.render('contact', { title: '??????????????????', nav: 'contact' });
})

app.get('/thanku', (req, res) => {
    res.render('msgSent', { title: '??????????????????', nav: 'contact' });
})

// Admin panel Routes
app.get('/edit/:blogId', authController.checkAuthenticated, blogController.editor_get);
app.post('/edit/:blogId', authController.checkAuthenticated, blogController.editor_post);
app.post('/featimage', authController.checkAuthenticated, blogController.blogimg_post);
app.post('/publish/:blogId', authController.checkAuthenticated, blogController.publish_post);
app.get('/bloglist', authController.checkAuthenticated, blogController.blogList_get);
app.post('/bloglist', authController.checkAuthenticated, blogController.blogList_post);
app.post('/blogDelete', authController.checkAuthenticated, blogController.blogList_delete);
app.post('/blogRename', authController.checkAuthenticated, blogController.blogList_rename);

// User Management Routes
app.get('/register', authController.checkAuthenticated, (req, res) => {
    res.render('register', { title: '??????????????????', nav: 'register' });
});
app.get('/login', authController.checkNotAuthenticated, (req, res) => {
    res.render('login', { title: '????????????', nav: 'login' });
});
app.post('/register', authController.checkAuthenticated, async (req, res) => {
    await bcrypt.hash(req.body.pass, salfInt, (err, hash) => {
        if(err) console.log(err);
            const user = new User({
                name: req.body.name,
                password: hash
            });
            user.save((err) => {
                if(err) {console.log(err)}
                else { res.redirect('/login');}
        });
        })
});
app.post('/login', authController.checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/bloglist',
    failureRedirect: '/login',
    failureFlash: true
}));
app.delete('/logout', authController.log_out);

// Mailer
app.post('/contact', (req, res) => {
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;
    const GMAIL_PORT = process.env.GMAIL_PORT;
    const GMAIL_HOST = process.env.GMAIL_HOST;

    const smtpTrans = nodemailer.createTransport({
      host: GMAIL_HOST,
      port: GMAIL_PORT,
      secure: true,
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
      }
    })
  
    const mailOpts = {
      from: `${req.body.email}`,
      to: GMAIL_USER,
      subject: `[K2] ????????????????????????????????????????????????`,
      text: `????????????????????????????????????????????????????????????????????????????????????????????????????????????\n\n?????????${req.body.name}\n\n????????????????????????${req.body.email}\n\n???????????????${req.body.phone}\n\n???????????????: ${req.body.message}\n\n???????????????: ${req.body.service}`
    }

    smtpTrans.sendMail(mailOpts, (error, response) => {
      if (error) { res.redirect('/contact') }
      else { res.redirect('/thanku');  }
    })
  })