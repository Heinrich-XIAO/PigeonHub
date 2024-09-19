console.log("flitRenderer.js loaded");
let skip = 0;
const limit = 10;

function makeUrlsClickable(content) {
  // More thorough sanitization of input content
  const sanitizedContent = sanitizeHtml(content);

  // General URL regex
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  
  // Image host regex
  const imageHostRegex = /^(https?:\/\/(?:i\.)?imgur\.com\/|https?:\/\/(?:i\.)?imgbb\.com\/|https?:\/\/upload\.wikimedia\.org\/|https?:\/\/commons\.wikimedia\.org\/)/;
  
  // Adjusted username regex pattern to capture dynamic usernames
  const usernameRegex = /\((\w+):\)/gi;
  
  // Function to check if URL ends with an image file extension
  function isImageUrl(url) {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  }
// Helper function for sanitizing HTML
function sanitizeHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const textNodes = doc.body.getElementsByTagName('*');
  
  for (let node of textNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      continue;
    }
    if (/^(script|style)$/.test(node.tagName.toLowerCase())) {
      node.remove();
    } else {
      node.innerHTML = '';
    }
  }
  
  return doc.body.innerHTML;
}
  let modifiedContent = sanitizedContent.replace(urlRegex, function(url) {
    const element = document.createElement('a');
    
    if (imageHostRegex.test(url) && isImageUrl(url)) {
      const imgElement = document.createElement('img');
      imgElement.src = encodeURI(url); // Encode the URL
      imgElement.width = 120;
      imgElement.height = 120;
      
      // Wrap the <img> tag in an <a> tag
      element.href = url;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
      element.appendChild(imgElement);
    } else {
      // Handle non-image URLs as before
      element.href = encodeURI(url); // Encode the URL
      element.textContent = url;
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }
    
    return element.outerHTML;
  });

  // Replace usernames with clickable links dynamically
  modifiedContent = modifiedContent.replace(usernameRegex, (match, username) => {
    return `<a href="/user/${encodeURIComponent(username)}">${username}</a>`;
  });

  // Wrap images in a separate paragraph
  modifiedContent = modifiedContent.replace(/<img[^>]*>/g, '<p class="image-container">$&</p>');

  return modifiedContent;
}



const flits = document.getElementById('flits');
const addedElements = document.getElementById('addedElements');

function convertUSTtoEST(date) {
  const ustDate = new Date(date);
  const estDate = new Date(ustDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return estDate;
}

// Function to get the abbreviated month name
function getMonthAbbreviation(date) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[date.getMonth()];
}
let isRenderingFlits = false;
async function renderFlits() {
  
    if (isRenderingFlits) return;
      isRenderingFlits = true;
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
    isRenderingFlits = false; // Reset the flag after rendering is complete
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
    handle.innerText = '@' + json.flit.userHandle;
    handle.href = `user/${json.flit.userHandle}`;
    handle.classList.add("user-handle");

    let timestamp = new Date(json.flit.timestamp.replace(/\s/g, 'T') + "Z");
    timestamp = convertUSTtoEST(timestamp);
    console.log(timestamp, json.flit.timestamp);
    // Format the Date object
    let now = new Date();
    let formatted_timestamp;

    let options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'};
    formatted_timestamp = timestamp.toLocaleDateString(undefined, options);

    const timestampElement = document.createElement("span");
    timestampElement.innerText = formatted_timestamp;
    timestampElement.classList.add("user-handle");


    // Append the button to the flit_data_div
    flit_data_div.appendChild(username);
    flit_data_div.innerHTML += '&#160;&#160;';
    flit_data_div.appendChild(handle);
    flit_data_div.innerHTML += '&#160;·&#160;';
    flit_data_div.appendChild(timestampElement);
    flit_data_div.innerHTML += `<button style="float: right; border: none;" onclick='openReportModal(${json.flit.id})'><span class="iconify" data-icon="mdi:report" data-width="25"></span></button>`;


    flit.appendChild(flit_data_div);

    const flitContentDiv = document.createElement('div');
    flitContentDiv.classList.add('flit-content');



 
    const content = document.createElement('a');
    content.classList.add('flit-content');
    content.href = `/flits/${json.flit.id}`;

    // Process the content to make URLs clickable
const processedContent = makeUrlsClickable(json.flit.content);


    // Set the innerHTML of the content element to the processed text
    content.innerHTML += processedContent;

    flit.appendChild(content);
    
    
    if (json.flit.meme_link && (localStorage.getItem('renderGifs') == 'true' || localStorage.getItem('renderGifs') == undefined)) {
      const image = document.createElement('img');
      image.src = json.flit.meme_link;
      image.width = 100;
      flitContentDiv.appendChild(document.createElement('br'));
      flitContentDiv.appendChild(image);
    }

    if (json.flit.is_reflit) {
      const originalFlit = document.createElement('div');
      originalFlit.classList.add('flit');
      originalFlit.classList.add('originalFlit');
      originalFlit.dataset.flitId = json.flit.original_flit_id;
      if (await renderSingleFlit(originalFlit) == 'profane') {
        return 'profane';
      };
      flitContentDiv.appendChild(originalFlit);
      console.log(flitContentDiv);
    }

    flit.appendChild(flitContentDiv);

    // Create a button element
    let reflit_button = document.createElement("button");
    reflit_button.classList.add("retweet-button");

    // Add an event listener to the button
    reflit_button.addEventListener("click", function() {
        reflit(json.flit.id);
    });

    // Create an icon element for the reflit button
    icon = document.createElement("span");
    icon.classList.add("iconify");
    icon.setAttribute("data-icon", "ps:retweet-1");

    // Append the icon to the button
    reflit_button.appendChild(icon);
    console.log(reflit_button)
    // Append the button to the flit
    flit.appendChild(reflit_button);
  }
  return flit;
}


const flitsList = document.getElementsByClassName('flit');

async function renderAll() {
  for (let i = 0; i < flitsList.length; i++) {
    renderSingleFlit(flitsList[i]);
  }
}

renderAll();
let scrollTimeoutId;
window.onscroll = function(ev) {
  clearTimeout(scrollTimeoutId);
  scrollTimeoutId = setTimeout(function() {
    if (Math.round(window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
      renderFlits();
    }
  }, 150);
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
