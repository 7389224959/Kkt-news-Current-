import fetch from 'node-fetch';

async function test() {
  console.log('Testing /api/find-visuals...');
  const res = await fetch('http://localhost:3000/api/find-visuals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ script: "Breaking news from Chhattisgarh! Big relief for Sahara investors." })
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Error:', res.status, res.statusText, errorText);
  } else {
    const data = await res.json();
    console.log('Success:', JSON.stringify(data, null, 2));
  }
}

test();
