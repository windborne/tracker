const express = require('express');
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');

const app = express();
app.use(express.json());

const PORT = 3000;
const tasksDir = path.join(__dirname, 'tasks');  //directory for each user
const csvFilePath = path.join(__dirname, 'tasks.csv');  // save to csv

// each user json
function getUserFilePath(username) {
    return path.join(tasksDir, `${username}.json`);
}


async function ensureUserFileExists(username) {
    const userFilePath = getUserFilePath(username);

    try {
        // tasks directory if there is none
        await fs.promises.mkdir(tasksDir, { recursive: true });

        
        if (!fs.existsSync(userFilePath)) {
            await fs.promises.writeFile(userFilePath, JSON.stringify([], null, 2), 'utf8');
            console.log(`✅ ${username}.json file created.`);
        }
    } catch (error) {
        console.error("❌ cannot make file or folder:", error.message);
        throw error;
    }
}

async function loadUserTasks(username) {
    const userFilePath = getUserFilePath(username);
    try {
        const fileData = await fs.promises.readFile(userFilePath, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        return []; 
    }
}


async function saveUserTasks(username, tasks) {
    const userFilePath = getUserFilePath(username);
    await fs.promises.writeFile(userFilePath, JSON.stringify(tasks, null, 2), 'utf8');
}

async function saveToCsvFile(data) {
    try {
        const writeStream = fs.createWriteStream(csvFilePath, { flags: 'a' });
        const fileStats = await fs.promises.stat(csvFilePath).catch(() => null);

        
        const csvStream = fastcsv.format({
            headers: !fileStats || fileStats.size === 0,  
            writeBOM: true,
            quote: '"'
        });

        csvStream.pipe(writeStream);

        const taskData = [
            data.id,
            data.username,
            data.category,
            data.startTime,
            data.elapsedTime,
            data.endTime || '',
            data.quantity || ''
        ];

        csvStream.write(taskData);  

        csvStream.end();
        writeStream.on('finish', () => {
            console.log("✅ CSV - complete saving.");
        });

        writeStream.write("\n");  


    } catch (error) {
        console.error("❌ CSV - saving error: ", error.message);
    }
}

app.post('/end-task/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        await ensureUserFileExists(username);

        await saveToCsvFile(task);

        const tasks = await loadUserTasks(username);
        const updatedTasks = tasks.filter(t => t.id !== task.id);

        await saveUserTasks(username, updatedTasks);  
        console.log("✅ Task removed from JSON and saved to CSV successfully.");
        res.send("✅ cvs save and complete job");
    } catch (error) {
        console.error("❌ Error remove json and save CSV:", error.message);
        res.status(400).send(error.message);
    }
});

app.post('/save/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        await ensureUserFileExists(username);

        const tasks = await loadUserTasks(username);
        tasks.push(task);

        await saveUserTasks(username, tasks); 
        res.send("✅ Task save");
    } catch (error) {
        console.error("❌ Error - Task save:", error.message);
        res.status(400).send(error.message);
    }
});

app.get('/tasks/:username', async (req, res) => {
    try {
        const username = req.params.username;

        
        await ensureUserFileExists(username);

        const tasks = await loadUserTasks(username);
        res.json(tasks);
    } catch (error) {
        console.error("❌ cannot open task list:", error.message);
        res.status(500).send("❌ cannot open task");
    }
});

app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
    console.log(`✅ running: http://localhost:${PORT}`);
});
