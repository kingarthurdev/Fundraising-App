const bcrypt = require('bcrypt'); //for user pass encryption
require('dotenv').config();
const mysql = require('mysql')
const express = require('express')
const app = express();


app.set('view engine', 'ejs');
app.use("/", express.static('test'));
app.use(express.json()); // essential to use req.body

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

async function createUser(name, email, id, password) {
    bcrypt.hash(password, 10).then(function (res) {
        userSQL.query(`insert into users (name, email, userid, passhash) values (${mysql.escape(name)}, ${mysql.escape(email)}, ${id}, "${res}");`, (err, res) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`User ${name} created`);
            }
        });

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

            if (res != undefined && res != null && res.length==1 ) {
                bcrypt.compare(password, res[0].passhash).then(
                    result => {
                        if (result) {
                            resolve("Authentication Succeeded!");
                        } else {
                            resolve("Incorrect username or password");
                        }
                    }
                );
            } else {
                resolve("Incorrect username or password");
            }
        });

    });

};

//createUser("test1 test2", Math.floor(Math.random()*Math.pow(10,3))+ "@a.com", Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), "somesecurepass");

//authenticateuser("554@a.com", "somesecurepass").then(data => console.log(data)).catch(error => console.log(error));


app.post("/api/createuser", async (req, res) => {
    try {
        if (isEmailValid(req.body.email) && req.body.name && req.body.password) {
            createUser(req.body.name, req.body.email, Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), req.body.password);
        } else {
            res.send(400);
        }
    } catch {
        res.send(418);
    }

});

app.post("/api/auth", async (req, res) => {
    let authResult = await authenticateuser(req.body.email, req.body.password).then(result => {
        res.status(200).send(result);
    }).catch(
        err => {
            console.log(err);
            res.status(500).send('Error fetching data from database');
        }

    );

});

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
