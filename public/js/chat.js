const baseURL = 'http://localhost:3001';

/**
 * Global State 
 * Store the Backend Chat repsonse and then used for Rendering
 */
const state = {
    chatsOrder: [],
    chatsObj: {},
    activeChatId: null,
    activeChatMessages: [],
    activeEventSource: null,
    isLoading: false
};




// ---------------------------------------------------- Getting Tags  ---------------------------------------------------- //
// side bar tags
const slideBarBtn = document.querySelector("#slidebar");
const sideBar = document.querySelector('.sidebar');
const newChatBtn = document.querySelector(".newChat");
const chatsBar = document.querySelector('.chatsBar');


// header area tags
const middleDiv = document.querySelector('.middle');
const logoutBtn = document.querySelector("#logout");



// main area tags  
const textArea = document.getElementById("prompt");
const contentDiv = document.querySelector(".content");
const chatArea = document.querySelector('.chatArea');


// ---------------------------------------- Event Handlers ---------------------------------------- // 

logoutBtn.addEventListener("click", () => {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;
    logOutUser();
})

newChatBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    // if the user click on new Chat, We'll setState, clear previous activeMessage and activeChatId nad close any active SSE and re-render
    state.activeEventSource?.close();
    setState(() => {
        textArea.disabled = false;
        state.activeEventSource = null;
        state.activeChatId = null;
        state.activeChatMessages = [];
    }, { renderSideBar: true, renderChat: true });

})

contentDiv.addEventListener("click" , () => {
    const isCollapsed = sideBar.classList.contains("collapsed");
    console.log("Content Div was Clicked!");
    const width = window.innerWidth;
    if(width < 768 &&  !isCollapsed){
        sideBar.classList.add("collapsed");
        contentDiv.classList.remove("overlapped");
        slideBarBtn.textContent = 'right_panel_close';

        console.log("Focused on Content Div");
    }
})


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


textArea.addEventListener("keydown", async (e) => {
    e.stopPropagation();
    // if we onlt hit enter, without shitKey, we will first prevent default behaviour i.e new line
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const prompt = textArea.value.trim(); // get prompt from it's textContent;
        if (!prompt) {
            return;
        }

        if (!state.activeChatId) {
            // it means the newchatBtn was clicked  or we just refreshed the page. Either way, we'll create a new chat
            await createChat(prompt);
            if (!state.activeChatId) return; // chat creation failed
        }
        textArea.value = '';
        textArea.style.height = 'auto';
        await updateChat(prompt);
    }
})



slideBarBtn.addEventListener("click", () => {
    console.log("sidebar clicked");
    // slide the sidebar w/ transition class of collapsed
    sideBar.classList.toggle('collapsed');
    contentDiv.classList.toggle("overlapped");

    // change the icon in slideBarBtn too
    const isClosed = sideBar.classList.contains('collapsed');
    slideBarBtn.textContent = isClosed ? 'left_panel_open' : 'left_panel_close';
});






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

    if (response.status === 204) {
        return {};
    }
    return response.json();
}


// ---------------------------------------- CRUD functions using State  ---------------------------------------- // 

/**
 * Takes the first prompt and then calls the backend to get chat uuid and a chatName - updates state.activeChatId with newChat's uuid
 * 
 * @param {string} prompt - Name of the promp you want to create
 */
async function createChat(prompt) {

    if (state.isLoading) return;

    state.isLoading = true;
    const url = `/chats/new/`;



    try {

        // try creating the chat into the DB 
        const data = await apiFetch(url, {
            method: "POST",
        });
        // log this and update state
        console.log(data.message + "with UUID : " + data.uuid);
        if (data.uuid) {
            state.activeChatId = data.uuid;
        }
        else {
            console.error("Error: chat UUID can't find from Respsone");
        }
    }
    catch (error) {
        return console.error(error.message);
    }
    finally {
        textArea.disabled = false;
        state.isLoading = false;
        // ← NEVER sets isLoading back to false!
    }

    try {

        // call the backend and ask for chatName
        const data = await apiFetch(`/chats/new/${state.activeChatId}`, {
            method: "POST",
            body: JSON.stringify({
                USER_FIRST_MESSAGE: prompt,
            })
        });

        // get ChatName
        const chatName = data.chatName;
        console.log(`updated chatname with ${chatName}`);

        // update The State / put the new created chat in state and put in the first message into the activeMessage and re-render  side Bar ;
        setState(() => {
            state.chatsOrder.unshift(state.activeChatId); // Put new chat at top
            state.chatsObj[state.activeChatId] = { chatName, uuid: state.activeChatId };
            state.activeEventSource = null;
        }, { renderSideBar: true, renderChat: false });

    }
    catch (error) {
        console.error(error.message);
        alert("Server error: can't create new chats, try again later");
        return;
    } finally {
        textArea.disabled = false;
        state.isLoading = false;
        // ← NEVER sets isLoading back to false!new
    }
}

