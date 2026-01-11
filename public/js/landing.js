/**
 * 
 * @returns {object} the  email and password from register form in an object
 */
function getValues() {
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    return { email, password };
}




let logInBtn = document.getElementById("login");

logInBtn.addEventListener("click", () => {
    const { email, password } = getValues();
    if (!email || !password) {
        console.log("Empty values, try Again");
        alert("Empty values, try Again");
        return;
    }

    // basic checking for password length only // we will add more complex checking later on 
    if (password.length < 8) {
        console.log(`Password Length :${password.length} less than 8, try again`);
        alert(`Password Length :${password.length} less than 8, try again`);
        return;
    }

    logInUser(email, password);
})

async function logInUser(email, password) {
    try {
        const baseURL = 'http://localhost:3001';
        const response = await fetch(`${baseURL}/user/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                email,
                password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status == 401) {
                console.error(error.message);
                alert("Login Failed, Invalid Creditentials");
                return;
            }
            console.error(error.message);
            alert("Server Error: Try Again");
            return;
        }
        const data = await response.json();

        alert(`Login SuccessFul!`);
        window.location.href = "./chat.html";
        return;


    } catch (error) {
        console.error(error.message);
        alert("Fetch Error, Try Again");
    }

}




