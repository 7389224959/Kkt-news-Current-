const fs = require('fs');
let content = fs.readFileSync('services/workerService.ts', 'utf8');

const oldGetTasks = `export const getTasks = async (): Promise<WorkerTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('worker_tasks').select('*');
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  return data || [];
};`;

const newGetTasks = `export const getTasks = async (): Promise<WorkerTask[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('worker_tasks').select('*');
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return (data || []).map((task: any) => {
    try {
      if (task.title && task.title.includes('|||')) {
        const [realTitle, jsonStr] = task.title.split('|||');
        const extra = JSON.parse(jsonStr);
        return { ...task, title: realTitle, ...extra };
      }
    } catch (e) {}
    return task;
  });
};`;

content = content.replace(oldGetTasks, newGetTasks);

const oldSaveTask = `export const saveTask = async (task: WorkerTask): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('worker_tasks').upsert(task);
  if (error) {
    console.error('Error saving task:', error);
    return false;
  }
  return true;
};`;

const newSaveTask = `export const saveTask = async (task: WorkerTask): Promise<boolean> => {
  if (!supabase) return false;
  
  const extraFields = {
    description: task.description,
    videoInstructions: task.videoInstructions,
    attachmentUrl: task.attachmentUrl,
    attachmentName: task.attachmentName,
    proofUrl: task.proofUrl,
    location: task.location,
    priority: task.priority,
    deadline: task.deadline
  };
  
  const titleToSave = \`\${task.title}|||\${JSON.stringify(extraFields)}\`;
  
  const payloadToSave = {
    id: task.id,
    title: titleToSave,
    reward: task.reward,
    date: task.date,
    status: task.status,
    assignedTo: task.assignedTo
  };

  const { error } = await supabase.from('worker_tasks').upsert(payloadToSave);
  if (error) {
    console.error('Error saving task:', error);
    return false;
  }
  return true;
};`;

content = content.replace(oldSaveTask, newSaveTask);

fs.writeFileSync('services/workerService.ts', content);
