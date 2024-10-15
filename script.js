/*


todo: instead of doing a verify payment function, I need to implement a webhook that listens in for stripe requests, using that to verify 
todo: ensure no multiple passes through the update funds -- no false inflation
todo: pull account balance directly from stripe connected account, that way 0% accountability on my end. Well actually... what if there are multiple fundraisers per account? 
todo: make sure that only the $ that should go to the fundraiser is recorded, minus tips and processing fees


*/

require('dotenv').config();
const bcrypt = require('bcrypt'); //for user pass encryption
const port = process.env.PORT;
const express = require('express')
const mysql = require('mysql')
const app = express();
app.disable('x-powered-by'); // prevent enumeration of what backend is used
const https = require('https');
const http = require('http');
const fs = require('fs');


if (!process.env.DEVSERVER) {
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/bowiefundraising.csproject.org/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/bowiefundraising.csproject.org/fullchain.pem'),
  };
  https.createServer(options, app).listen(process.env.SSLPORT, () => {
    console.log(`HTTPS server listening on port ${process.env.SSLPORT}`);
  });

  // Start HTTP server for redirecting
  http.createServer((req, res) => {
    res.writeHead(301, { "Location": `https://${req.headers.host}${req.url}` });
    res.end();
  }).listen(port, () => {
    console.log(`HTTP server listening on port ${port}`);
  });
} else {

  app.listen(port, () => {
    console.log(`Fundraiser app listening on port ${port}`)
  })
}




app.use(express.json());//allow request body parsing

app.set('view engine', 'ejs');
app.use("/", express.static('public', {
  extensions: ['html']
}));
app.disable('x-powered-by'); // prevent enumeration of what backend is used
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

var SibApiV3Sdk = require('sib-api-v3-sdk');
var defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization: api-key
var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUEAPIKEY;
var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
var sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email


/*
const accountsFile = require('./accounts'); // this should let us use the accounts file?
app.use('/', accountsFile);*/

//TO-DO: make sure that the names of each fundraiser are in proper format (first letter of each word except certain ones are capitalized. )
const connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'fundraisers'
});

const userSQL = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'users'
});




//NOTE: DO NOT USE CONNECTION.CONNECT() AND CONNECTION.END() BECAUSE IT CAUSES THE CODE TO BREAK!
//Note to future self if hosting on another computer: if it throws Client does not support authentication protocol requested by server; consider upgrading MySQL client visit https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
async function connectSQL(id) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT * FROM campaigns WHERE id = ?', id, (error, results) => {
      if (error) {
        console.error('Error executing SQL query:', error);
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}


//can easily make it so that this puts a lot of the info onto the page
app.get('/fund/:id', async (req, res) => {
  //TO-DO: verify that name is an int or can just leave as is? What if I want to allow users to search by name? 
  //will verify as int for now: 
  var fundId;
  try {
    fundId = parseInt(req.params.id);
    let outcome = {};
    try {
      outcome = await connectSQL(fundId);
      let fundName = await outcome[0]?.camName;
      let camFunds = await outcome[0]?.camFunds;
      let dollarGoal = await outcome[0]?.dollarGoal;
      let programLeader = await outcome[0]?.programLeader;
      let message = await outcome[0]?.camDescription;
      let camImage = await outcome[0]?.camImage;
      let mainCamImage = await outcome[0]?.mainCamImage;
      res.render('campaign', { fundName, fundId, camFunds, dollarGoal, programLeader, message, camImage, mainCamImage });
    } catch (err) {
      console.log(err);
      return res.status(500).send('Error fetching data from database');
    }
  } catch (error) {
    console.log(error);
    return res.status(404);
  }


});

app.get('/checkout/:name', async (req, res) => {
  //TO-DO: verify that name is an int or can just leave as is? What if I want to allow users to search by name? 
  const name = req.params.name;

  let outcome = {};
  try {
    outcome = await connectSQL(name);
    let fundId = await outcome[0]?.id;
    let fundName = await outcome[0]?.camName;
    res.render('checkout', { fundName, fundId });
  } catch (err) {
    console.log(err);
    return res.status(500).send('Error fetching data from database');
  }
});

