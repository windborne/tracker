const socket = io();

let categoryChart, timePerUnitChart, userChart, timelineChart, scatterChart;

socket.on("data-updated", (data) => {
    drawCategoryChart(data);
    drawTimePerUnitChart(data);
    drawUserChart(data);
    drawTimelineChart(data);
    drawScatterChart(data);
});

// 1. 카테고리별 총 작업 시간 누적 그래프
function drawCategoryChart(data) {
    const ctx = document.getElementById("categoryChart").getContext("2d");
    const grouped = {};

    data.forEach(d => {
        grouped[d.mainCategory] = (grouped[d.mainCategory] || 0) + parseFloat(d.elapsedTime);
    });

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "카테고리별 총 작업 시간 (초)", data: values }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// 2. 시간당 단위 생산성 변화 추이
function drawTimePerUnitChart(data) {
    const ctx = document.getElementById("timePerUnitChart").getContext("2d");

    // 시간 순 정렬
    const sorted = [...data].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const labels = sorted.map(d => d.startTime);
    const values = sorted.map(d => parseFloat(d.timePerUnit));

    if (timePerUnitChart) timePerUnitChart.destroy();
    timePerUnitChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{ label: "시간당 단위 생산성 (초)", data: values, fill: false, tension: 0.2 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// 3. 사용자별 평균 작업 속도 비교
function drawUserChart(data) {
    const ctx = document.getElementById("userChart").getContext("2d");

    const userMap = {};

    data.forEach(d => {
        const user = d.user;
        const timePerUnit = parseFloat(d.timePerUnit);
        if (!userMap[user]) userMap[user] = [];
        userMap[user].push(timePerUnit);
    });

    const labels = Object.keys(userMap);
    const values = labels.map(user => {
        const arr = userMap[user];
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    if (userChart) userChart.destroy();
    userChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "평균 작업 속도 (초/단위)", data: values }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// 4. 최근 일주일 작업량 타임라인
function drawTimelineChart(data) {
    const ctx = document.getElementById("timelineChart").getContext("2d");

    const dayMap = {};
    const now = new Date();
    const oneWeekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

    data.forEach(d => {
        const dateStr = new Date(d.startTime).toISOString().slice(0, 10);
        const date = new Date(dateStr);
        if (date >= oneWeekAgo) {
            dayMap[dateStr] = (dayMap[dateStr] || 0) + 1;
        }
    });

    const sortedDates = Object.keys(dayMap).sort();
    const values = sortedDates.map(date => dayMap[date]);

    if (timelineChart) timelineChart.destroy();
    timelineChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: sortedDates,
            datasets: [{ label: "최근 일주일 작업 수", data: values, tension: 0.2 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

// 5. 작업별 산점도 (Elapsed Time vs Units)
function drawScatterChart(data) {
    const ctx = document.getElementById("scatterChart").getContext("2d");

    const points = data.map(d => ({
        x: parseFloat(d.units),
        y: parseFloat(d.elapsedTime)
    }));

    if (scatterChart) scatterChart.destroy();
    scatterChart = new Chart(ctx, {
        type: "scatter",
        data: {
            datasets: [{
                label: "작업별 소요 시간 vs 단위 수",
                data: points,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "단위 수 (Units)" }, beginAtZero: true },
                y: { title: { display: true, text: "소요 시간 (초)" }, beginAtZero: true }
            }
        }
    });
}

socket.on("graph-data", (chartDataByCategory) => {
    const container = document.getElementById("unit-charts");
    container.innerHTML = ""; // 기존 그래프 제거

    Object.entries(chartDataByCategory).forEach(([mainCategory, data], index) => {
        // 캔버스 + 제목 컨테이너 만들기
        const wrapper = document.createElement("div");
        wrapper.className = "unit-chart";

        const title = document.createElement("h2");
        title.textContent = mainCategory;
        wrapper.appendChild(title);

        const canvas = document.createElement("canvas");
        const canvasId = `unitChart-${index}`;
        canvas.id = canvasId;
        wrapper.appendChild(canvas);

        container.appendChild(wrapper);

        // 데이터 준비
        const labels = data.map(d => d.subCategory);
        const values = data.map(d => d.timePerUnit);

        // 그래프 그리기
        new Chart(canvas.getContext("2d"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Time per Unit (s)",
                    data: values
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Time (seconds)"
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Sub Category"
                        }
                    }
                }
            }
        });
    });
});
