const globalVariables = require('./config/configuration').globalVariables;
const { isLoggedIn } = require('./config/authorization')
const express = require('express');
const ejs = require('ejs');
const port = process.env.PORT || 8000;
const app = express();
const auth = require('./middlewares/routeauth');
const randomstring = require('randomstring');
//Models
const mongoose = require('mongoose');
const Message = require('./models/message');
const User = require('./models/user');
const Campaign = require('./models/campaign');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const logger = require('morgan');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//db connection
mongoose.connect('mongodb://localhost/waaw')
    .then(db => console.log('Database connection successful'))
    .catch(error => console.log('Database connection error:', error.message))
    // Setting up express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.locals.moment = require('moment');


app.use(logger('dev'));
app.set('view engine', 'ejs');
//Set up cookie and session
app.use(cookieParser());
app.use(session({
    secret: 'lorem10ipsum',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: Date.now() + 3600000 },
    store: MongoStore.create({
        mongoUrl: 'mongodb://localhost/waaw',
        ttl: 14 * 24 * 60 * 60
    })
}));

//initialize and use passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({ usernameField: 'email', passReqToCallback: true }, async(req, email, password, done) => {
    await User.findOne({ email })
        .then(async(user) => {
            if (!user) {
                return done(null, false, req.flash('error-message', "This email doesn't exist. Please use a correct email address."));
            }
            bcrypt.compare(password, user.password, (err, passwordMatch) => {
                if (err) {
                    return err;
                }
                if (!passwordMatch) return done(null, false, req.flash('error-message', 'Wrong pasword. Please check your password and try again.'));

                return done(null, user, req.flash('success-message', 'Login Successful.'));
            });


        })

}));
passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {

        done(err, user);
    })
})

app.use(flash());

//Use Global variables
app.use(globalVariables)

// Routes // endpoints

app.get('/', async(req, res) => {
    res.redirect('/user/login');

});

app.post('/message/create-message/:id', async(req, res) => {

    let { message } = req.body;
    if (!message) {
        req.flash('error-message', 'Field cannot be empty');
        return res.redirect('/user/login')
    }

    let newMessage = new Message({
        message
    });
    await newMessage.save()
        .then(() => {
            req.flash('success-message', 'Your message has been sent successfully.')
            return res.redirect('back');
        })
        .catch((err) => {
            if (err) {
                req.flash('error-message', err.message)
                return res.redirect('back')
            }

        })
    const filter = { _id: req.params.id };
    const update = { $push: { messages: newMessage._id } };
    await Campaign.updateOne(filter, update, { upsert: true });

});

app.get('/message/delete-message/:messageId', async(req, res) => {
    const { messageId } = req.params;
    const deletedMessage = await Message.findByIdAndDelete(messageId);
    if (!deletedMessage) {
        req.flash('error-message', 'Message not deleted');
        return res.redirect('back');
    }
    req.flash('success-message', 'Message deleted successfully')
    return res.redirect('/');
});

//User registration route

app.get('/user/register', (req, res) => {
    res.render('register')

});

app.post('/user/register', async(req, res) => {

    const { fullname, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash('error-message', 'Passwords do not match')
        return res.redirect('back')
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
        req.flash('error-message', 'Email already taken. Please use a different Email Address.')
        return res.redirect('back')
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
        fullname,
        email,
        password: hashedPassword
    });

    await user.save()
        .then(() => {
            req.flash('success-message', 'Registration Successful. You can login.')
            return res.redirect('/user/login')
        }).catch(() => {
            req.flash('error-message', 'Problem creating account')
            return res.redirect('back')
        });
});

app.get('/user/login', (req, res) => {
    if (req.user) {
        return res.redirect('/user/profile')
    }
    res.render('login')
});

app.post('/user/login', passport.authenticate('local', {
        successRedirect: '/user/profile',
        failureRedirect: '/user/login',
        failureFlash: true,
        successFlash: true,
        session: true
    })


);

app.get('/user/profile', auth, async(req, res) => {
    const userCampaigns = await Campaign.find({ user: req.user._id }).populate('user messages');
    res.render('profile', { userCampaigns });

});

app.get('/campaign/create-campaign', auth, (req, res) => {
    res.render('campaign');
})

app.post('/campaign/create-campaign', isLoggedIn, async(req, res) => {
    const loggedInUser = req.user;
    const { title } = req.body;
    const campLink = `${req.headers.origin}/campaign/single-campaign/${randomstring.generate()}`
    const newCampaign = new Campaign({
        title,
        user: loggedInUser._id,
        link: campLink
    });
    await newCampaign.save();
    if (!newCampaign) {
        req.flash('error-message', 'An error occured while creating campaign.');
        return res.redirect('back')
    }

    req.flash('success-message', 'Campaign created successfully.');
    return res.redirect('/user/profile')
})

app.get('/campaign/single-campaign/:campaignId', async(req, res) => {
    const singleCampaign = await Campaign.findOne({ link: `http://localhost:8000/campaign/single-campaign/${req.params.campaignId}` }).populate('user');
    if (!singleCampaign) {
        req.flash('error-message', '<b>Error:</b> Invalid campaign link! Please check the link and try again.');
        return res.redirect('/user/login')
    } else {

        res.render('campaignmessages', { singleCampaign })
    }

})

app.get('/logout', function(req, res) {
    req.logout();
    req.flash('success-message', 'You have logged out successfully!')
    return res.redirect('/user/login');
});

app.listen(port, function() {
    console.log(`Server running on port ${port}`);
});