app.get('/getbalance/:name', async (req, res) => {
  const name = req.params.name;
  try {
    connection.query(`select camFunds from campaigns where id = ${connection.escape(name)}`, function (err, result) {
      if (err) {
        //todo: do promise something to work correctly; Nah, works fine...
        console.log(err);
        res.send(400);
      } else {
        res.send({ fundsCents: result[0].camFunds });
      }
      return;
    });
  } catch {
    res.send(400);
  }

})

/**
 * Code from stripe sample:
 * https://codeload.github.com/stripe-samples/accept-a-payment/zip/refs/heads/main
 */

app.post("/create-payment-intent", async (req, res) => {

  // Create a PaymentIntent with the order amount and currency
  try {

    let accountid = await getStripeId(req.body.fundId);
    accountid = accountid[0].stripeAccountId;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.donationAmount * 100,
      currency: "usd",
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: { destination: accountid },
      application_fee_amount: 0,
    });
    console.log(accountid + " account id");
    //console.log(paymentIntent, " is the payment intent");

    //connection.query(`insert into transactions (fundraiserid, paymentintent,paymentid, amount) values (${connection.escape(req.body.fundId)}, ${connection.escape(JSON.stringify(paymentIntent))}, ${connection.escape(paymentIntent.id)} ,${connection.escape(req.body.donationAmount)} ) `, (err, res) => {
    connection.query(`insert into transactions (fundraiserid,paymentid, amount) values (${connection.escape(req.body.fundId)}, ${connection.escape(paymentIntent.id)} ,${connection.escape(req.body.donationAmount)} ) `, (err, res) => {
      if (err) {
        console.log(err);
      }
    });

    globalPaymentIntent = paymentIntent;
    res.send({
      clientSecret: paymentIntent.client_secret,
      paymentIntent: paymentIntent,
    });

  } catch (error) {
    console.log(error);
    res.sendStatus(418);
    //res.send({ error: "Unable to create Payment Intent"});
  }
});


//updates amount to be paid when the person submits the form 
//todo: make better by properly listening to responses from stripe api, then responding accordingly instead of brute forcing.
app.post("/update-payment-intent", async (req, res) => {

  let customer;
  let name = req.body.custName + "";
  let email = req.body.custEmail + "";
  let doneBefore = parseInt(req.body.doneBefore);  // a 1 will indicate that this isn't the first update, thus will prevent the customer attribute. 

  try {
    try {
      if (doneBefore != 1) {
        customer = await stripe.customers.create({
          name: name,
          email: email,
        });
        console.log("New customer, here is the name and email: " + req.body.custName + " : " + req.body.custEmail);
      }

    } catch {
      console.log("Customer creation failed. Possibly because they already exist. Ignoring for now...")
    }


    let cleanDonation = mysql.escape(req.body.totaldonation);
    cleanDonation = cleanDonation.replace(/^'|'$/g, "").replaceAll(",", "");
    cleanDonation = parseInt(parseFloat(cleanDonation) * 100);



    if (cleanDonation > 99999999) {
      cleanDonation = 99999998;
    } else if (cleanDonation < 100) {
      cleanDonation = 100;
      console.log("Value too low, replacing with $1 or 100 cents"); // or should reject transaction...
    }

    let totalint = cleanDonation;

    if (customer) {
      console.log("here is what I will be submitting: amount:" + totalint + ", application fee amount is " + parseInt(req.body.totaltip * 100) + ", this goes through");
      try {
        console.log("Here is donebefore: " + doneBefore)
        if (doneBefore != 1) {
          console.log("doing update with cust info because doneBefore is false.")
          let paymentIntent = await stripe.paymentIntents.update(
            req.body.PI,
            {
              amount: totalint,
              application_fee_amount: 0,
              customer: customer.id,
            }
          );
          // duplicate stuff incase of errors? // honestly idk what the point of this is, but past me put it here... 
          paymentIntent = await stripe.paymentIntents.update(
            req.body.PI,
            {
              amount: totalint,
              application_fee_amount: parseInt(req.body.totaltip * 100),
              customer: customer.id,
            }
          );
        } else {
          let paymentIntent = await stripe.paymentIntents.update(
            req.body.PI,
            {
              amount: totalint,
              application_fee_amount: 0,
            }
          );
          // duplicate stuff incase of errors? // honestly idk what the point of this is, but past me put it here... 
          paymentIntent = await stripe.paymentIntents.update(
            req.body.PI,
            {
              amount: totalint,
              application_fee_amount: parseInt(req.body.totaltip * 100),
            }
          );
        }

      } catch (e) {
        console.log(e);
        let paymentIntent = await stripe.paymentIntents.update(
          req.body.PI,
          {
            amount: totalint,
            application_fee_amount: 0,
          }
        );
        // duplicate stuff incase of errors? // honestly idk what the point of this is, but past me put it here... 
        paymentIntent = await stripe.paymentIntents.update(
          req.body.PI,
          {
            amount: totalint,
            application_fee_amount: parseInt(req.body.totaltip * 100),
          }
        );
      }

    } else {
      console.log("I'm in the else statement, there is no customer");
      let paymentIntent = await stripe.paymentIntents.update(
        req.body.PI,
        {
          amount: totalint,
          application_fee_amount: 0,
        }
      );
      // duplicate stuff incase of errors? // honestly idk what the point of this is, but past me put it here... 
      paymentIntent = await stripe.paymentIntents.update(
        req.body.PI,
        {
          amount: totalint,
          application_fee_amount: parseInt(req.body.totaltip * 100),
        }
      );
    }



    console.log("Payment submitted, original payment updated")
    //console.log(paymentIntent, " is the updated payment intent")
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(418);
  }

});

