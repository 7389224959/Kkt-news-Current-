const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

// Import XCircle
content = content.replace("import { Users, CheckSquare, Plus, Trash2, Edit } from 'lucide-react';", "import { Users, CheckSquare, Plus, Trash2, Edit, XCircle } from 'lucide-react';");

// Make loadData accessible
content = content.replace(`
  useEffect(() => {
    const loadData = async () => {
      const w = await getWorkers();
      const t = await getTasks();
      const a = await getAssets();
      setWorkers(w);
      setTasks(t);
      setAssets(a);
    };
    loadData();
  }, []);
`, `
  const loadData = async () => {
    const w = await getWorkers();
    const t = await getTasks();
    const a = await getAssets();
    setWorkers(w);
    setTasks(t);
    setAssets(a);
  };
  useEffect(() => {
    loadData();
  }, []);
`);

fs.writeFileSync('components/ManageWorkers.tsx', content);
console.log('Fixed loadData and XCircle');