async function updateChat(prompt) {

    textArea.disabled = true;

    //  Re-enable textArea if no active chat
    if (!state.activeChatId) {
        textArea.disabled = false;
        return;
    }



    setState(() => {
        state.activeEventSource?.close();
        state.activeEventSource = null;
        state.activeChatMessages.push({ role: 'user', content: prompt });
    }, { renderSideBar: true, renderChat: true });




    const url = `${baseURL}/chats/${state.activeChatId}`;


    // 1. update the prompt in the frontend
    try {
        await apiFetch(`/chats/${state.activeChatId}`, {
            method: "PUT",
            body: JSON.stringify({
                message: { role: "user", content: prompt }
            })
        });

        // we'll listen to SSE and get msg by  pass the url to function and let it handle update
        appendSSEMsg(`${baseURL}/chats/${state.activeChatId}`);

    } catch (error) {
        console.error(error.message);
        textArea.disabled = false; // Re-enable if error
        return;
    }


}
/**
 * Deletes the current chatUUID by calling backend and calls setState();
 * @param {string} chatUUID 
 */
async function deleteChat(chatUUID) {
    const url = `/chats/${chatUUID}`;
    const options = {
        method: "DELETE"
    }

    try {
        await apiFetch(url, options);

        //  Close SSE and re-enable textArea if deleting active chat
        const wasActiveChat = (state.activeChatId === chatUUID);
        if (wasActiveChat) {
            state.activeEventSource?.close();
            state.activeEventSource = null;
            textArea.disabled = false; // Re-enable textArea
        }

        setState(() => {
            state.chatsOrder = state.chatsOrder.filter(id => id !== chatUUID);
            delete state.chatsObj[chatUUID];
            if (wasActiveChat) {
                state.activeChatId = null;
                state.activeChatMessages = [];
            }
        }, { renderSideBar: true, renderChat: wasActiveChat });
    }
    catch (error) {
        console.error(error.message);
        alert(`Can't Delete chat:${chatUUID}`);
    }
}



/**
* Calls the Backend to logout the user 
*/
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


async function loadAllChats() {
    try {
        const url = `/chats/`;
        const data = await apiFetch(url);
        if (data.chats) {
            // build chatsOrder  and chatsObj for the state
            const chatsOrder = [];
            const chatsObj = {};
            data.chats.forEach(chat => {
                chatsOrder.push(chat.uuid);
                chatsObj[chat.uuid] = chat;
            });
            const options = { renderChat: true, renderSideBar: true };
            // update the state
            setState(() => {
                state.chatsOrder = chatsOrder;
                state.chatsObj = chatsObj;
            }, options);
        }
    } catch (error) {
        console.error("Failed to load chats:", error.message);
        alert("Failed to load chats. Try again later.");
    }

}


async function loadChatMessages() {
    const url = `/chats/chat/${state.activeChatId}`;
    try {
        const data = await apiFetch(url);
        if (data.messages) {
            const options = {
                renderChat: true,
                renderSideBar: true
            };

            // update the state activeChatmessages and also make sure be render both sideBar and the chatArea!
            setState(() => {
                state.activeChatMessages = data.messages;
            },
                options
            );

        }
    } catch (error) {
        console.error('Load Chats from DB error: ', error.message);
        alert("Can't Load Chat ID:", state.activeChatId);
    }

}




