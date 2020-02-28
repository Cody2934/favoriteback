// Load Environment Variables from the .env file
require('dotenv').config();
// Application Dependencies

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();
// Application Setup

app.use(morgan('dev')); // http logging
app.use(cors()); // enable CORS request
app.use(express.static('public')); // server files from /public folder
app.use(express.json()); // enable reading incoming json data
app.use(express.json()); // enable reading incoming json data
app.use(express.urlencoded({ extended: true }));
// Database Client
const client = require('./lib/client');
// Services
// Auth
const ensureAuth = require('./lib/auth/ensure-auth');
const createAuthRoutes = require('./lib/auth/create-auth-routes');
const request = require('superagent');
const authRoutes = createAuthRoutes({
    async selectUser(email) {
        const result = await client.query(`
            SELECT id, email, hash, display_name 
            FROM users
            WHERE email = $1;
        `, [email]);
        return result.rows[0];
    },
    async insertUser(user, hash) {
        console.log(user);
        const result = await client.query(`
            INSERT into users (email, hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email, display_name;
        `, [user.email, hash, user.display_name]);
        return result.rows[0];
    }
});

// setup authentication routes
app.use('/api/auth', authRoutes);
// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);
app.get('/api/rickandmorty', async(req, res) => {
    const data = await request.get(`https://rickandmortyapi.com/api/character/?name=${req.query.name}`);
    res.json(data.body);
});
app.listen(process.env.PORT, () => {
    console.log('listening at ', process.env.PORT);
});

app.get('/api/me/favorites', async(req, res) => {
    try {
        const result = await client.query(`
            SELECT id,
                name,
                status,
                user_id as "userId",
                TRUE as "isFavorite"
            FROM favorites
            WHERE user_id =$1;
        `, [req.userId]);
            
        res.json(result.rows);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

app.post('/api/me/favorites', async(req, res) => {
    try {
        
        const result = await client.query(`
            INSERT INTO favorites (name, status, user_id)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [req.body.name, req.body.status, req.userId]);

        res.json(result.rows[0]);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            error: err.message || err
        });
    }
});

app.delete('/api/me/favorites/:id', async(req, res) => {
    try {
        const myQuery = `
            DELETE FROM favorites
            WHERE id=$1
            RETURNING *
            `;

        const favorites = await client.query(myQuery, [req.params.id]);
            
        res.json(favorites.rows);

    } catch (e) {
        console.error(e);
    }
});
