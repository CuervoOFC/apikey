async function loadEndpoints() {
    try {
        const response = await fetch('/endpoints');
        const endpoints = await response.json();

        const container = document.getElementById('endpoint-ads-list');
        container.innerHTML = '';

        endpoints.forEach(endpoint => {
            const div = document.createElement('div');
            div.classList.add('endpoint-item');
            div.innerHTML = `<strong>${endpoint.category}</strong>: ${endpoint.name}`;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading endpoints:', error);
    }
}

loadEndpoints();