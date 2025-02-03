// Predefined users (in a real application, these would be stored securely on a server)
const users = {
    'admin': {
        password: 'admin123',
        role: 'admin'
    },
    'user': {
        password: 'user123',
        role: 'user'
    }
};

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    
    // Check if user exists and password matches
    if (users[username] && users[username].password === password) {
        // Store user role in session storage
        sessionStorage.setItem('userRole', users[username].role);
        sessionStorage.setItem('username', username);
        
        // Redirect to main page
        window.location.href = 'index.html';
    } else {
        errorMessage.textContent = 'Invalid username or password';
    }
}); 