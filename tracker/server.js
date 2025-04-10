const express = require('express');
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');

const app = express();
app.use(express.json());

const PORT = 3000;
const tasksDir = path.join(__dirname, 'tasks'); 
const csvFilePath = path.join(__dirname, 'tasks.csv');  

function getUserFilePath(username) {
    return path.join(tasksDir, `${username}.json`);
}

async function ensureUserFileExists(username) {
    const userFilePath = getUserFilePath(username);

    try {
        await fs.promises.mkdir(tasksDir, { recursive: true });
        if (!fs.existsSync(userFilePath)) {
            await fs.promises.writeFile(userFilePath, JSON.stringify([], null, 2), 'utf8');
            console.log(`✅ ${username}.json file created.`);
        }
    } catch (error) {
        console.error("❌ Cannot make file/directory:", error.message);
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
        const fileExists = fs.existsSync(csvFilePath);
        console.log(`🔍 CSV file exists: ${fileExists}, appending task ${data.id}`);

        const writeStream = fs.createWriteStream(csvFilePath, { flags: 'a' });
        const csvStream = fastcsv.format({
            headers: !fileExists,
            quoteColumns: true
        });

        csvStream.pipe(writeStream);

        const taskData = [
            data.id,
            data.username,
            data.mainCategory,
            data.subCategory,
            data.startTime,
            data.elapsedTime,
            data.endTime || '',
            data.quantity || '',
            data.note || ''
        ];

        csvStream.write(taskData);
        writeStream.write('\n');
        csvStream.end();

        return new Promise((resolve, reject) => {
            writeStream.on('finish', () => {
                console.log(`✅ CSV appended: task ${data.id}`);
                // 줄바꿈 확인용으로 파일 끝 읽기
                fs.readFile(csvFilePath, 'utf8', (err, content) => {
                    if (err) console.error("❌ Read error:", err.message);
                    else console.log(`🔎 CSV last 20 chars: ${content.slice(-20)}`);
                });
                resolve();
            });
            writeStream.on('error', (error) => {
                console.error("❌ CSV write error:", error.message);
                reject(error);
            });
        });
    } catch (error) {
        console.error("❌ CSV save error:", error.message);
        throw error;
    }
}

app.post('/end-task/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        await ensureUserFileExists(username);

        // CSV에 추가
        await saveToCsvFile(task);

        // JSON에서 상태만 업데이트
        const tasks = await loadUserTasks(username);
        const updatedTasks = tasks.map(t => 
            t.id === task.id ? { ...t, status: 'completed', endTime: task.endTime, quantity: task.quantity, note: task.note } : t
        );

        await saveUserTasks(username, updatedTasks);
        console.log("✅ Task marked as completed in JSON and appended to CSV.");
        res.send("✅ Task completed & updated");
    } catch (error) {
        console.error("❌ Task complete error:", error.message);
        res.status(500).send(error.message);
    }
});

app.post('/save/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = { ...req.body, status: 'pending' }; // 초기 상태 추가

        await ensureUserFileExists(username);

        const tasks = await loadUserTasks(username);
        tasks.push(task);

        await saveUserTasks(username, tasks);
        console.log(`✅ Task saved for ${username}`);
        res.send("✅ Save complete");
    } catch (error) {
        console.error("❌ Save error:", error.message);
        res.status(500).send(error.message);
    }
});

app.get('/tasks/:username', async (req, res) => {
    try {
        const username = req.params.username;

        await ensureUserFileExists(username);

        const tasks = await loadUserTasks(username);
        res.json(tasks);
    } catch (error) {
        console.error("❌ Task list error:", error.message);
        res.status(500).send("❌ Cannot read task list");
    }
});

app.post('/edit-task/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const task = req.body;

        await ensureUserFileExists(username);

        // JSON 업데이트
        const tasks = await loadUserTasks(username);
        const updatedTasks = tasks.map(t => 
            t.id === task.id ? { ...t, quantity: task.quantity, note: task.note } : t
        );
        await saveUserTasks(username, updatedTasks);

        // CSV에 새 줄로 추가
        await saveToCsvFile(task);

        console.log("✅ Task edited in JSON and appended to CSV.");
        res.send("✅ Task edited successfully");
    } catch (error) {
        console.error("❌ Edit error:", error.message);
        res.status(500).send(error.message);
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running: http://localhost:${PORT}`);
});