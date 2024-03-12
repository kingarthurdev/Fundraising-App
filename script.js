/*



todo: fix verify payment function, i think I need to use amount_recieved thing, but need to store that alone, not the entire payment id, because that is too big. 



*/








require('dotenv').config();
const bcrypt = require('bcrypt'); //for user pass encryption

const express = require('express')
const mysql = require('mysql')
const app = express();
const port = 8000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


//TO-DO: make sure that the names of each fundraiser are in proper format (first letter of each word except certain ones are capitalized. )
const connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'fundraisers'
});


app.listen(port, () => {
  console.log(`Fundraiser app listening on port ${port}`)
})
app.use(express.json());

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


/*
UPDATE campaigns
SET camFunds = mysql.escape()
WHERE camid = mysql.escape();

*/

app.set('view engine', 'ejs');
app.use("/", express.static('public'));


app.get('/fund/:name', async (req, res) => {
  //TO-DO: verify that name is an int or can just leave as is? What if I want to allow users to search by name? 
  const name = req.params.name;

  let outcome = {};
  try {
    outcome = await connectSQL(name);
    let fundName = await outcome[0]?.camName;
    res.render('mainFundraiserPage', { fundName, name });
  } catch (err) {
    console.log(err);
    return res.status(500).send('Error fetching data from database');
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
        //to-do: do promise something to work correctly;
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
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.donationAmount * 100,
      currency: "usd",
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
    });

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


app.post("/update-payment-intent", async (req, res) => {

  try {
    const paymentIntent = await stripe.paymentIntents.update(
      req.body.PI,
      {
        amount: req.body.donationAmount * 100,
      }
    );
    res.sendStatus(200);
  } catch {
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
                                  updateFunds(req.body.fundId, req.body.id, paymentIntent).then(result=>{
                                      console.log(result);
                                      res.status(200).json({ message: result });
                                  }).catch(err=>{
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
async function updateFunds(fundId, paymentId, paymentIntent) {
  return new Promise((resolve, reject) => {
      try {
          connection.query(`update transactions set succeeded = 1 where paymentid = ${connection.escape(paymentId)}`);
          let amount = paymentIntent.amount_received;
          connection.query(`select camFunds from campaigns where id = ${mysql.escape(fundId)}`, (error, response) => {
              if (error) {
                  console.log("SQL Error: " , error);
              } else {
                  try {
                      let newAmount = response[0].camFunds + amount;
                      connection.query(`UPDATE campaigns SET camFunds = ${mysql.escape(newAmount)} WHERE id = ${mysql.escape(fundId)};`, (e, r) => {
                          if (e) {
                              console.log(e, " is error to update campaign fund");
                          }else{
                              resolve("Updated Successfully!");
                          }
                      })
                  } catch {
                      reject("SQL Error. Fund Update Failed.")
                  }
              }

          })
      } catch (err){
        console.log(err);
          reject("Fund Update Failed");
      }
  })
}