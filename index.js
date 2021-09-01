const express = require('express');
const ejs = require('ejs');
const port = process.env.PORT || 8000;
const app = express();
const mongoose = require('mongoose');
const Message = require('./models/message')
    //db connection
mongoose.connect('mongodb://localhost/waaw')
    .then(db => console.log('Database connection successful'))
    .catch(error => console.log('Database connection error:', error.message))
    // Setting up express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Routes // endpoints

app.get('/', function(req, res) {
    res.render('index');
});
app.get('/about', function(req, res) {
    res.render("about");
});
app.get('/contact', function(req, res) {
    res.send("The Contact Page");
});

app.post('/message/create-message', function(req, res) {
    let { message } = req.body;
    if (!message) {
        return res.redirect('/')
    }

    let newMessage = new Message({
        message
    });

    newMessage.save()
        .then((data) => { console.log("Message saved successfully", data) })
        .catch((err) => { console.log("Error creating message"), err });
    res.redirect('/');

});

app.listen(port, function() {
    console.log(`Server running on port ${port}`);
});