

/**
 * 
 * @returns {object} the userName, email and password from register form in an object
 */
function getValues() {
    let userName = document.getElementById("userName").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;


    return { userName, email, password };
}



let registerBtn = document.getElementById("register");
 

registerBtn.addEventListener("click", (e) => {
    e.preventDefault();

    let { userName, email, password } = getValues();

    if (!userName || !email || !password) {
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

    registerUser(email, userName, password);

})
/**
 * Takes the user creditentials and calls the server for registeration
 * @param {string} email 
 * @param {string} userName 
 * @param {string} password 
 * @returns 
 */
async function registerUser(email, userName, password) {
    try {
        const baseURL = 'http://localhost:3001';
        const response = await fetch(`${baseURL}/user/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                userName,
                password
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(error.message);
            if (error.code === 409) {
                alert("User Already Registered, Try Login Page");
                window.location.href = './login.html'; // Redirects them to login
            }
            else {
                alert("Server Error: Can't Register New Users");
            }
            return;
        }

        const data = await response.json();
        console.log(data.message);
        alert("Registeration SuccessFul!");
        window.location.href = './landing.html'; // Redirects them to login

        return;
    }
    catch (error) {
        console.error("API ERROR, " + error.message);
        alert("fetch Error, Can't call Server, Try Again Later");
    }

}


