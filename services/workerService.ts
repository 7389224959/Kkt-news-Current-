import { supabase } from './supabase';
import { Worker, WorkerTask, WorkerAsset } from '../types';

export const getWorkers = async (): Promise<Worker[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('workers').select('*');
  if (error) {
    console.error('Error fetching workers:', error);
    return [];
  }
  return data || [];
};

export const saveWorker = async (worker: Worker): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('workers').upsert(worker);
  if (error) {
    console.error('Error saving worker:', error);
    return false;
  }
  return true;
};

export const deleteWorker = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('workers').delete().eq('id', id);
  if (error) {
    console.error('Error deleting worker:', error);
    return false;
  }
  return true;
};

export const getTasks = async (): Promise<WorkerTask[]> => {
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
};

export const saveTask = async (task: WorkerTask): Promise<boolean> => {
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
  
  const titleToSave = `${task.title}|||${JSON.stringify(extraFields)}`;
  
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
};

export const deleteTask = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('worker_tasks').delete().eq('id', id);
  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }
  return true;
};

export const getAssets = async (): Promise<WorkerAsset[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('worker_assets').select('*').order('timestamp', { ascending: false });
  if (error) {
    console.error('Error fetching assets:', error);
    return [];
  }
  return data || [];
};

export const saveAsset = async (asset: WorkerAsset): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('worker_assets').upsert(asset);
  if (error) {
    console.error('Error saving asset:', error);
    return false;
  }
  return true;
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('worker_assets').delete().eq('id', id);
  if (error) {
    console.error('Error deleting asset:', error);
    return false;
  }
  return true;
};

export const getClients = async (): Promise<any[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
  return data || [];
};

export const saveClient = async (client: any): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('clients').upsert(client);
  if (error) {
    console.error('Error saving client:', error);
    return false;
  }
  return true;
};

export const deleteClient = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) {
    console.error('Error deleting client:', error);
    return false;
  }
  return true;
};
