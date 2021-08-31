const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const port = 8000;
const index = "";
const app = express();
// Setting up express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(express.json());
app.get('/', function(req, res) {
    res.render('index', { index: index });
})
app.get('/about', function(req, res) {
    res.render("about");
})
app.get('/contact', function(req, res) {
    res.send("The Contact Page");
})

app.listen(port, function() {
    console.log(`Server running on port ${port}`)
});