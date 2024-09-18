const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get('id');
const sourceId = urlParams.get('sourceId');

updateNames(sourceId);

document.querySelector('#fundLink').href = "/fund/" + sourceId;
document.querySelector("#submit").addEventListener("click", handleSubmit);

async function updateNames(sourceId) {
  let camInfo = await (await fetch("/api/getCamInfo?id=" + sourceId)).json();
  console.log(await camInfo.camName);
  document.querySelector("#fundName").innerHTML = await camInfo.camName;
  document.querySelector("#fundLogo").href = await camInfo.camImage; 
}
async function handleSubmit() {
  let name = document.querySelector("#name").value;
  let message = document.querySelector("#message").value;
  let paymentId = myParam;

  if (name == "" || name == "undefined" || name == "null") {
    name = "Anonymous"
  }

  fetch("/api/submitComment", {
    method: "POST",  // HTTP method
    headers: {
      "Content-Type": "application/json",  // Specify JSON content type
      "Accept": "application/json"  // Expect JSON response
    },
    body: JSON.stringify({
      name: name + "",
      message: message + "",
      paymentId: paymentId + "",
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      } else {
        window.location.href = "/fund/" + sourceId + "?share=true";
      }
      return response.json();  // Parse the JSON response
    })
    .then(data => console.log(data))  // Log the response data
    .catch(error => console.error("There was a problem with the fetch operation:", error));

}

