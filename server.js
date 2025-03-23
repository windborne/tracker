const express = require('express');
const fs = require('fs');
const path = require('path');
const fastcsv = require('fast-csv');  
const app = express();
app.use(express.json());

const PORT = 3000;
const jsonFilePath = path.join(__dirname, 'tasks.json');  
const csvFilePath = path.join(__dirname, 'tasks.csv');  


async function saveToJsonFile(data) {
    let existingData = [];
    try {
        const fileContent = await fs.readFile(jsonFilePath, 'utf8');
        existingData = JSON.parse(fileContent);
    } catch (error) {
        console.log("⚠ create new JSON");
    }
    
    existingData.push(data);
    await fs.promises.writeFile(jsonFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');
    console.log("✅ save - JSON file");
}



async function saveToCsvFile(data) {
    try {
        let fileExists = false;

       
        try {
            await fs.promises.access(csvFilePath);  
            fileExists = true;
        } catch (error) {
            fileExists = false;
        }

        const taskData = [
            data.id, 
            data.username, 
            data.category, 
            data.startTime, 
            data.elapsedTime, 
            data.endTime || '', 
            data.quantity || ''
        ];

        
        const writeStream = fs.createWriteStream(csvFilePath, { flags: fileExists ? 'a' : 'w' });
        const csvStream = fastcsv.format({ 
            headers: !fileExists, 
            writeBOM: true,
            quote: '"' 
        });

        
        csvStream.pipe(writeStream);

        
        csvStream.write(taskData);  

        
        csvStream.end();

       
        writeStream.on('finish', () => {
            console.log("✅ CSV file save complete.");
        });

       
        writeStream.write("\n");  

    } catch (error) {
        console.error("❌ CSV save error:", error.message);
        throw error;
    }
}




app.post('/save', async (req, res) => {
    try {
        await saveToJsonFile(req.body);
        res.send("✅ JSON - complete");
    } catch (error) {
        res.status(400).send(error.message);
    }
});


app.post('/end-task', async (req, res) => {
    try {
        const task = req.body;

        
        await saveToCsvFile(task);

        
        const tasks = await getAllTasks();
        const updatedTasks = tasks.filter(t => t.id !== task.id);
        
        await fs.promises.writeFile(jsonFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');

        console.log("✅ Task removed from JSON and saved to CSV successfully.");
        res.send("✅ Data saved to CSV after task completion.");
    } catch (error) {
        console.error("❌ Error saving to CSV and removing task from JSON:", error.message);
        res.status(400).send(error.message);
    }
});

async function getAllTasks() {
    try {
        const fileData = await fs.readFile(jsonFilePath, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        return [];  
    }
}

app.get('/tasks', async (req, res) => {
    try {
        const tasks = await getAllTasks();
        res.json(tasks);
    } catch (error) {
        res.status(500).send("❌ error-task list");
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// 메인 페이지 반환
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => console.log(`✅ running: http://localhost:${PORT}`));
