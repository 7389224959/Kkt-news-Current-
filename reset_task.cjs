const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

const oldReset = `    setNewTask({
      title: '',
      reward: '₹ ',
      date: new Date().toLocaleDateString(),
      status: 'Available',
      assignedTo: ''
    });`;
const newReset = `    setNewTask({
      title: '',
      description: '',
      videoInstructions: '',
      reward: '₹ ',
      date: new Date().toLocaleDateString(),
      status: 'Available',
      assignedTo: ''
    });`;

content = content.replace(oldReset, newReset);
fs.writeFileSync('components/ManageWorkers.tsx', content);