app.post("/verify-payment", async (req, res) => {
  getTransaction(req.body.id).then((response) => {
    if (response == null || response == undefined) {
      console.log("Transaction not found");
      res.status(400).json({ error: 'Invalid Transaction' });
    } else {
      try {
        if (response.succeeded != 1) {
          stripe.paymentIntents.retrieve(response[0].paymentid).then(paymentIntent => {
            if (paymentIntent.status === 'succeeded') {
              connection.query(`select succeeded from transactions where paymentid = ${connection.escape(req.body.id)}`, (error, response) => {
                if (JSON.stringify(response[0].succeeded) == "null" || JSON.stringify(response[0].succeeded) == 0) {
                  // process to begin updating transactions to process new funds 
                  //the custName is the name on the credit card, the cust email is the email submitted on the payment form, the totaltip is the tip for the developers, the globalFee is the cc processing fee
                  updateFunds(req.body.fundId, req.body.id, paymentIntent, req.body.donationAmount, req.body.custName, req.body.custEmail, req.body.totaltip, req.body.globalFee, req.body.tipHidden).then(result => {
                    console.log(result);
                    res.status(200).json({ message: result });
                  }).catch(err => {
                    console.log(err);
                    res.status(400).json({ error: err });
                  })
                }
              });
            } else {
              console.log("failed payment")
              res.status(400).json({ error: 'Payment Failed' });
            }

          });
        } else {
          res.status(400).json({ error: 'Duplicate Transaction' });
        }
      } catch {
        res.status(414); // idk what this status is, just here to prevent program from shitting itself when an error occurs
      }
    }
  }).catch((err) => {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  })

});


async function getTransaction(paymentId) {
  return new Promise((resolve, reject) => {
    connection.query(`select * from transactions where paymentid = ${connection.escape(paymentId)}`, (err, response) => {
      if (err) {
        reject(err);
      }
      resolve(response);
    });
  });
}


