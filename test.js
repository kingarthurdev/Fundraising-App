var SibApiV3Sdk = require('sib-api-v3-sdk');
var defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization: api-key
require('dotenv').config();
var apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = env.SENDINBLUEAPIKEY;
var apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
var sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email




function sendConfirmationEmail(amount, ccName, ccEmail, totaltip, ccProcessingFee, fundId,date){
    let fundName; 

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
																		<li style="Margin: 0 0 9px 0;">You donated \$${amount} on ${date}&nbsp;<div style="margin-left:-10px">
																				<ul style="margin-top: 0; margin-bottom: 0; list-style-type: revert;">
																					<li style="Margin: 9px 0 9px 0;">Your donation was \$${amount-totaltip-ccProcessingFee}</li>
																					<li style="Margin: 0 0 9px 0;">You donated \$${ccProcessingFee} to cover credit card processing fees</li>
																					<li style="Margin: 0 0 9px 0;">You tipped \$${totaltip} to support the developer ❤️</li>
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
    
    
    apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
      console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    }, function(error) {
      console.error(error);
    });
}

sendConfirmationEmail(100, "joe", "spamsignupacc136@gmail.com", 101, 102, 1, "jan 1st, 2001");














/*require('dotenv').config();
const bcrypt = require('bcrypt'); //for user pass encryption

const express = require('express')
const mysql = require('mysql')
const app = express();
const port = 8000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

*/
/*const formData = require('form-data');
  const Mailgun = require('mailgun.js');
  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({username: 'api', key: process.env.MAILGUN_API_KEY || 'key-yourkeyhere'});
  
  mg.messages.create('sandbox-123.mailgun.org', {
        from: "Excited User <mailgun@sandbox2f72ff70678b4787ac5130f133adc63c.mailgun.org>",
        to: ["test@example.com"],
        subject: "Hello",
        text: "Testing some Mailgun awesomeness!",
        html: "<h1>Testing some Mailgun awesomeness!</h1>"
  })
  .then(msg => console.log(msg)) // logs response data
  .catch(err => console.log(err)); // logs any error
*/


async function a() {
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

      const accountLink = await stripe.accountLinks.create({
        account: 'acct_1P2z5VB4t7JHWBgS',
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://example.com/return',
        type: 'account_onboarding',
      });
      console.log(accountLink);*/


    let accountid = 'acct_1P2z5VB4t7JHWBgS';

    /*
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100,
      currency: "usd",
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true,
      },
      transfer_data: {destination: accountid},
      application_fee_amount:0,
    });
    console.log(paymentIntent);
    */

    const paymentIntent2 = await stripe.paymentIntents.update(
        'pi_3PEBSFBZCoGd2paD1VWwiWoe',
        {
            amount: 500,
            application_fee_amount: 100,
        }
    );
    console.log(paymentIntent2);
}

//a();






//TO-DO: make sure that the names of each fundraiser are in proper format (first letter of each word except certain ones are capitalized. )
/*const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'fundraisers'
});

let fundId = 1;
let startIndex = 0; // the index of the first comment, goes to that + 6 if possible
let numResults = 6;
connection.query(`Select comment,date,amount,commentName from transactions where fundraiserid = ${connection.escape(fundId)} and rownum >= ${connection.escape(startIndex)} LIMIT ${numResults};`, (err, results) => {
    if (err) {
        console.log(err);
    } else {
        console.log(results);
    }
});*/

/*
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