console.log("flitRenderer.js loaded");

const flits = document.getElementById('flits');
const addedElements = document.getElementById('addedElements');
let skip = 0;
let limit = 10;

function convertUSTtoEST(date) {
  const ustDate = new Date(date);
  const estDate = new Date(ustDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return estDate;
}

function convertDateFormat(inputDate) {
  // Parse the input date string
  const dateObject = new Date(inputDate);

  // Format the date in the desired output format
  const outputDate = dateObject.toISOString().replace(/T/, ' ').replace(/\.\d+Z$/, '');

  return outputDate;
}

// Function to get the abbreviated month name
function getMonthAbbreviation(date) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[date.getMonth()];
}

async function renderFlits() {
  const res = await fetch(`/api/get_flits?skip=${skip}&limit=${limit}`); //////////////////////////////// possible http param inject
  const json = await res.json();
  for (let flitJSON of json) {
    let flit = document.createElement("div");
    flit.classList.add("flit");
    flit = await renderFlitWithFlitJSON({"flit": flitJSON}, flit);
    if (flit === 'profane') {
      continue;
    }
    flits.appendChild(flit);
  }
  checkGreenDot();
  skip += limit;
}
renderFlits();

async function renderSingleFlit(flit) {
  const flitId = flit.dataset.flitId;
  const res = await fetch(`/api/flit?flit_id=${flitId}`);
  if (await res.clone().text() == 'profane') {
    return 'profane';
  }
  const json = await res.json();
  flit = renderFlitWithFlitJSON(json, flit);

  flit.href = `/flits/${flitId}`;
  checkGreenDot();
  return flit;
}

async function renderFlitWithFlitJSON(json, flit) {
  if (json['flit']) {
    const flit_data_div = document.createElement('div');
    flit_data_div.classList.add("flit-username");
    flit_data_div.classList.add("flit-timestamp");

    const username = document.createElement('a');
    username.innerText = json.flit.username;
    username.href = `user/${json.flit.userHandle}`;
    username.classList.add("user-handle");

    const handle = document.createElement('a');
    handle.innerText = '@' + json.flit.userhandle;
    handle.href = `user/${json.flit.userhandle}`;
    handle.classList.add("user-handle");
    
    let timestamp = new Date(convertDateFormat(json.flit.timestamp));
    // Format the Date object
    let now = new Date();
    let options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'};
    let formatted_timestamp = timestamp.toLocaleDateString(undefined, options);

    const timestampElement = document.createElement("span");
    timestampElement.innerText = formatted_timestamp;
    timestampElement.classList.add("user-handle");

    // Create a button element
    let report = document.createElement("button");
    report.style.float = "right";
    report.style.border = "none";

    // Add an event listener to the button
    report.addEventListener("click", function() {
        openReportModal(json.flit.id);
    });

    // Create an icon element for the button
    let icon = document.createElement("span");
    icon.classList.add("iconify");
    icon.setAttribute("data-icon", "mdi:report");
    icon.setAttribute("data-width", "25");

    // Append the icon to the button
    report.appendChild(icon);

    // Append the button to the flit_data_div
    flit_data_div.appendChild(report);
    flit_data_div.appendChild(username);
    flit_data_div.innerHTML += '&#160;&#160;';
    flit_data_div.appendChild(handle);
    flit_data_div.innerHTML += '&#160;·&#160;';
    flit_data_div.appendChild(timestampElement);


    flit.appendChild(flit_data_div);

    const flitContentDiv = document.createElement('div');
    flitContentDiv.classList.add('flit-content');



    const content = document.createElement('a');
    content.innerText = json.flit.content + ' ' + json.flit.hashtag;
    content.href = `/flits/${json.flit.id}`;

    flitContentDiv.appendChild(content);
    if (json.flit.meme_link && (localStorage.getItem('renderGifs') == 'true' || localStorage.getItem('renderGifs') == undefined)) {
      const image = document.createElement('img');
      image.src = json.flit.meme_link;
      image.width = 100;
      flitContentDiv.appendChild(document.createElement('br'));
      flitContentDiv.appendChild(image);
    }

    flit.appendChild(flitContentDiv);
    
    if (json.flit.is_reflit) {
      const originalFlit = document.createElement('div');
      originalFlit.classList.add('flit');
      originalFlit.classList.add('originalFlit');
      originalFlit.dataset.flitId = json.flit.original_flit_id;
      if (await renderSingleFlit(originalFlit) == 'profane') {
        return 'profane';
      };
      flitContentDiv.appendChild(document.createElement('br'));
      flitContentDiv.appendChild(originalFlit);
      flit.appendChild(flitContentDiv);
    }


    // Create a button element
    let reflit = document.createElement("button");
    reflit.classList.add("retweet-button");

    // Add an event listener to the button
    reflit.addEventListener("click", function() {
        reflit(json.flit.id);
    });

    // Create an icon element for the reflit button
    icon = document.createElement("span");
    icon.classList.add("iconify");
    icon.setAttribute("data-icon", "ps:retweet-1");

    // Append the icon to the button
    reflit.appendChild(icon);

    // Append the button to the flit
    flit.appendChild(reflit);
  }
  return flit;
}

const flitsList = document.getElementsByClassName('flit');

async function renderAll() {
  for (let i = 0; i < flitsList.length; i++) {
    await renderSingleFlit(flitsList[i]);
  }
}

renderAll();

window.onscroll = function (ev) {
  if (Math.round(window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
    renderFlits();
  }
};

async function reflit(id) {
  const res = await fetch(`/api/flit?flit_id=${id}`);
  const json = await res.json();
  
  let flit = document.createElement('div');
  flit.classList.add('flit');
  flit = await renderFlitWithFlitJSON(json, flit);
  addedElements.appendChild(flit);
  const original_flit_id_input = document.getElementById('original_flit_id');

  original_flit_id_input.value = json.flit.id;
}

async function checkGreenDot() {
  const res = await fetch("/api/render_online");
  const data = await res.json();
  // Get the list of online users
  const onlineUsers = Object.keys(data);

  // Update the user page
  const handles = document.querySelectorAll(".user-handle");

  handles.forEach((handle, index) => {
    if (index % 3 != 0) {
      return;
    }
    // Remove the green circle from the user
    const nextSibling = handle.nextSibling;
    if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE && (nextSibling.style.backgroundColor === "green" || nextSibling.style.backgroundColor === "grey")) {
      nextSibling.parentNode.removeChild(nextSibling);
    }
  
    // Check if the user is online
    if (onlineUsers.includes(handle.innerText)) {
      // Add a green circle next to the user's handle
      const greenCircle = document.createElement("span");
      greenCircle.style.backgroundColor = "green";
      greenCircle.style.borderRadius = "50%";
      greenCircle.style.width = "10px";
      greenCircle.style.height = "10px";
      greenCircle.style.display = "inline-block";
      greenCircle.style.marginLeft = "5px";
      handle.parentNode.insertBefore(greenCircle, handle.nextSibling);
    } else {
      // Add a green circle next to the user's handle
      const greyCircle = document.createElement("span");
      greyCircle.style.backgroundColor = "grey";
      greyCircle.style.borderRadius = "50%";
      greyCircle.style.width = "10px";
      greyCircle.style.height = "10px";
      greyCircle.style.display = "inline-block";
      greyCircle.style.marginLeft = "5px";
      handle.parentNode.insertBefore(greyCircle, handle.nextSibling);
    }
  })
}

window.setInterval(checkGreenDot, 5000);
