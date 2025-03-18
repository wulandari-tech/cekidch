const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const port = 3000;

// !!! REPLACE WITH YOUR ACTUAL VALUES !!!  (Still NOT recommended for production)
const PTERODACTYL_API_KEY = 'YOUR_PTERODACTYL_API_KEY'; //YOUR_PTERODACTYL_API_KEY
const PTERODACTYL_BASE_URL = 'YOUR_PTERODACTYL_BASE_URL'; //YOUR_PTERODACTYL_BASE_URL

// Middleware
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files

// --- Helper Function for Pterodactyl API Requests ---
async function pterodactylRequest(endpoint, method = 'GET', data = null) {
    const url = `${PTERODACTYL_BASE_URL}/api/application${endpoint}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : null,
    };

    const response = await fetch(url, options);
    return response;
}

// --- SERVER ENDPOINTS ---

// Get all servers
app.get('/servers', async (req, res) => {
    try {
        const response = await pterodactylRequest('/servers');
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText })
        }
        res.json(data.data);
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get server resources (for status)
app.get('/servers/:id/resources', async(req, res) => {
    try{
      const serverId = req.params.id;
      const url = `${PTERODACTYL_BASE_URL}/api/client/servers/${serverId}/resources`;
      const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
            'Accept': 'application/json',
        }
      };

      const response = await fetch(url, options);
      const data = await response.json();
      if(!response.ok){
          return res.status(response.status).json({error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText})
      }

      res.json(data);

    } catch (error) {
        console.error(`Error getting resources for ${req.params.id}`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

// Create a new server
app.post('/servers', async (req, res) => {
    try {
        const { name, description, nest_id, egg_id, memory, disk } = req.body;

        const createData = {
            name,
            description,
            user: 1,  //  Hardcoded user ID 1 (admin) -  You MUST change this in production!
            nest: nest_id,
            egg: egg_id,
            docker_image: "quay.io/parkervcp/pterodactyl-images:base_debian", // Example
            startup: "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar server.jar",  // Example
            environment: {
                SERVER_JARFILE: "server.jar",
            },
            limits: {
                memory,
                swap: 0,
                disk,
                io: 500,
                cpu: 0,
            },
            feature_limits: {
                databases: 0,
                allocations: 1,
                backups: 0
            },
            deploy: {
                locations: [1],  // Hardcoded location ID 1 - You MUST change this in production!
                dedicated_ip: false,
                port_range: [],
            },
        };

        const response = await pterodactylRequest('/servers', 'POST', createData);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText })
        }
        res.status(201).json(data); // 201 Created

    } catch (error) {
        console.error('Error creating server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a server
app.delete('/servers/:id', async (req, res) => {
    try {
        const serverId = req.params.id;
        const response = await pterodactylRequest(`/servers/${serverId}`, 'DELETE');
        const data = await response.json(); // Get JSON even if no content

        if (!response.ok && response.status !== 204) { // 204 No Content is expected
            return res.status(response.status).json({ error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText })
        }

        res.status(204).send(); // 204 No Content on successful deletion

    } catch (error) {
        console.error('Error deleting server:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Server power actions
app.post('/servers/:id/power', async(req, res) => {
  try{
    const serverId = req.params.id;
    const {signal} = req.body;

    const pterodactylResponse = await pterodactylRequest(`/servers/${serverId}/power`, 'POST', {signal});
    if(!pterodactylResponse.ok){
      const data = await pterodactylResponse.json()
      return res.status(pterodactylResponse.status).json({error: data.errors ? data.errors.map(e=>e.detail).join(', ') : pterodactylResponse.statusText})
    }
      res.status(204).send();

  }catch(error){
    console.error('Error sending power action:', error);
        res.status(500).json({ error: 'Internal server error' });
  }
})

// --- USER ENDPOINTS ---

//get all users
app.get('/users', async(req, res) => {
  try{
    const response = await pterodactylRequest('/users');
    const data = await response.json();

    if(!response.ok){
        return res.status(response.status).json({error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText})
    }
    res.json(data.data)

  } catch(error){
    console.error("Error fetching users:", error)
    res.status(500).json({ error: 'Internal server error' });
  }
})

// Create a new user
app.post('/users', async (req, res) => {
    try {
        const { email, username, first_name, last_name, password } = req.body;

        const createData = {
            email,
            username,
            first_name,
            last_name,
            password,  // Pterodactyl will auto-generate if not provided
            root_admin: false,
            language: "en",
        };

        const response = await pterodactylRequest('/users', 'POST', createData);
        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText })
        }
        res.status(201).json(data);

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a user
app.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const response = await pterodactylRequest(`/users/${userId}`, 'DELETE');
          const data = await response.json();

        if (!response.ok && response.status !== 204) {
            return res.status(response.status).json({ error: data.errors ? data.errors.map(e => e.detail).join(', ') : response.statusText });
        }
        res.status(204).send();

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve admin.html at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
    console.log(`Admin panel: http://localhost:${port}/admin`);
});
