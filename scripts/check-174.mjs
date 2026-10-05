import fs from 'fs';

const master = JSON.parse(fs.readFileSync('data/allocations.json', 'utf8'));
console.log('Current master allocations count:', master.length);

// Let's check delegates from lines in public/allocations.csv
const lines = fs.readFileSync('public/allocations.csv', 'utf8').split(/\r?\n/).filter(l => l.trim().length > 0);
console.log('Total lines in public/allocations.csv (including header):', lines.length);
console.log('Total delegate rows in public/allocations.csv:', lines.length - 1);

// Let's check individual vs delegation breakdown in master
const ind = master.filter(d => d.registration_type === 'Individual' || d.allocation_id.startsWith('IND-'));
const del = master.filter(d => d.registration_type === 'Delegation Member' || d.allocation_id.startsWith('DEL-'));

console.log(`Individuals in master: ${ind.length}`);
console.log(`Delegation members in master: ${del.length}`);
console.log(`Sum: ${ind.length + del.length}`);
