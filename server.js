const express = require('express');
const app = express();
const { pool } = require('./dbConfig');
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const Port = process.env.Port || 4000;
const passport = require('passport');

const initializePassport = require('./passportConfig');

initializePassport(passport);

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false}));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash())

app.get('/', (req, res) => {
    res.render("index");
})

app.get('/users/register', checkAuthenticated, (req, res) => {
    res.render("register");
});

app.get('/users/login', checkAuthenticated, (req, res) => {
    res.render("login");
});

app.get('/users/logout', (req, res) => {
    req.logout(err => {
        if(err) {
            req.flash('success_msg', "You have logged out");
            throw err;
        }
        
    });
    req.flash('success_msg', "You have logged out");
    res.redirect('/users/login');
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
    res.render("dashboard", {user: req.user.name + " " + req.user.lname});
});

app.post('/users/register/', async (req, res) => {
    let {name, lname, email, password, password2} = req.body;
    console.log({
        name, lname, email, password, password2
    });
    let errors = [];

    if(!name || !lname || !email || !password || !password2) {
        errors.push({message: "Please enter all fields"});
    }
    if (password.length < 6) {
        errors.push({message: "Password should be at least 6 characters"});
    }
    if (password != password2) {
        errors.push({message: "Passwords do not match"});
    }
    if (errors.length > 0) {
        res.render("register", {errors});
    } else {
        // Form validation has passed
        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);
        pool.query(
            'SELECT * FROM users WHERE email = $1', [email], (err, results) => {
                if (err) {
                    throw err;
                }
                console.log(results.rows);
                if (results.rows.length > 0) {
                    errors.push({message: "Email already registered"});
                    res.render('register', {errors});
                } else {
                    pool.query(
                        'INSERT INTO users (name, lname, email, password) VALUES ($1, $2, $3, $4) RETURNING id, password', [name, lname, email, hashedPassword], (err, results) => {
                            if (err) {
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect('/users/login');
                        }
                    )
                }
            }
        )
    }
});

app.post('/users/login', passport.authenticate('local', {
    successRedirect: '/users/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
}));

function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return res.redirect('/users/dashboard');
    }
    next();
}

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    res.redirect('/users/login');
}

app.listen(Port, () => {
    console.log(`Server is running on port ${Port}`);
})