function setState(updateStateFn, options = {}) {
    updateStateFn();
    if (options.renderSideBar) renderSideBar();
    if (options.renderChat) renderChat();
}


// ----------------------------------------  Rendering related Functions usuig state ---------------------------------------- // 



function getChatDiv(chat) {
    const div = document.createElement('div');
    div.classList.add("chats");

    // since each new setState() will most def call for a re-render of the side Bar, We'll update the active chat here
    if (state.activeChatId === chat.uuid) {
        div.classList.add("active");
    }


    div.onclick = async (e) => {
        e.stopPropagation();
        if (state.activeChatId !== chat.uuid) {

            textArea.disabled = false;


            // close any this SSE
            state.activeEventSource?.close();
            state.activeEventSource = null;
            // update the state with current chat.uuid 
            state.activeChatId = chat.uuid;
            // now we'll load this chat -> also leads to re-rendering of the chat and sideBar!
            loadChatMessages();
        }
    }


    const p = document.createElement("p");
    p.textContent = chat.chatName;


    const deleteChatBtn = document.createElement('span');
    deleteChatBtn.textContent = 'delete';
    deleteChatBtn.classList.add("material-symbols-outlined"); // make it into the 'delete' icon w this class
    deleteChatBtn.classList.add("deleteBtn");
    deleteChatBtn.onclick = async (e) => {
        e.stopPropagation();
        await deleteChat(chat.uuid); // this will both delete the chat and update the State! 
    }


    div.appendChild(p);
    div.appendChild(deleteChatBtn);
    return div;
}






function renderSideBar() {
    // clear Current Chats bar
    chatsBar.innerHTML = '';

    // use chatsOrder array to map each uuid with key in chatsObj and update HTML
    state.chatsOrder.forEach(id => {
        const chat = state.chatsObj[id];
        const chatDiv = getChatDiv(chat);
        chatsBar.appendChild(chatDiv);
    })
}

function appendSSEMsg(url) {
    const currentChatId = state.activeChatId;
    if (state.activeEventSource) state.activeEventSource.close();

    const eventSource = new EventSource(url, { withCredentials: true });
    state.activeEventSource = eventSource;

    const assistantDiv = document.createElement('div');
    assistantDiv.classList.add("assistant");
    chatArea.appendChild(assistantDiv);

    let fullAssistantReply = '';

    eventSource.onmessage = (event) => {
        // 1. Guard against context switching
        if (state.activeChatId !== currentChatId) {
            eventSource.close();
            return;
        }

        const chunk = JSON.parse(event.data);

        // 2. Accumulate content
        if (chunk.content) {
            fullAssistantReply += chunk.content;
            assistantDiv.innerHTML = DOMPurify.sanitize(marked.parse(fullAssistantReply));
        }

        // 3. Handle completion
        if (chunk.done) {
            eventSource.close(); // Close FIRST
            state.activeEventSource = null;
            textArea.disabled = false;

            // Update global state quietly without a full re-render 
            // to prevent the "flicker" of rebuilding the whole chat list
            state.activeChatMessages.push({
                role: 'assistant',
                content: fullAssistantReply
            });

            // Optional: only re-render sidebar if the chat name might have changed
            renderSideBar();
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        state.activeEventSource = null;
        textArea.disabled = false;
    };
}





function renderChat() {

    // clear current content  in chatArea
    chatArea.innerHTML = '';

    if (!state.activeChatId || !state.chatsObj[state.activeChatId]) {
        middleDiv.textContent = 'Select a chat';
        return;
    }

    // reset the title in the page
    middleDiv.textContent = state.chatsObj[state.activeChatId].chatName;




    // append Messages from state
    state.activeChatMessages.forEach(msg => {
        if (msg.role === 'system') return;

        const div = document.createElement("div");
        div.classList.add(msg.role);
        div.innerHTML = DOMPurify.sanitize(marked.parse(msg.content));
        chatArea.appendChild(div);
    });

    // scroll at the bottom!
    chatArea.scrollTop = chatArea.scrollHeight;
}




window.addEventListener('beforeunload', () => {
    if (state.activeEventSource) {
        state.activeEventSource.close();
    }
});

loadAllChats();