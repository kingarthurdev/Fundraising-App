const express = require("express");
const app = express();

const stripe = require("stripe")(
  // This is a placeholder - it should be replaced with your secret API key.
  // Sign in to see your own test API key embedded in code samples.
  // Don’t submit any personally identifiable information in requests made with this key.
  'sk_test_51K668CBZCoGd2paDX22KXKcf4Esh3uUs4tYCCMW63gQiaG3f3SKLuywRO7h8bc3dJusgibDlfRqNKia38sgwNzQb00b3qJkj8t',
  {
    apiVersion: "2023-10-16",
  }
);

app.use(express.static("dist"));
app.use(express.json());

app.post("/account_link", async (req, res) => {
  try {
    const { account } = req.body;

    const accountLink = await stripe.accountLinks.create({
      account: account,
      return_url: `${req.headers.origin}/return/${account}`,
      refresh_url: `${req.headers.origin}/refresh/${account}`,
      type: "account_onboarding",
    });

    res.json(accountLink);
  } catch (error) {
    console.error(
      "An error occurred when calling the Stripe API to create an account link:",
      error
    );
    res.status(500);
    res.send({ error: error.message });
  }
});

app.post("/account", async (req, res) => {
  try {
    const account = await stripe.accounts.create({});

    res.json({
      account: account.id,
    });
  } catch (error) {
    console.error(
      "An error occurred when calling the Stripe API to create an account",
      error
    );
    res.status(500);
    res.send({ error: error.message });
  }
});

app.get("/*", (_req, res) => {
  res.sendFile(__dirname + "/dist/index.html");
});

app.listen(4242, () => console.log("Node server listening on port 4242! Visit http://localhost:4242 in your browser."));