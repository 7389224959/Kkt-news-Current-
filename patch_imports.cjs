const fs = require('fs');
let content = fs.readFileSync('components/ManageWorkers.tsx', 'utf8');

content = content.replace(
  "import { Users, CheckSquare, Plus, Trash2, Edit, XCircle } from 'lucide-react';",
  "import { Users, CheckSquare, Plus, Trash2, Edit, XCircle, Bell, CheckCircle } from 'lucide-react';"
);

fs.writeFileSync('components/ManageWorkers.tsx', content);