async function updateFunds(fundId, paymentId, paymentIntent, claimedAmount, ccName, ccEmail, totaltip, ccProcessingFee, tipHidden) {
  return new Promise((resolve, reject) => {
    totaltip = parseFloat(parseInt((totaltip + .00001) * 100) / 100);
    ccProcessingFee = parseFloat(parseInt((ccProcessingFee + .00001) * 100) / 100);

    console.log("Here are the deets in this format: ccName, ccEmail, totaltip, ccProcessingFee" + ccName, ccEmail, totaltip, ccProcessingFee);

    try {
      let amount;
      const d = new Date();
      let date = d.getTime();

      connection.query(`update transactions set succeeded = 1, date = ${date} where paymentid = ${connection.escape(paymentId)}`);

      let difference = Math.abs(claimedAmount - (paymentIntent.amount_received / 1.04 - paymentIntent.application_fee_amount) / 100);
      //console.log(difference, "      ", claimedAmount, '         ', (paymentIntent.amount_received / 1.04) - paymentIntent.application_fee_amount) / 100;
      //so that comments display the correct donated amount, minus potential card processing fees.   
      if (difference <= 1 || (claimedAmount + totaltip + ccProcessingFee) == paymentIntent.amount_received) {
        amount = claimedAmount;
      } else {
        amount = (paymentIntent.amount_received - paymentIntent.application_fee_amount) / 100;
      }
      //amounts are now verified?
      //send confirmation email here
      console.log("trying to call send email");
      try {
        sendConfirmationEmail(amount, ccName, ccEmail, totaltip, ccProcessingFee, fundId, d, tipHidden);
      } catch {
        console.log("Error sending confirmation email");
      }

      connection.query(`update transactions set amount = ${connection.escape(amount)} where paymentid = ${connection.escape(paymentId)}`);

      amount *= 100; // convert back into cents format for database. 
      connection.query(`select camFunds from campaigns where id = ${mysql.escape(fundId)}`, (error, response) => {
        if (error) {
          console.log("SQL Error: ", error);
        } else {
          try {
            let newAmount = response[0].camFunds + amount;
            connection.query(`UPDATE campaigns SET camFunds = ${mysql.escape(newAmount)} WHERE id = ${mysql.escape(fundId)};`, (e, r) => {
              if (e) {
                console.log(e, " is error to update campaign fund");
              } else {
                resolve("Updated Successfully!");
              }
            })
          } catch {
            reject("SQL Error. Fund Update Failed.")
          }
        }

      })
    } catch (err) {
      console.log(err);
      reject("Fund Update Failed");
    }
  })
}

function getStripeId(fundid) {
  return new Promise((resolve, reject) => {
    connection.query(`select stripeAccountId from campaigns where id = ${connection.escape(fundid)}`, (err, response) => {
      if (err) {
        reject(err);
      }
      resolve(response);
    });
  });
}

//todo: I coded this then found out it may be redundant :(
//returns funds raised and dollar goal, both in dollars NOT CENTS
app.get('/api/fundsRaised', async (req, res) => {
  let fundGoal, fundsRaised;

  try {

    fundGoal = await new Promise(function (resolve, reject) {
      connection.query(`select dollarGoal from campaigns where id = ${connection.escape(req.query.id)}`, (err, response) => {
        if (err) {
          reject(err);
        }
        console.log(response, `select dollarGoal from campaigns where id = ${connection.escape(req.query.id)}`);
        resolve(response[0]?.dollarGoal);
      })

    })

    fundsRaised = await new Promise(function (resolve, reject) {
      connection.query(`select camFunds from campaigns where id = ${connection.escape(req.query.id)}`, (err, response) => {
        if (err) {
          reject(err);
        }
        console.log(response, `select camFunds from campaigns where id = ${connection.escape(req.query.id)}`);
        resolve(response[0]?.camFunds / 100);
      })

    })

    var data = { fundsRaised, fundGoal };
    res.setHeader('Content-Type', 'application/json');
    console.log(data);
    return res.send(JSON.stringify(data));


  } catch (error) {
    console.log(error);
    return res.status(500).send("Error Retrieving Fundraiser Data");

  }
});


////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////


