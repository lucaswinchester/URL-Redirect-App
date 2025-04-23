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
  // Populate the multi-select dropdown for addons
  if (!addonSelect) return;
  addonSelect.innerHTML = '';
  addonSelect.multiple = true;
  addons.forEach(addon => {
    const opt = document.createElement('option');
    opt.value = addon.id;
    opt.textContent = `${addon.name} ($${addon.price})`;
    addonSelect.appendChild(opt);
  });
  // Optionally hide the old checkbox area
  if (addonsList) addonsList.style.display = 'none';
}


packageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const planId = planSelect.value;
  // Get selected addon IDs from the multi-select dropdown
  const selectedAddonIds = Array.from(addonSelect.selectedOptions).map(opt => opt.value);
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
