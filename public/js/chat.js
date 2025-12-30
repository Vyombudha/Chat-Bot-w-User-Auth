
const state = {
    chats: [],
    activeChatId: null,
    messages: []
};




const baseURL = 'http://10.21.4.255:3001';

/**
 * 
 * @param {string} url - the url of the route excluding base URL
 * @param {object} options - the body part of the fetch()
 * @returns {object} respone.json
 * @throws - Server Errors
 */
async function apiFetch(url, options = {}) {
    const response = await fetch(`${baseURL}${url}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options
    });

    if (response.status === 401 || response.status === 403) {
        alert("Session expired. Please login again.");
        window.location.href = "./landing.html";
        throw new Error("Unauthorized");
    }


    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "API Error");
    }

    return response.json();
}



// side bar tags
const slideBarBtn = document.querySelector("#slidebar");
const sideBar = document.querySelector('.sidebar');
const newChatBtn = document.querySelector(".newChat");
const chatsBar = document.querySelector('.chatsBar');


// header area tags
const middleDiv = document.querySelector('.middle');
const logoutBtn = document.querySelector("#logout");


async function logOutUser() {
    const url = '/user/logout';
    const options = {
        method: "POST",
    };

    try {
        await apiFetch(url, options);
        alert("Logged Out SuccessFully!");
        window.location.href = "./landing.html";
    } catch (error) {
        alert('Logout Failed, Try Later');
        console.error(error.message);
    }
}


logoutBtn.addEventListener("click", () => {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;
    logOutUser();
})





// main area tags  
const textArea = document.getElementById("prompt");
const contentDiv = document.querySelector(".content");
const chatArea = document.querySelector('.chatArea');



textArea.addEventListener("input", function () {





    // reset the height of this div 
    this.style.height = 'auto';


    // calculate upto 20% of contentDiv's max heigth

    const maxHeight = contentDiv.clientHeight * 0.3;

    // cap the limit between scrollHeight and content's hegith
    const newHeight = Math.min(this.scrollHeight, maxHeight);
    this.style.height = (newHeight) + "px";

    // 4. Handle scrollbar visibility
    if (this.scrollHeight > maxHeight) {
        this.style.overflowY = "auto";
    } else {
        this.style.overflowY = "hidden";
    }

});


slideBarBtn.addEventListener("click", () => {

    // slide the sidebar w/ transition class of collapsed
    sideBar.classList.toggle('collapsed');

    // change the icon in slideBarBtn too
    const isClosed = sideBar.classList.contains('collapsed');
    slideBarBtn.textContent = isClosed ? 'left_panel_open' : 'left_panel_close';
});






function restoreNewChatButton() {
    newChatBtn.innerHTML = `
        <span class="material-symbols-outlined">add_notes</span>
        <span>New Chat</span>
    `;
}

async function createChat(chatName) {
    const url = `/chats/new`;

    try {
        const data = await apiFetch(url, {
            method: "POST",
            body: JSON.stringify({
                chatName
            })
        });

        // log this 
        console.log(data.message + "with UUID : " + data.uuid);

        state.activeChatId = data.uuid;
        const chat = { chatName: data.chatName, uuid: data.uuid };
        loadChat(chat);


        // re load sideBar

        await loadChats();
    }
    catch (error) {
        console.error(error);
        alert("Server error: can't create new chats, try again later")
    }
}

async function showInputArea() {

    let input = document.createElement('input');
    input.type = 'text';
    input.placeholder = "Chat Name... ";
    input.classList.add("newChatName");

    // clear newChatBtn 
    newChatBtn.innerHTML = '';
    newChatBtn.appendChild(input);

    // focus on it
    input.focus();



    input.addEventListener("keydown", async (e) => {

        // if the key was enter, we will createChat()!!
        if (e.key === "Enter") {
            const chatName = input.value.trim();
            if (!chatName) return;

            await createChat(chatName);
            restoreNewChatButton();
        }

        // if the kye was esc we will restore  newChatBtn
        if (e.key === "Escape") {
            restoreNewChatButton();
        }
    });

}


newChatBtn.addEventListener("click", () => {
    showInputArea();
})


/**
 * 
 * @param {string} role - user , assistant
 * @param {string} content - content of the message
 */
function appendMsg(role, content) {
    const div = document.createElement('div');
    div.textContent = content;
    div.classList.add(role);
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight; // scroll of bottom
}



function renderChat() {
    chatArea.innerHTML = '';
    state.messages
        .filter(m => m.role !== 'system')
        .forEach(msg => {
            appendMsg(msg.role, msg.content);
        });

    chatArea.scrollTop = chatArea.scrollHeight; // scroll of bottom
}

async function loadChat(chat) {

    const { uuid } = chat;
    const url = `/chats/chat/${uuid}`;

    try {
        const data = await apiFetch(url, {});
        state.messages = data.messages;
        state.activeChatId = uuid

        // update the middleDiv to say the chatName
        middleDiv.textContent = data.chatName;

        // now render the chat
        renderChat();
    } catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}


function renderSideBar() {

    // empty the chatsBar
    chatsBar.innerHTML = '';

    // now we will loads  chats using state

    state.chats.forEach(chat => {
        const p = document.createElement('p');

        // fill in the chatName and data;
        p.textContent = chat.chatName;

        p.classList.add("chats");

        // add a property to loadChat upon click
        p.onclick = () => loadChat(chat);

        // append to chatsBar
        chatsBar.appendChild(p);
    })
}

async function loadChats() {
    const url = `/chats`
    try {
        const data = await apiFetch(url, {});
        // update state
        state.chats = data.chats;

        if (state.chats.length === 0) {
            state.messages = [];
            middleDiv.textContent = "No chats yet";
            renderChat();
        }

        // renderChats on sideBar
        renderSideBar();
    }
    catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}







async function updateChat(prompt) {
    const url = `/chats/${state.activeChatId}`;
    const options = {
        method: "PUT",
        body: JSON.stringify({
            message: {
                role: 'user',
                content: prompt
            }
        })
    };
    try {
        data = await apiFetch(url, options);
        // append as assistant
        appendMsg('assistant', data.reply);
    }
    catch (error) {
        console.error(error.message);
        alert(error.message);
    }
}




textArea.addEventListener("keydown", async (e) => {

    // if we onlt hit enter, without shitKey, we will first prevent default behaviour i.e new line
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const prompt = textArea.value.trim(); // get prompt from it's textContent;
        if (!prompt) {
            return;
        }
        // append as user
        appendMsg('user', prompt);
        textArea.value = '';
        textArea.style.height = 'auto';

        await updateChat(prompt);
    }
})





// load chats each refresh
loadChats();


