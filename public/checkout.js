//CHANGE THIS PUBLIC KEY TO THE REAL KEY ON DEPLOYMENT
const stripe = new Stripe("pk_test_51K668CBZCoGd2paD7MnHjpsXEJbq7wNTrySTJqg6yt0nZlaZ0rX3pvp9HZ4NYGQx6af6aF5h1rdZqk221p6gFgNg00NdPRRidt");

// The items the customer wants to buy --> need to change
//const items = [{ id: "xl-tshirt" }];
const url = new URLSearchParams(window.location.search)

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

//default donation amounts
let donationAmount = 100;
let processing = .04;
let tip = .15;
let tipdollars =0;
let totalamt; 
document.querySelector("#amount2").style.display = "none"; // hide by default


//stripe element
let elements;
let globalPaymentIntent;
let globalClientSecret;
let globalFundId;



if (url.has("donate")) {
  if (!isNaN(url.get("donate")) && url.get("donate") <= 999999) {
    donationAmount = url.get("donate");
  }
}

document.getElementById("amount").value = donationAmount;
document.getElementById("amount").addEventListener("input", updateDonation);
document.getElementById("amount2").addEventListener("input", updateTipAmount);

updateDonation();


//may want to add more stuff later, but good nuff for now 
function updateDonation(e) {
  console.log(e)
  if (e) {
    if (e.target.value.length > 6) {
      e.target.value = e.target.value.slice(0, 6); // Restricting to 6 digits
    } else if (e.target.value.length == 0) {
      donationAmount = 0;
    } else {
      donationAmount = e.target.value;
    }
  }
  
  let tipamt = parseFloat(donationAmount * tip);
  let fee = parseFloat(donationAmount * processing);
  if(tipdollars){
    totalamt = formatter.format(parseFloat(donationAmount) + tipamt + fee + parseFloat(tipdollars));
  }else{
    totalamt = formatter.format(parseFloat(donationAmount) + tipamt + fee);
  } 

  document.getElementById("donationAmount").innerHTML = formatter.format(donationAmount);
  document.getElementById("totalamt").innerHTML = totalamt;

  /*
  if(document.querySelector("#amount2").style.display != "hidden" && document.querySelector("#amount2").value!= ''){
    document.getElementById("totalamt").innerHTML = formatter.format(parseFloat(donationAmount) + tipamt + fee + parseFloat(document.querySelector("#amount2").value));
  }else{
    document.getElementById("totalamt").innerHTML = formatter.format(parseFloat(donationAmount) + tipamt + fee);
  }*/

  try {
    document.getElementById("feeamt").innerHTML = formatter.format(fee);
    document.getElementById("tipamt").innerHTML = formatter.format(tipamt);
  } catch (error) {
    console.log(error);
  }
}

function updateTipAmount(e){
  console.log(e.target.value);
  if (e) {
    if (e.target.value.length > 6) {
      e.target.value = e.target.value.slice(0, 6); // Restricting to 6 digits
    }
    tipdollars = Math.abs(e.target.value);
    updateDonation();
    
  }
}
function updateTipPercent(percent){
  tip = percent/100;
  if(percent ==0){
    document.querySelector("#amount2").style.display = "block";
  }else{
    document.querySelector("#amount2").style.display = "none";
  }
  
  updateDonation();
}

function updateCoverFees(){
  if(!document.querySelector("#covercardfees").checked){
    processing=0;
  }else{
    processing=.04;
  }
  updateDonation();
}

function toggleAboutProcessing(){
  if(document.getElementById("aboutprocessing").style.display == "none"){
      document.getElementById("aboutprocessing").style.display = "block";
  }else{
    document.getElementById("aboutprocessing").style.display = "none"
  }

}

initialize();
checkStatus();

document
  .querySelector("#payment-form")
  .addEventListener("submit", handleSubmit);

