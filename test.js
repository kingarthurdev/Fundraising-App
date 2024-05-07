require('dotenv').config();
const bcrypt = require('bcrypt'); //for user pass encryption

const express = require('express')
const mysql = require('mysql')
const app = express();
const port = 8000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function a(){
    /*const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: 'jenny.rosen@example.com',
        capabilities: {
          card_payments: {
            requested: true,
          },
          transfers: {
            requested: true,
          },
        },
      });
      console.log(account);
*/
      const accountLink = await stripe.accountLinks.create({
        account: 'acct_1P2z5VB4t7JHWBgS',
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://example.com/return',
        type: 'account_onboarding',
      });
      console.log(accountLink);
}

a();





/*
//TO-DO: make sure that the names of each fundraiser are in proper format (first letter of each word except certain ones are capitalized. )
const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'fundraisers'
});


let a = '9999 or 1 = 1; -- '
connection.query(`select * from campaigns where id = ${mysql.escape(a)}`, (err, res)=>{
    console.log(res, err);
});




app.post("/verify-payment", async (req, res) => {

    getTransaction(req.body.id).then((response) => {
        if (response == null || response == undefined) {
            console.log("Transaction not found");
            return res.status(403).json("Invalid transaction"); // need to do a promise of some sort to return out of arrow function
        } else {
            try {
                if (response.succeeded != 1) {
                    stripe.paymentIntents.retrieve(response[0].paymentid).then(paymentIntent => {
                        if (paymentIntent.status === 'succeeded') {
                            connection.query(`select succeeded from transactions where paymentid = ${connection.escape(req.body.id)}`, (error, response) => {
                                if (JSON.stringify(response[0].succeeded) == "null" || JSON.stringify(response[0].succeeded) == 0) {
                                    // process to begin updating transactions to process new funds 
                                    updateFunds(req.body.fundId, req.body.id).then(res=>{
                                        res.status(200).json({ message: res });
                                    }).catch(err=>{
                                        res.status(400).json({ error: err });
                                    })
                                }
                            });
                        } else {
                            res.status(400).json({ error: 'Payment Failed' });
                        }

                    });
                } else {
                    return res.status(403).json("Transaction failed.");
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
async function updateFunds(fundId, paymentId) {
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
        } catch {
            reject("Fund Update Failed");
        }
    })
}

(async () => {
    try {
        const transaction = await getTransaction("pi_3OtCDgBZCoGd2paD11NeGX94");
        console.log(transaction[0]);
    } catch (error) {
        console.error(error);
    }
})();



*/