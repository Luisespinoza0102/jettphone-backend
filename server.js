const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());

// Límite ampliado para permitir múltiples imágenes en Base64
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const pool = mysql.createPool({
    host: process.env.MYSQL_ADDON_HOST,
    user: process.env.MYSQL_ADDON_USER,
    password: process.env.MYSQL_ADDON_PASSWORD,
    database: process.env.MYSQL_ADDON_DB,
    port: process.env.MYSQL_ADDON_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Obtener todos los productos
app.get('/products', (req, res) => {
    pool.query('SELECT * FROM products', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const formatted = results.map(p => ({
            ...p,
            imagenes: typeof p.imagenes === 'string' ? JSON.parse(p.imagenes) : p.imagenes,
            features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || [])
        }));
        res.json(formatted);
    });
});

// Crear o actualizar un producto
app.post('/products', (req, res) => {
    const { id, title, price, category, quote, shipping, description, imagenes, features, wa_msg } = req.body;
    
    const query = `
        INSERT INTO products (id, title, price, category, quote, shipping, description, imagenes, features, wa_msg) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        title=?, price=?, category=?, quote=?, shipping=?, description=?, imagenes=?, features=?, wa_msg=?
    `;

    const imgJson = JSON.stringify(imagenes || []);
    const featJson = JSON.stringify(features || []);

    const values = [
        id, title, price, category, quote, shipping, description, imgJson, featJson, wa_msg,
        title, price, category, quote, shipping, description, imgJson, featJson, wa_msg
    ];

    pool.query(query, values, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Eliminar un producto
app.delete('/products/:id', (req, res) => {
    const { id } = req.params;
    pool.query('DELETE FROM products WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));