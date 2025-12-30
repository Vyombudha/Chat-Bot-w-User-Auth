
const LLM_MODEL = "llama2:latest";

/**
 * Takes the whole messages conversation and returns a response object from the assistant
 * @param {Array<object>} messages the different messages between the assitant and user 
 * @returns {object} the resposne object as {role : 'assitant' , content : 'hi user!, I am chatBot here to help you' };
 * @throws - Ollama Server Errors
 */
export async function sendMessages(messages) {

    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                messages,
                stream: false // we dont have a 'Web Socket API' 
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        const data = await response.json();

        const reply = data.message.content || null; // if we dont have proper reply, we'll return null 

        return {
            role: 'assistant',
            content: reply
        };

    } catch (error) {
        throw new Error(error.message);
    }
}

