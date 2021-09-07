const globalVariables = require('./config/configuration').globalVariables;
const express = require('express');
const ejs = require('ejs');
const port = process.env.PORT || 8000;
const app = express();
const mongoose = require('mongoose');
const Message = require('./models/message');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const logger = require('morgan')
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
        mongoUrl: 'mongodb://localhost/waaw'
    })
}));

app.use(flash())

//Use Global variables
app.use(globalVariables)

// Routes // endpoints

app.get('/', async(req, res) => {
    let allMessages = await Message.find({}).sort({ _id: -1 });
    res.render('index', { messages: allMessages });

});

app.get('/about', function(req, res) {

    res.render("about");
});
app.get('/contact', function(req, res) {
    res.send("The Contact Page");
});

app.post('/message/create-message', async(req, res) => {
    let { message } = req.body;
    if (!message) {
        req.flash('error-message', 'Field cannot be empty');
        return res.redirect('/')
    }

    let newMessage = new Message({
        message
    });
    await newMessage.save()
        .then(() => {
            req.flash('success-message', 'Message Successfully Created!')
            res.redirect('/');
        })
        .catch((err) => {
            if (err) {
                req.flash('error-message', err.message)
                res.redirect('/')
            }

        })

});

app.get('/message/delete-message/:messageId', async(req, res) => {
    const { messageId } = req.params;
    const deletedMessage = await Message.findByIdAndDelete(messageId);
    if (!deletedMessage) {
        req.flash('error-message', 'Message not deleted');
        return res.redirect('back');
    }
    req.flash('success-message', 'Message deleted successfully')
    res.redirect('/')
});




app.listen(port, function() {
    console.log(`Server running on port ${port}`);
});