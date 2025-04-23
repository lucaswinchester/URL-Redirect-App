const planSelect = document.getElementById('planSelect');
const addonsList = document.getElementById('addonsList');
const addonSelect = document.getElementById('addonSelect');
const packageForm = document.getElementById('packageForm');
const packagesUl = document.getElementById('packagesUl');

let plans = [];
let addons = [];
let packages = [];

import { supabase } from './supabaseClient.js';

async function fetchPlans() {
  const { data, error } = await supabase.from('plans').select('*');
  if (error) {
    alert('Failed to fetch plans: ' + error.message);
    plans = [];
  } else {
    plans = data || [];
  }
  renderPlans();
}

async function fetchAddons() {
  const { data, error } = await supabase.from('addons').select('*');
  if (error) {
    alert('Failed to fetch addons: ' + error.message);
    addons = [];
  } else {
    addons = data || [];
  }
  renderAddons();
}

function renderPlans() {
  planSelect.innerHTML = '';
  plans.forEach(plan => {
    const opt = document.createElement('option');
    opt.value = plan.id;
    opt.textContent = `${plan.name} ($${plan.price})`;
    planSelect.appendChild(opt);
  });
}

function renderAddons() {
  // Render checkboxes for each addon
  if (!addonsList) return;
  addonsList.innerHTML = '';
  addons.forEach(addon => {
    const label = document.createElement('label');
    label.style.display = 'block';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = addon.id;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${addon.name} ($${addon.price})`));
    addonsList.appendChild(label);
  });
  // Optionally hide the dropdown if it exists
  if (addonSelect) addonSelect.style.display = 'none';
}


packageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const planId = planSelect.value;
  // Get selected addon IDs from the checkboxes
  const selectedAddonIds = Array.from(addonsList.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
  const plan = plans.find(p => p.id === planId);
  const selectedAddons = addons.filter(a => selectedAddonIds.includes(a.id));
  const pkg = { plan, addons: selectedAddons };
  packages.push(pkg);
  renderPackages();
});

function renderPackages() {
  packagesUl.innerHTML = '';
  packages.forEach((pkg, idx) => {
    const li = document.createElement('li');
    li.textContent = `${pkg.plan.name} + [${pkg.addons.map(a => a.name).join(', ')}]`;
    packagesUl.appendChild(li);
  });
}

// Initial load
fetchPlans();
fetchAddons();