document.querySelector("#submit").addEventListener("click", clickrealbtn);
function clickrealbtn(){
  console.log("clicky");
  document.querySelector("#hiddensubmit").click();
}

// Fetches a payment intent and captures the client secret
async function initialize() {
  const fundId = window.location.pathname.split("/")[2];
  globalFundId = fundId;
  const response = await fetch("/create-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationAmount, fundId }),
  });

  const responseJson = await response.json();
  const { clientSecret } = responseJson;
  globalClientSecret = clientSecret;
  globalPaymentIntent = responseJson.paymentIntent.id;

  const appearance = {
    theme: 'stripe',
    // Variations here: https://stripe.com/docs/elements/appearance-api
  };

  elements = stripe.elements({ appearance, clientSecret });

  const paymentElementOptions = {
    layout: "tabs",
  };

  const paymentElement = elements.create("payment", paymentElementOptions);
  paymentElement.mount("#payment-element");
}

async function handleSubmit(e) {
  let donationAmount = parseFloat(totalamt.substring(1));
  e.preventDefault();
  setLoading(true);
  const updatedIntent = await fetch("/update-payment-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationAmount, PI: globalPaymentIntent }),   //NOTE THIS IS NOT THE ORIGIONAL VAR DONATION AMOUNT, IT'S ACTUALLY TOTAL AMOUNT 
  });

  //currently only way to implement this... 

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      // Make sure to change this to your payment completion page
      return_url: "http://localhost:8000/checkout/1", //"https://www.youtube.com/watch?v=PRu27S0isWY",
    },
    redirect: 'if_required',
  });

  const verified = await fetch("/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationAmount, id: globalPaymentIntent, fundId: globalFundId }),
  });

  //this line of code is a bit repetitive, but ah well. to make better, grab status from backend. 
  const { paymentIntent } = await stripe.retrievePaymentIntent(globalClientSecret);
  switch (paymentIntent.status) {
    case "succeeded":
      showMessage("Payment succeeded!");
      break;
    case "processing":
      showMessage("Your payment is processing.");
      break;
    case "requires_payment_method":
      showMessage("Your payment was not successful, please try again.");
      break;
    default:
      showMessage("Something went wrong.");
      break;
  }

  /*
  console.log(elements);
  console.log("global payment intent: "+ globalPaymentIntent);
  const { error } = await fetch("/confirm-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({PI:globalPaymentIntent, payment_method:elements}), 
  });
  console.log(error);
  */

  // This point will only be reached if there is an immediate error when
  // confirming the payment. Otherwise, your customer will be redirected to
  // your `return_url`. For some payment methods like iDEAL, your customer will
  // be redirected to an intermediate site first to authorize the payment, then
  // redirected to the `return_url`.
  /*
  if (error.type === "card_error" || error.type === "validation_error") {
    console.log(error.message);
    showMessage(error.message);
  } else {
    showMessage("An unexpected error occurred.");
    console.log("An unexpected error occurred.");
  }
  */
  setLoading(false);
  console.log("handleSubmit called");


}

// Fetches the payment intent status after payment submission
async function checkStatus() {
  const clientSecret = new URLSearchParams(window.location.search).get(
    "payment_intent_client_secret"
  );

  if (!clientSecret) {
    return;
  }

  const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

  switch (paymentIntent.status) {
    case "succeeded":
      showMessage("Payment succeeded!");
      break;
    case "processing":
      showMessage("Your payment is processing.");
      break;
    case "requires_payment_method":
      showMessage("Your payment was not successful, please try again.");
      break;
    default:
      showMessage("Something went wrong.");
      break;
  }
}

// ------- UI helpers -------

function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");

  messageContainer.classList.remove("hidden");
  messageContainer.textContent = messageText;

  setTimeout(function () {
    messageContainer.classList.add("hidden");
    messageContainer.textContent = "";
  }, 4000);
}

// Show a spinner on payment submission
function setLoading(isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("#submit").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("#submit").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
}