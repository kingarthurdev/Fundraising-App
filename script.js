/*


todo: instead of doing a verify payment function, I need to implement a webhook that listens in for stripe requests, using that to verify 
todo: ensure no multiple passes through the update funds -- no false inflation
todo: pull account balance directly from stripe connected account, that way 0% accountability on my end. Well actually... what if there are multiple fundraisers per account? 
todo: make sure that only the $ that should go to the fundraiser is recorded, minus tips and processing fees


*/

require('dotenv').config();
const bcrypt = require('bcrypt'); //for user pass encryption
const port = 80;
const express = require('express')
const mysql = require('mysql')
const app = express();
app.disable('x-powered-by'); // prevent enumeration of what backend is used
app.listen(port, () => {
  console.log(`Fundraiser app listening on port ${port}`)
})
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
      application_fee_amount: 1000,
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
app.post("/update-payment-intent", async (req, res) => {

  let customer;
  let name = req.body.custName + "";
  let email = req.body.custEmail + "";
  try {
    try {
      customer = await stripe.customers.create({
        name: name,
        email: email,
      });
      console.log("New customer, here is the name and email: " + req.body.custName + " : " + req.body.custEmail);
    } catch {
      console.log("Customer creation failed. Possibly because they already exist. Ignoring for now...")
    }


    let cleanDonation = mysql.escape(req.body.totaldonation);
    cleanDonation = cleanDonation.replace(/^'|'$/g, "").replaceAll(",", "");
    cleanDonation = parseInt(parseFloat(cleanDonation) * 100);



    if (cleanDonation > 99999999) {
      cleanDonation = 99999998;
    }
    let totalint = cleanDonation;

    if (customer) {
      let paymentIntent = await stripe.paymentIntents.update(
        req.body.PI,
        {
          amount: totalint,
          application_fee_amount: 1000,
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
          application_fee_amount: 1000,
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
                  updateFunds(req.body.fundId, req.body.id, paymentIntent, req.body.donationAmount).then(result => {
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


async function updateFunds(fundId, paymentId, paymentIntent, claimedAmount) {
  return new Promise((resolve, reject) => {
    try {
      let amount;
      const d = new Date();
      let date = d.getTime();

      connection.query(`update transactions set succeeded = 1, date = ${date} where paymentid = ${connection.escape(paymentId)}`);

      let difference = Math.abs(claimedAmount - (paymentIntent.amount_received / 1.04 - paymentIntent.application_fee_amount) / 100);
      //console.log(difference, "      ", claimedAmount, '         ', (paymentIntent.amount_received / 1.04) - paymentIntent.application_fee_amount) / 100;
      //so that comments display the correct donated amount, minus potential card processing fees.   
      if (difference <= 1) {
        amount = claimedAmount;
      } else {
        amount = (paymentIntent.amount_received - paymentIntent.application_fee_amount) / 100;
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
    return res.redirect("/login")
  } else {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);  // important that you use jwt.verify not jwt.decode, decode doesn't verify! 
      //MAKE SURE TO SANITIZE USER ID! COULD BE CODE INJECTION!
      let id = decoded.userId;
      userSQL.query(`select * from users where userid = ${userSQL.escape(id)}`, (err, res2) => {
        if (!err) {
          if (res2[0].role == "admin") {
            res.render("dashboard", { id, name: res2[0].name, email: res2[0].email });
          } else {
            if (res2[0].fundraisers == null) {
              res.render("join", { id });
            } else {
              res.render("participantDash", { id, name: res2[0].name, email: res2[0].email });
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
      return res.redirect("/login")
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
            connection.query(`insert into campaigns (camName, id, camAdmin ) values (${mysql.escape("test1")}, ${randFundId},${mysql.escape(getUser(token))});`, (err, res2) => {
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
      return res.redirect("/login")
    }
  } else {
    return res.redirect("/login");
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
    connection.query(`update campaigns set members = JSON_SET(members, '$."${cleanU2}"', 0) where joincode = ${mysql.escape(joincode)}`, (err, res) => {
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
        console.log("No userid found. Redirecting to login.")
        return res.redirect("/login");
      }
    } catch (error) {
      console.log(error + " was the error, redirecting to login.");
      return res.redirect("/login")
    }
  } else {
    console.log("No authorization, redirecting to login. ")
    return res.redirect("/login");
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
    console.log("Original comment"+ comment);
    /*if (comment.length > 250) {
      console.log("Comment too long. Should return 400.");
      return res.sendStatus(400); // Return 400 if comment is too long
    }*/
    
    // Escape HTML to prevent XSS
    comment = escapeHtml(comment);
    name = escapeHtml(name);
    console.log("cleaned? comment"+ comment);

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

      console.log("Comment updated successfully:", result);
      return res.sendStatus(200);
    });

  } catch (error) {
    console.error("Error handling request:", error);
    return res.sendStatus(500);
  }
});

function escapeHtml(unsafe) {
  unsafe = unsafe+"";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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



