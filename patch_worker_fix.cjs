const fs = require('fs');
let content = fs.readFileSync('components/WorkerDashboard.tsx', 'utf8');

content = content.replace("receiverId === me.id", "receiverId === (me?.id || finalWorkerId)");

fs.writeFileSync('components/WorkerDashboard.tsx', content);
