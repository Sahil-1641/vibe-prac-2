const STORAGE_KEY = 'pocket-ledger-expenses';
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const form = document.querySelector('#expense-form');
const nameInput = document.querySelector('#expense-name');
const amountInput = document.querySelector('#expense-amount');
const list = document.querySelector('#expense-list');
const emptyState = document.querySelector('#empty-state');
const totalAmount = document.querySelector('#total-amount');
const entryCount = document.querySelector('#entry-count');
const today = document.querySelector('#today');

today.dateTime = new Date().toISOString();
today.textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}).format(new Date());

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];

    return saved.filter(
      (expense) =>
        expense &&
        typeof expense.id === 'string' &&
        typeof expense.name === 'string' &&
        Number.isFinite(expense.amount) &&
        expense.amount > 0 &&
        typeof expense.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

let expenses = loadExpenses();

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // The tracker remains usable for this session if storage is unavailable.
  }
}

function renderExpenses() {
  list.replaceChildren();

  for (const expense of expenses) {
    const row = document.createElement('li');
    row.className = 'expense-row';

    const info = document.createElement('div');
    info.className = 'expense-info';

    const name = document.createElement('p');
    name.className = 'expense-name';
    name.textContent = expense.name;

    const date = document.createElement('p');
    date.className = 'expense-date';
    date.textContent = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(expense.createdAt));

    const amount = document.createElement('p');
    amount.className = 'expense-amount';
    amount.textContent = currency.format(expense.amount);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.dataset.expenseId = expense.id;
    deleteButton.textContent = 'Delete';
    deleteButton.setAttribute('aria-label', `Delete ${expense.name}`);

    info.append(name, date);
    row.append(info, amount, deleteButton);
    list.append(row);
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  totalAmount.textContent = currency.format(total);
  entryCount.textContent = String(expenses.length);
  emptyState.hidden = expenses.length > 0;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const amount = amountInput.valueAsNumber;
  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  expenses.unshift({
    id: crypto.randomUUID(),
    name,
    amount: Math.round(amount * 100) / 100,
    createdAt: new Date().toISOString(),
  });

  saveExpenses();
  renderExpenses();
  form.reset();
  nameInput.focus();
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-expense-id]');
  if (!button) return;

  expenses = expenses.filter((expense) => expense.id !== button.dataset.expenseId);
  saveExpenses();
  renderExpenses();
});

renderExpenses();