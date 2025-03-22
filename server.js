const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

const PORT = 3000;
const filePath = path.join(__dirname, 'tasks.csv');

// Function to save data to CSV (async + validation)
async function saveToCSV(data) {
    if (!data.category || !data.startTime || !data.elapsedTime || !data.endTime || !data.quantity) {
        throw new Error("⚠️ All fields must be provided.");
    }

    const csvHeader = "Task,Start Time,Elapsed Time (seconds),End Time,Quantity\n";
    const csvRow = `${data.category},${data.startTime},${data.elapsedTime},${data.endTime},${data.quantity},${data.username}\n`;

    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, csvHeader, 'utf8'); // Add header if file does not exist
    }

    await fs.appendFile(filePath, csvRow, 'utf8');
    console.log("✅ CSV saved successfully.");
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Root page (returns index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API to save task data
app.post('/save', async (req, res) => {
    try {
        await saveToCSV(req.body);
        res.send("✅ Data saved successfully.");
    } catch (error) {
        console.error("❌ CSV save failed:", error.message);
        res.status(400).send(error.message);
    }
});

// Start the server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
