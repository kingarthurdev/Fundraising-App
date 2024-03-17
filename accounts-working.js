const bcrypt = require('bcrypt'); //for user pass encryption
require('dotenv').config();
const mysql = require('mysql')
const express = require('express')
const app = express();


app.set('view engine', 'ejs');
app.use("/", express.static('test'));
app.use(express.json()); // essential to use req.body

  

const jwt = require('jsonwebtoken');


/*var session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET_KEY, 
}))*/



app.get('/test', (req, res) => {
    res.render(__dirname + "/test/test.ejs");
});


app.listen(8000, () => {
    console.log(`test user app listening on port 8000`)
})


const userSQL = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'users'
});

async function createUser(name, email, id, password) { // I think should return a promise so that can do .then and .catch to handle 
    bcrypt.hash(password, 10).then(function (res) {
        userSQL.query(`select * from users where email = ${mysql.escape(email)}`, (err, res) => {
            if (err || res.length != 0) {
                console.log("User Creation Rejected. Possible Duplicate Email.");
            } else {
                userSQL.query(`insert into users (name, email, userid, passhash) values (${mysql.escape(name)}, ${mysql.escape(email)}, ${id}, "${res}");`, (err, res) => {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(`User ${name} created`);
                    }
                });
            }

        })


    }).catch(err => {
        console.log(err);
    });
    return; // temporary, should return promise whatever, but good nuff for now 

}


async function authenticateuser(email, password) {
    return new Promise((resolve, reject) => {
        userSQL.query('SELECT * FROM users WHERE email = ?;', [email], (err, res) => {
            if (err) {
                console.log(err)
                reject(err);
            }
            if (res != undefined && res != null && res.length == 1) {
                bcrypt.compare(password, res[0].passhash).then(
                    result => {
                        if (result) {
                            resolve(res[0].userid);
                        } else {
                            reject("Incorrect username or password");
                        }
                    }
                ).catch(err => {
                    console.log("real error: "+ err);
                    reject("Authentication error.")
                });
            } else {
                reject("Incorrect username or password");
            }
        });
    });

};
//createUser("test1 test2", "554@a.com", Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), "somesecurepass");

//createUser("test1 test2", Math.floor(Math.random()*Math.pow(10,3))+ "@a.com", Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), "somesecurepass");

//authenticateuser("554@a.com", "somesecurepass").then(data => console.log(data)).catch(error => console.log(error));


app.post("/api/createuser", async (req, res) => {
    try {
        if (req.body.email && isEmailValid(req.body.email) && req.body.name && req.body.password) {
            createUser(req.body.name, req.body.email, Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), req.body.password);
        } else {
            res.send(400);
            return;
        }
    } catch {
        res.send(418);
    }

});

app.post("/api/auth", async (req, res) => {
    let authResult = await authenticateuser(req.body.email, req.body.password).then(result => {
        const token = jwt.sign({ userId: result }, process.env.JWT_SECRET_KEY, {
            expiresIn: '2h',
        });
        res.setHeader('Set-Cookie', `authentication=${token}; HttpOnly`); //sets cookie
        res.status(200).send("Authentication Succeeded.");
    }).catch(
        err => {
            //res.setHeader('Set-Cookie', `authentication=${"123123123"}; HttpOnly`);
            console.log(err);
            res.status(400).send('Invalid Authentication.');
        }

    );

});

app.get("/dashboard", async (req, res) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.userId = decoded.userId;
        console.log(req.userid);
        //next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
})

//source: https://github.com/manishsaraan/email-validator/blob/master/index.js
function isEmailValid(email) {
    var emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if (!email)
        return false;

    if (email.length > 254)
        return false;

    var valid = emailRegex.test(email);
    if (!valid)
        return false;

    // Further checking of some things regex can't handle
    var parts = email.split("@");
    if (parts[0].length > 64)
        return false;

    var domainParts = parts[1].split(".");
    if (domainParts.some(function (part) { return part.length > 63; }))
        return false;

    return true;
}


