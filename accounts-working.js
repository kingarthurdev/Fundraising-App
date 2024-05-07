const bcrypt = require('bcrypt'); //for user pass encryption
require('dotenv').config();
const mysql = require('mysql')
const express = require('express')
const app = express();


app.set('view engine', 'ejs');
app.use("/", express.static('test', {
    extensions: ['html']
}));
app.use(express.json()); // essential to use req.body


app.disable('x-powered-by'); // prevent enumeration of what backend is used
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
app.use(cookieParser());


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

const campaigns = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'fundraisers'
});

async function createUser(name, email, id, password) { // I think should return a promise so that can do .then and .catch to handle 
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10).then(function (passhash) {
            userSQL.query(`select * from users where email = ${mysql.escape(email)}`, (err, res) => {
                if (err || res.length != 0) {
                    console.log("User Creation Rejected. Possible Duplicate Email.");
                    reject("User Creation Rejected. Possible Duplicate Email.");
                } else {
                    console.log(name, email, id, passhash);
                    userSQL.query(`insert into users (name, email, userid, passhash) values (${mysql.escape(name)}, ${mysql.escape(email)}, ${id}, "${passhash}");`, (err, res2) => {
                        if (err) {
                            console.log(err);
                            reject("Internal Server Error.");
                        } else {
                            resolve("User Successfully Created!");
                            console.log(`User ${name} created`);
                        }
                    });
                }

            })


        }).catch(err => {
            console.log(err);
        });
    });


}


async function authenticateuser(email, password) {
    return new Promise((resolve, reject) => {
        userSQL.query('SELECT * FROM users WHERE email = ?;', [email], (err, res) => { //todo: check to make sure not vuln
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
                    console.log("real error: " + err);
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
            createUser(req.body.name, req.body.email, Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), req.body.password).then(function () {
                res.sendStatus(200);
            }).catch((reason) => {
                console.log(reason);
                return res.send(400);
            });
        } else {
            return res.send(400);
        }
    } catch {
        res.send(418);
    }

});

app.post("/api/auth", async (req, res) => {
    let token = req.cookies.authentication;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            return res.status(200).send("Authentication Succeeded.");
        } catch (error) {
            console.log("Expired token. Trying to login. ");
        }
    }

    let authResult = await authenticateuser(req.body.email, req.body.password).then(result => {
        const token = jwt.sign({ userId: result }, process.env.JWT_SECRET_KEY, {
            expiresIn: '2h',
        });
        res.setHeader('Set-Cookie', `authentication=${token}; Secure; Path=/; Max-Age=99999; SameSite=strict;`); //sets cookie
        res.status(200).send("Authentication Succeeded.");
    }).catch(
        err => {
            console.log(err);
            res.status(400).send('Invalid Authentication.');
        }

    );

});


app.post("/api/logout", async (req, res) => {

    try {
        res.setHeader('Set-Cookie', `authentication="signedout"; Secure; Path=/; Max-Age=99999; SameSite=strict;`); //sets cookie
        res.redirect("/")
    } catch {
        console.log("error in logout process.");
    }


});

app.get("/dashboard", async (req, res) => {
    //const token = req.header('Authorization');
    const token = req.cookies.authentication;
    if (!token) {
        return res.redirect("/login.html")
    } else {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);  // important that you use jwt.verify not jwt.decode, decode doesn't verify! 
            //MAKE SURE TO SANITIZE USER ID! COULD BE CODE INJECTION!
            let id = decoded.userId;
            userSQL.query(`select * from users where userid = ${userSQL.escape(id)}`, (err, res2) => {
                if (!err) {
                    res.render(__dirname + "/test/dashboard.ejs", { id, name: res2[0].name, email: res2[0].email });
                    console.log(res2);
                } else {
                    console.log(err);
                    res.sendStatus(500);
                }
            })
            //next();
        } catch (error) {
            console.log("Dashboard error: ", error);
            return res.redirect("/login.html")
        }
    }



})

//source: https://github.com/manishsaraan/email-validator/blob/master/index.js
function isEmailValid(email) {
    var emailRegex = /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if (!email)
        return false;

    //TODO: verify email object type, prevent crashing errors!
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


app.post("/createcampaign", async (req, res2) => {
    // implement some sort of  csrf protection here + authentication + authorization checks 
    let token = req.cookies.authentication;
    if (token) {
        try {
            let userId = getUser(token);
            if (!userId == -1) {
                //const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // i think redundant
                //todo: authorization check of some sort here
                let randFundId = Math.floor(Math.random() * (999999 - 111111 + 1) + 111111);
                campaigns.query(`select * from campaigns where id = ${randFundId}`, (err, res) => {
                    if (err || res.length != 0) {
                        console.log(err);
                        randFundId = Math.floor(Math.random() * (999999 - 111111 + 1) + 111111); //todo: better handle possible duplicate ids + implement same feature in other one + maeke join code
                    } else {
                        campaigns.query(`insert into campaigns (camName, id, camAdmin ) values (${mysql.escape("test1")}, ${randFundId},${mysql.escape(getUser(token))});`, (err, res2) => {
                            if (err) {
                                console.log(err);
                                res2.send("Internal Server Error.");
                            } else {
                                res2.send("Fundraiser Successfully Created!");
                            }
                        });
                    }

                })
            }

        } catch (error) {
            console.log(error);
            return res.redirect("/login.html")
        }
    } else {
        return res.redirect("/login.html");
    }


});


function getUser(cookie) {
    try {
        const decoded = jwt.verify(cookie, process.env.JWT_SECRET_KEY);
        return decoded.userId;
    } catch (error) {
        console.log(error);
        return -1;
    }
}


//TODO: this function will not work correctly rn, adds users based on fundid rn instead of join code because joincode needs to be primary id 
function joinCampaign(userid, joincode) {
    let cleanU2 = mysql.escape(userid);
    campaigns.query(`update campaigns set members = JSON_SET(members, '$."${cleanU2}"', 0) where id = ${mysql.escape(joincode)}`, (err, res) => {
        console.log(err);
        console.log(res);
    });
}

console.log("aaa")
joinCampaign(123412341234, 1);

