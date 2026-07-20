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
  return data || [];
};

export const saveTask = async (task: WorkerTask): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('worker_tasks').upsert(task);
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
