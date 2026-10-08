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
let editingExpenseId = null;

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

    const date = document.createElement('p');
    date.className = 'expense-date';
    date.textContent = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(expense.createdAt));

    if (expense.id === editingExpenseId) {
      row.classList.add('expense-row-editing');

      const editForm = document.createElement('form');
      editForm.className = 'expense-edit-form';
      editForm.dataset.expenseId = expense.id;

      const nameField = document.createElement('label');
      nameField.className = 'edit-field';
      nameField.textContent = 'Expense name';
      const nameInput = document.createElement('input');
      nameInput.className = 'inline-edit-input';
      nameInput.name = 'name';
      nameInput.type = 'text';
      nameInput.maxLength = 80;
      nameInput.value = expense.name;
      nameInput.required = true;
      nameField.append(nameInput);

      const amountField = document.createElement('label');
      amountField.className = 'edit-field';
      amountField.textContent = 'Amount (USD)';
      const amountInput = document.createElement('input');
      amountInput.className = 'inline-edit-input';
      amountInput.name = 'amount';
      amountInput.type = 'number';
      amountInput.min = '0.01';
      amountInput.step = '0.01';
      amountInput.value = expense.amount.toFixed(2);
      amountInput.required = true;
      amountField.append(amountInput);

      const actions = document.createElement('div');
      actions.className = 'expense-actions';
      const saveButton = document.createElement('button');
      saveButton.className = 'save-button';
      saveButton.type = 'submit';
      saveButton.textContent = 'Save';

      const cancelButton = document.createElement('button');
      cancelButton.className = 'cancel-button';
      cancelButton.type = 'button';
      cancelButton.dataset.expenseAction = 'cancel';
      cancelButton.dataset.expenseId = expense.id;
      cancelButton.textContent = 'Cancel';

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-button';
      deleteButton.type = 'button';
      deleteButton.dataset.expenseAction = 'delete';
      deleteButton.dataset.expenseId = expense.id;
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${expense.name}`);

      actions.append(saveButton, cancelButton, deleteButton);
      editForm.append(nameField, amountField, actions);
      row.append(editForm);
    } else {
      const name = document.createElement('p');
      name.className = 'expense-name';
      name.textContent = expense.name;

      const amount = document.createElement('p');
      amount.className = 'expense-amount';
      amount.textContent = currency.format(expense.amount);

      const actions = document.createElement('div');
      actions.className = 'expense-actions';

      const editButton = document.createElement('button');
      editButton.className = 'edit-button';
      editButton.type = 'button';
      editButton.dataset.expenseAction = 'edit';
      editButton.dataset.expenseId = expense.id;
      editButton.textContent = 'Edit';
      editButton.disabled = editingExpenseId !== null;
      editButton.setAttribute('aria-label', `Edit ${expense.name}`);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-button';
      deleteButton.type = 'button';
      deleteButton.dataset.expenseAction = 'delete';
      deleteButton.dataset.expenseId = expense.id;
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete ${expense.name}`);

      info.append(name, date);
      actions.append(editButton, deleteButton);
      row.append(info, amount, actions);
    }

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

list.addEventListener('submit', (event) => {
  const editForm = event.target.closest('form.expense-edit-form');
  if (!editForm) return;

  event.preventDefault();
  const name = editForm.elements.name.value.trim();
  const amount = editForm.elements.amount.valueAsNumber;
  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  const expense = expenses.find((item) => item.id === editForm.dataset.expenseId);
  if (!expense) return;

  expense.name = name;
  expense.amount = Math.round(amount * 100) / 100;
  editingExpenseId = null;
  saveExpenses();
  renderExpenses();
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-expense-action]');
  if (!button) return;

  const { expenseId, expenseAction } = button.dataset;
  if (expenseAction === 'edit') {
    editingExpenseId = expenseId;
    renderExpenses();
    list.querySelector('.inline-edit-input[name="name"]').focus();
    return;
  }

  if (expenseAction === 'cancel') {
    editingExpenseId = null;
    renderExpenses();
    return;
  }

  if (expenseAction !== 'delete') return;
  expenses = expenses.filter((expense) => expense.id !== expenseId);
  if (editingExpenseId === expenseId) editingExpenseId = null;
  saveExpenses();
  renderExpenses();
});

renderExpenses();