async function createUser(name, email, id, password, phone) { // I think should return a promise so that can do .then and .catch to handle 
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10).then(function (passHash) {
      userSQL.query(`select * from users where email = ${mysql.escape(email)}`, (err, res) => {
        if (err || res.length != 0) {
          console.log("User Creation Rejected. Possible Duplicate Email.");
          reject("User Creation Rejected. Possible Duplicate Email.");
        } else {
          console.log(name, email, id, passHash);
          userSQL.query(`insert into users (name, email, userid, passHash, phone) values (${mysql.escape(name)}, ${mysql.escape(email)}, ${id}, "${passHash}", "${mysql.escape(phone)}");`, (err, res2) => {
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
        bcrypt.compare(password, res[0].passHash).then(
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
      createUser(req.body.name, req.body.email, Math.floor(Math.random() * (99999999 - 11111111 + 1) + 11111111), req.body.password, req.body.phone).then(function () {
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
    res.setHeader('Set-Cookie', `authentication=${token}; Secure; HttpOnly; Path=/; Max-Age=99999; SameSite=strict;`); //sets cookie
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

function verifyToken(req, res, next) {
  const token = req.cookies.authentication;
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};


app.get("/dashboard", async (req, res) => {
  //const token = req.header('Authorization');
  const token = req.cookies.authentication;
  if (!token) {
    return res.redirect("/signin")
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);  // important that you use jwt.verify not jwt.decode, decode doesn't verify! 
      //MAKE SURE TO SANITIZE USER ID! COULD BE CODE INJECTION!
      let id = decoded.userId;
      userSQL.query(`select * from users where userid = ${userSQL.escape(id)}`, async (err, res2) => {
        let fundId = res2[0].fundraisers;
        let camInfo = await connectSQL(fundId);
        let userInfo = await JSON.parse(camInfo[0].members)[mysql.escape(id)];
        let fundsRaised = await userInfo.fundsRaised;
        let emailsAdded = await userInfo.emailsAdded;
        let phonesAdded = await userInfo.phonesAdded;
        let memberGoal = await camInfo[0].memberGoal;

        if (!err) {
          if (res2[0].role == "admin") {
            res.render("dashboard", { id, name: res2[0].name, email: res2[0].email });
          } else {
            if (res2[0].fundraisers == null) {
              res.render("join", { id });
            } else {
              res.render("participantDash", { id, name: res2[0].name, email: res2[0].email, fundsRaised, emailsAdded, phonesAdded, memberGoal});
            }
          }
          console.log(res2);

        } else {
          console.log(err);
          res.sendStatus(500);
        }
      })
    } catch (error) {
      console.log("Dashboard error: ", error);
      return res.redirect("/signin")
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
  //todo: implement some sort of  csrf protection here + authentication + authorization checks 
  let token = req.cookies.authentication;
  if (token) {
    try {
      let userId = getUser(token);
      if (!userId == -1) {
        //const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // i think redundant
        //todo: authorization check of some sort here
        let randFundId = Math.floor(Math.random() * (999999 - 111111 + 1) + 111111);
        connection.query(`select * from campaigns where id = ${randFundId}`, (err, res) => {
          if (err || res.length != 0) {
            console.log(err);
            randFundId = Math.floor(Math.random() * (999999 - 111111 + 1) + 111111); //todo: better handle possible duplicate ids + implement same feature in other one + maeke join code
          } else {
            connection.query(`insert into campaigns (camName, id, camAdmin,members ) values (${mysql.escape("test1")}, ${randFundId},${mysql.escape(getUser(token))}, '{}');`, (err, res2) => {
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
      return res.redirect("/signin")
    }
  } else {
    return res.redirect("/signin");
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


//returns -1 for error, 0 for success, needs to be returning promise so that i can await it
function joinCampaign(userid, joincode) {
  return new Promise((resolve, reject) => {
    console.log("join campaign function called")
    let cleanU2 = mysql.escape(userid);
    connection.query(`update campaigns set members = JSON_SET(members, '$."${cleanU2}"',  JSON_OBJECT('fundsRaised', 0, 'phonesAdded', "[]", 'emailsAdded', "[]")) where joincode = ${mysql.escape(joincode)}`, (err, res) => {
      console.log("t2" + err);
      console.log("thing:" + JSON.stringify(res.affectedRows));
      if (err || res.affectedRows != 1) {
        console.log("error in adding user to campaign, returning -1")
        resolve(-1);
        return -1;
      }
      connection.query(`select id from campaigns where joincode = ${mysql.escape(joincode)}`, (error, id) => {
        if (error) {
          console.log(error);
          resolve(-1);
          return -1;
        } else {
          if (id && id[0]?.id) {
            console.log("the response from first query is " + JSON.stringify(id[0].id));
            userSQL.query(`update users set fundraisers = ${id[0].id} where userid = ${mysql.escape(userid)}`, (er, rs) => {
              console.log("set fundraisers value for that user id");
              if (er) {
                console.log("error in adding fundraisers value")
                console.log(er);
                resolve(-1);
                return -1;
              }
            });
          }
        }


      });
      console.log("joined!");
      resolve(0);
      return 0;


    });
  });

}


//input from body: fundraiser campaign id under campaignID
app.post("/joinCampaign", async (req, res) => {
  //todo: implement some sort of  csrf protection here + authentication + authorization checks 
  let token = req.cookies.authentication;
  console.log("recieved post to /joinCampaign");
  if (token) {
    try {
      let userId = getUser(token);
      console.log("user id is: ", userId);
      console.log("requested fund = " + req.body.campaignId);
      if (userId != -1) {
        let joinCampaignResult = await joinCampaign(userId, req.body.campaignId);

        console.log("result of joining campaign is " + joinCampaignResult);
        if (joinCampaignResult == -1 || joinCampaignResult == undefined) {
          res.sendStatus(400);
        } else {
          res.sendStatus(200);
          console.log("Joined campaign!")
        }
      } else {
        console.log("No userid found. Redirecting to signin.")
        return res.redirect("/signin");
      }
    } catch (error) {
      console.log(error + " was the error, redirecting to signin.");
      return res.redirect("/signin")
    }
  } else {
    console.log("No authorization, redirecting to signin. ")
    return res.redirect("/signin");
  }
});

app.get("/api/fetchComments", async (req, res) => {
  console.log(req.query.id);
  let fundId = req.query.id;
  let startIndex = req.query.startIndex; // the index of the first comment, goes to that + 6 if possible
  let numResults = 6;

  connection.query(`Select comment,date,amount,commentName,supporting,rownum from transactions where fundraiserid = ${connection.escape(fundId)} and rownum > ${connection.escape(startIndex)} and succeeded = 1 LIMIT ${numResults};`, (err, results) => {
    if (err) {
      console.log(err);
      return res.sendStatus(400);
    } else {
      return res.send(results);
    }
  });
});

app.get('/api/getNumberOfComments', async (req, res) => {
  fundId = req.query.id;
  /*connection.query(`SELECT COUNT(*) from transactions where fundraiserid = ${connection.escape(fundId)} and succeeded = 1;`, (err, results) => {
    if (err) {
      console.log(err);
      return res.sendStatus(400);
    } else {
      return res.send(results[0]);
      
    }
  });*/

})


/*
const d = new Date();
    let date = d.getTime();
update transactions set succeeded = 1, date = ${date} where paymentid =
*/

//todo: verify that the person donated the amount that they are claiming to have. 
app.post("/api/submitComment", async (req, res) => {
  try {
    console.log(req.body.paymentId);
    const paymentId = connection.escape(req.body.paymentId);
    console.log(paymentId);

    const paymentIntent = await stripe.paymentIntents.retrieve(req.body.paymentId);

    if (paymentIntent.status !== 'succeeded') {
      console.log(paymentIntent.status);
      return res.sendStatus(400);

    }

    // Check comment length
    let name = req.body.name || "Anonymous";
    let comment = req.body.message;
    console.log("Original comment" + comment);
    /*if (comment.length > 250) {
      console.log("Comment too long. Should return 400.");
      return res.sendStatus(400); // Return 400 if comment is too long
    }*/

    // Escape HTML to prevent XSS //NOT CURRENTLY DOING THINGS B/C the escape function is off rn
    comment = escapeHtml(comment);
    name = escapeHtml(name);

    if (comment.length >= 300) {
      comment = comment.substring(0, 300);
    }
    if (name.length >= 32) {
      name = name.substring(0, 32);
    }

    console.log("cleaned? comment" + comment);

    // Construct SQL query
    const query = `
      UPDATE transactions 
      SET 
        comment = ${connection.escape(comment)},
        commentName = ${connection.escape(name)}
      WHERE 
        paymentid = ${paymentId};
    `;

    // Execute SQL query
    connection.query(query, (error, result) => {
      if (error) {
        console.error("Error executing query:", error);
        return res.sendStatus(500);
      }

      console.log("Comment updated successfully:", result, "   Here is the query: ", query);
      return res.sendStatus(200);
    });

  } catch (error) {
    console.error("Error handling request:", error);
    return res.sendStatus(500);
  }
});

function escapeHtml(unsafe) {
  /*
  unsafe = unsafe+"";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");*/
  console.log("temp not escaping input! ");
  return unsafe;
}

//code from stripe
app.post('/account_session', async (req, res) => {
  try {
    const accountSession = await stripe.accountSessions.create({
      account: `${req.body.connectedAccountId}`,
      components: {
        payments: {
          enabled: true,
          features: {
            refund_management: true,
            dispute_management: true,
            capture_payments: true,
          }
        },
      }
    });

    res.json({
      client_secret: accountSession.client_secret,
    });
  } catch (error) {
    console.error('An error occurred when calling the Stripe API to create an account session', error);
    res.status(500);
    res.send({ error: error.message });
  }
});

async function sendConfirmationEmail(amount, ccName, ccEmail, totaltip, ccProcessingFee, fundId, date, tipHidden) {

  console.log("Email sending called!!!!!!!!!!!!!!!!!!!!!")
  let campaignDetails = await connectSQL(fundId);
  let fundName = campaignDetails[0].camName;
  var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  let potentialCommentOut = "";
  let potentialCommentOut2 = "";

  if (tipHidden == 1) {
    potentialCommentOut = "<!--";
    potentialCommentOut2 = "-->";
  }

  sendSmtpEmail = {
    to: [{
      email: `${ccEmail}`,
      name: `${ccName}`
    }],
    sender: {
      name: 'Bowie Fundraising',
      email: 'chenarthur41@gmail.com'
    },
    htmlContent: `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">

<head>
<title></title>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!--><!--<![endif]-->
<style>
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    padding: 0;
  }

  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: inherit !important;
  }

  #MessageViewBody a {
    color: inherit;
    text-decoration: none;
  }

  p {
    line-height: inherit
  }

  .desktop_hide,
  .desktop_hide table {
    mso-hide: all;
    display: none;
    max-height: 0px;
    overflow: hidden;
  }

  .image_block img+div {
    display: none;
  }

  sup,
  sub {
    line-height: 0;
    font-size: 75%;
  }

  #converted-body .list_block ul,
  #converted-body .list_block ol,
  .body [class~="x_list_block"] ul,
  .body [class~="x_list_block"] ol,
  u+.body .list_block ul,
  u+.body .list_block ol {
    padding-left: 20px;
  }

  @media (max-width:520px) {
    .desktop_hide table.icons-inner {
      display: inline-block !important;
    }

    .icons-inner {
      text-align: center;
    }

    .icons-inner td {
      margin: 0 auto;
    }

    .mobile_hide {
      display: none;
    }

    .row-content {
      width: 100% !important;
    }

    .stack .column {
      width: 100%;
      display: block;
    }

    .mobile_hide {
      min-height: 0;
      max-height: 0;
      max-width: 0;
      overflow: hidden;
      font-size: 0px;
    }

    .desktop_hide,
    .desktop_hide table {
      display: table !important;
      max-height: none !important;
    }
  }
</style><!--[if mso ]><style>sup, sub { font-size: 100% !important; } sup { mso-text-raise:10% } sub { mso-text-raise:-10% }</style> <![endif]-->
</head>

<body class="body" style="background-color: #ffffff; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
<table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
  <tbody>
    <tr>
      <td>
        <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="heading_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <tr>
                            <td class="pad" style="background-color: #29335c;">
                              <h1 style="margin: 0; color: #ffffff; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 38px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: center; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 45.6px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Thank you for your donation! </span></h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-2" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="paragraph_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                          <tr>
                            <td class="pad" style="padding-bottom:30px;padding-left:10px;padding-right:10px;padding-top:30px;">
                              <div style="color:#444a5b;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:17px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:25.5px;">
                                <p style="margin: 0;">Thank you so much for contributing to the success of ${fundName}! We couldn't do it without your support.&nbsp;</p>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="heading_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <tr>
                            <td class="pad">
                              <h3 style="margin: 0; color: #29335c; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 28.799999999999997px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Donation breakdown:</span></h3>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-4" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="list_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word; color: #101218; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; font-weight: 400; letter-spacing: 0px; line-height: 120%; text-align: left; mso-line-height-alt: 19.2px;">
                          <tr>
                            <td class="pad">
                              <div style="margin-left:-20px">
                                <ul style="margin-top: 0; margin-bottom: 0; list-style-type: revert;">
                                  <li style="Margin: 0 0 9px 0;">You donated ${Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseInt(amount * 100) / 100 + parseInt(totaltip * 100) / 100 + parseInt(ccProcessingFee * 100) / 100)} on ${date.toLocaleDateString("en-US", options)}&nbsp;<div style="margin-left:-10px">
                                      <ul style="margin-top: 0; margin-bottom: 0; list-style-type: revert;">
                                        <li style="Margin: 9px 0 9px 0;">Your donation was ${Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseInt(amount * 100) / 100)}</li>
                                        <li style="Margin: 0 0 9px 0;">You donated ${Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseInt(ccProcessingFee * 100) / 100)} to cover credit card processing fees</li>
                                        `+ potentialCommentOut + `<li style="Margin: 0 0 9px 0;">You tipped ${Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseInt(totaltip * 100) / 100)} to support the student developer ❤️</li>` + potentialCommentOut2 + `
                                      </ul>
                                    </div>
                                  </li>
                                  <li style="Margin: 0 0 9px 0;">Tax deduction information: This fundraiser is a part of James Bowie High School (Tax ID/EIN: 74-6000064)&nbsp;</li>
                                  <li style="Margin: 0 0 9px 0;">No goods or services were provided in exchange for this contribution</li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-5" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="heading_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <tr>
                            <td class="pad" style="padding-bottom:10px;padding-left:10px;padding-right:10px;padding-top:50px;text-align:center;width:100%;">
                              <h3 style="margin: 0; color: #29335c; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 28.799999999999997px;"><span class="tinyMce-placeholder" style="word-break: break-word;">Support and Refunds:</span></h3>
                            </td>
                          </tr>
                        </table>
                        <table class="paragraph_block block-2" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                          <tr>
                            <td class="pad">
                              <div style="color:#444a5b;direction:ltr;font-family:Arial, 'Helvetica Neue', Helvetica, sans-serif;font-size:16px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:19.2px;">
                                <p style="margin: 0;">Donors to this fundraiser can request refunds only during the period the campaign is active. Please call or send a text to <a href="tel:512-643-4108" target="_blank" style="text-decoration: underline; color: #001992;" rel="noopener">512-643-4108</a> with details of your donation to help resolve any issues related to your experience.</p>
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-6" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 30px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="heading_block block-1" width="100%" border="0" cellpadding="10" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <tr>
                            <td class="pad" style="background-color:#29335c; height:100px;">
                              <h1 style="margin: 0; color: #1e0e4b; direction: ltr; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 38px; font-weight: 700; letter-spacing: normal; line-height: 120%; text-align: left; margin-top: 0; margin-bottom: 0; mso-line-height-alt: 45.6px;"><span class="tinyMce-placeholder" style="word-break: break-word;"></span></h1>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
        <table class="row row-7" align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #ffffff;">
          <tbody>
            <tr>
              <td>
                <table class="row-content stack" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 500px; margin: 0 auto;" width="500">
                  <tbody>
                    <tr>
                      <td class="column column-1" width="100%" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; padding-bottom: 5px; padding-top: 5px; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                        <table class="icons_block block-1" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; text-align: center; line-height: 0;">
                          <tr>
                            <td class="pad" style="vertical-align: middle; color: #1e0e4b; font-family: 'Inter', sans-serif; font-size: 15px; padding-bottom: 5px; padding-top: 5px; text-align: center;"><!--[if vml]><table align="center" cellpadding="0" cellspacing="0" role="presentation" style="display:inline-block;padding-left:0px;padding-right:0px;mso-table-lspace: 0pt;mso-table-rspace: 0pt;"><![endif]-->
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table><!-- End -->
</body>

</html>`,
    subject: 'Your Donation Receipt',
    headers: {
      'X-Mailin-custom': 'custom_header_1:custom_value_1|custom_header_2:custom_value_2'
    }
  };


  apiInstance.sendTransacEmail(sendSmtpEmail).then(function (data) {
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
  }, function (error) {
    console.error(error);
  });
}



app.get('/api/getCamInfo', async (req, res) => {
  const id = parseInt(req.query.id);
  try {
    let results = await connectSQL(id);
    console.log(results);
    res.send(results[0]);

  } catch {
    console.log("error in getting cam info.");
  }

})
