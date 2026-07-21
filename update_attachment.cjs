const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

const stateHookStr = `  const [newTask, setNewTask] = useState<Partial<WorkerTask>>(`;
content = content.replace(stateHookStr, `  const [taskFile, setTaskFile] = useState<File | null>(null);\n  const [newTask, setNewTask] = useState<Partial<WorkerTask>>(`);


const oldHandleAddTask = `  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return alert('Fill required fields');
    
    // Set correct status based on assignment
    const finalStatus = 'Available';
    
    const taskToAdd = { ...newTask, id: Date.now().toString(), status: finalStatus } as WorkerTask;
    setTasks([...tasks, taskToAdd]); await saveTask(taskToAdd);
    setShowAddTask(false);
    setNewTask({
      title: '',
      description: '',
      videoInstructions: '',
      reward: '₹ ',
      date: new Date().toLocaleDateString(),
      status: 'Available',
      assignedTo: ''
    });
  };`;

const newHandleAddTask = `  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return alert('Fill required fields');
    
    const finalStatus = 'Available';
    
    const finalizeTask = async (attachmentUrl?: string, attachmentName?: string) => {
      const taskToAdd = { 
        ...newTask, 
        id: Date.now().toString(), 
        status: finalStatus,
        attachmentUrl: attachmentUrl || '',
        attachmentName: attachmentName || ''
      } as WorkerTask;
      
      setTasks([...tasks, taskToAdd]); await saveTask(taskToAdd);
      setShowAddTask(false);
      setNewTask({
        title: '',
        description: '',
        videoInstructions: '',
        reward: '₹ ',
        date: new Date().toLocaleDateString(),
        status: 'Available',
        assignedTo: ''
      });
      setTaskFile(null);
    };

    if (taskFile) {
      const reader = new FileReader();
      reader.onloadend = () => finalizeTask(reader.result as string, taskFile.name);
      reader.readAsDataURL(taskFile);
    } else {
      finalizeTask();
    }
  };`;

content = content.replace(oldHandleAddTask, newHandleAddTask);

const oldVideoField = `                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Video Instructions URL (Optional)</label>
                  <input type="url" value={newTask.videoInstructions} onChange={e => setNewTask({...newTask, videoInstructions: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                </div>`;

const newVideoField = `                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Video Instructions URL</label>
                  <input type="url" value={newTask.videoInstructions} onChange={e => setNewTask({...newTask, videoInstructions: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Upload Attachment</label>
                  <input type="file" onChange={e => setTaskFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-1.5 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>`;

content = content.replace(oldVideoField, newVideoField);

fs.writeFileSync('components/ManageWorkers.tsx', content);
