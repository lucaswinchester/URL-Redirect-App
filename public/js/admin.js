// /public/js/admin.js
// Fetch plans and addons, allow admin to build packages (plan + addons)

const planSelect = document.getElementById('planSelect');
const addonsList = document.getElementById('addonsList');
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
}

packageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const planId = planSelect.value;
  const selectedAddonIds = Array.from(addonsList.querySelectorAll('input:checked')).map(cb => cb.value);
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
