const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const typeInput = document.getElementById("type");
const categoryInput = document.getElementById("transaction-category");
const dateInput = document.getElementById("date");

const balanceDisplay = document.getElementById("balance");
const incomeDisplay = document.getElementById("income");
const expensesDisplay = document.getElementById("expenses");
const list = document.getElementById("transaction-list");
const emptyState = document.getElementById("empty-state");
const message = document.getElementById("message");
const clearButton = document.getElementById("clear-button");

// Load saved transactions from this device.
let transactions = [];

try {
  transactions = JSON.parse(
    localStorage.getItem("pocketwise-transactions") || "[]"
  );

  if (!Array.isArray(transactions)) {
    transactions = [];
  }
} catch (error) {
  transactions = [];
}

// Use today's date as the default.
function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

dateInput.value = getToday();

// Display money in dollars for this first demo.
function money(amount) {
  return "$" + amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Save transactions on this device.
function saveTransactions() {
  try {
    localStorage.setItem(
      "pocketwise-transactions",
      JSON.stringify(transactions)
    );
    return true;
  } catch (error) {
    message.textContent =
      "Saving failed. Check your browser storage settings.";
    return false;
  }
}

// Calculate and display the totals.
function updateDashboard() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((total, item) => total + item.amount, 0);

  const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((total, item) => total + item.amount, 0);

  balanceDisplay.textContent = money(income - expenses);
  incomeDisplay.textContent = money(income);
  expensesDisplay.textContent = money(expenses);
}

// Build the transaction list.
function renderTransactions() {
  list.replaceChildren();
  emptyState.hidden = transactions.length > 0;

  const newestFirst = [...transactions].sort((a, b) => {
    return b.id - a.id;
  });

  newestFirst.forEach(item => {
    const row = document.createElement("div");
    row.className = "transaction";

    const info = document.createElement("div");
    info.className = "transaction-info";

    const title = document.createElement("strong");
    title.textContent = item.description;

    const date = document.createElement("small");
    date.textContent = new Date(
      item.date + "T00:00:00"
    ).toLocaleDateString();

    info.append(title, date);

    const right = document.createElement("div");
    right.className = "transaction-right";

    const amount = document.createElement("div");
    amount.className = "transaction-amount";

    if (item.type === "income") {
      amount.classList.add("income-amount");
      amount.textContent = "+" + money(item.amount);
    } else {
      amount.classList.add("expense-amount");
      amount.textContent = "-" + money(item.amount);
    }

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      transactions = transactions.filter(
        transaction => transaction.id !== item.id
      );

      saveTransactions();
      updateDashboard();
      renderTransactions();
      message.textContent = "Transaction deleted.";
    });

    right.append(amount, deleteButton);
    row.append(info, right);
    list.appendChild(row);
  });
}

// Add a new transaction.
form.addEventListener("submit", event => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const type = typeInput.value;
  const date = dateInput.value;

  if (!description || !Number.isFinite(amount) || amount <= 0 || !date) {
    message.textContent = "Please enter valid transaction details.";
    return;
  }

  const transaction = {
  id: Date.now(),
  description: description,
  amount: Math.round(amount * 100) / 100,
  type: type,
  category: categoryInput.value,
  date: date
};

  transactions.push(transaction);

  if (!saveTransactions()) {
    transactions.pop();
    return;
  }

  updateDashboard();
  renderTransactions();
  renderBudgets() ; 
  renderMonthlySummary();


  form.reset();
  dateInput.value = getToday();
  message.textContent = "Transaction added and saved!";
});

// Remove all transactions.
clearButton.addEventListener("click", () => {
  if (transactions.length === 0) {
    message.textContent = "There are no transactions to clear.";
    return;
  }

  const confirmed = confirm(
    "Clear all transactions? This cannot be undone."
  );

  if (!confirmed) return;

  const previousTransactions = transactions;
  transactions = [];

  if (!saveTransactions()) {
    transactions = previousTransactions;
    return;
  }

  updateDashboard();
  renderTransactions();
  message.textContent = "All transactions cleared.";
});

// Show saved information when the app opens.
updateDashboard();
renderTransactions();
// MONTHLY BUDGETS

const budgetForm = document.getElementById("budget-form");
const budgetCategory = document.getElementById("budget-category");
const budgetLimit = document.getElementById("budget-limit");
const budgetList = document.getElementById("budget-list");
const budgetMessage = document.getElementById("budget-message");

let budgets = {};

try {
  budgets = JSON.parse(
    localStorage.getItem("pocketwise-budgets") || "{}"
  );

  if (!budgets || typeof budgets !== "object" ||
      Array.isArray(budgets)) {
    budgets = {};
  }
} catch (error) {
  budgets = {};
}

function saveBudgets() {
  try {
    localStorage.setItem("pocketwise-budgets", JSON.stringify(budgets));
    return true;
  } catch (error) {
    budgetMessage.textContent = "Could not save your budget.";
    return false;
  }
}

function renderBudgets() {
  budgetList.replaceChildren();

  const month = getToday().slice(0, 7);
  const categories = Object.keys(budgets);

  if (categories.length === 0) {
    const note = document.createElement("p");
    note.className = "muted";
    note.textContent = "Set your first monthly budget above.";
    budgetList.appendChild(note);
    return;
  }

  categories.forEach(category => {
    const limit = Number(budgets[category]);

    const spent = transactions
      .filter(item =>
        item.type === "expense" &&
        (item.category || "Other") === category &&
        item.date.slice(0, 7) === month
      )
      .reduce((total, item) => total + item.amount, 0);

    const percentage = limit > 0
      ? Math.min((spent / limit) * 100, 100)
      : 0;

    const section = document.createElement("div");
    section.style.marginTop = "20px";

    const heading = document.createElement("strong");
    heading.textContent = category;

    const amounts = document.createElement("p");
    amounts.className = "muted";
    amounts.textContent =
      money(spent) + " spent of " + money(limit);

    const track = document.createElement("div");
    track.style.height = "9px";
    track.style.background = "#30263f";
    track.style.borderRadius = "20px";
    track.style.overflow = "hidden";

    const bar = document.createElement("div");
    bar.style.height = "100%";
    bar.style.width = percentage + "%";
    bar.style.background = spent > limit ? "#fda4af" : "#a78bfa";
    bar.style.borderRadius = "20px";

    track.appendChild(bar);

    const status = document.createElement("p");
    status.className = "muted";
    status.textContent = spent > limit
      ? "Over budget by " + money(spent - limit)
      : money(limit - spent) + " remaining";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "text-button";
    remove.textContent = "Remove budget";

    remove.addEventListener("click", () => {
      delete budgets[category];
      if (saveBudgets()) {
        renderBudgets();
        budgetMessage.textContent = "Budget removed.";
      }
    });

    section.append(heading, amounts, track, status, remove);
    budgetList.appendChild(section);
  });
}

budgetForm.addEventListener("submit", event => {
  event.preventDefault();

  const category = budgetCategory.value;
  const limit = Number(budgetLimit.value);

  if (!Number.isFinite(limit) || limit <= 0) {
    budgetMessage.textContent = "Enter a valid budget amount.";
    return;
  }

  const previous = budgets[category];
  budgets[category] = Math.round(limit * 100) / 100;

  if (!saveBudgets()) {
    if (previous === undefined) {
      delete budgets[category];
    } else {
      budgets[category] = previous;
    }
    return;
  }

  renderBudgets();
  budgetForm.reset();
  budgetMessage.textContent = "Monthly budget saved!";
});

renderBudgets();
// POCKETWISE SAVINGS GOALS

const savingsForm = document.getElementById("savings-form");
const goalNameInput = document.getElementById("goal-name");
const goalTargetInput = document.getElementById("goal-target");
const goalSavedInput = document.getElementById("goal-saved");
const savingsList = document.getElementById("savings-list");
const savingsMessage = document.getElementById("savings-message");

let savingsGoals = [];

try {
  savingsGoals = JSON.parse(
    localStorage.getItem("pocketwise-savings-goals") || "[]"
  );

  if (!Array.isArray(savingsGoals)) {
    savingsGoals = [];
  }
} catch (error) {
  savingsGoals = [];
}

function saveSavingsGoals() {
  try {
    localStorage.setItem(
      "pocketwise-savings-goals",
      JSON.stringify(savingsGoals)
    );
    return true;
  } catch (error) {
    savingsMessage.textContent =
      "Could not save your goals. Check device storage.";
    return false;
  }
}

function renderSavingsGoals() {
  savingsList.replaceChildren();

  if (savingsGoals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Your savings journey starts here!";
    savingsList.appendChild(empty);
    return;
  }

  savingsGoals.forEach(goal => {
    const target = Number(goal.target) || 0;
    const saved = Number(goal.saved) || 0;
    const remaining = Math.max(target - saved, 0);

    const percentage = target > 0
      ? Math.min((saved / target) * 100, 100)
      : 0;

    const card = document.createElement("div");
    card.style.marginTop = "22px";
    card.style.padding = "16px";
    card.style.background = "#120e1e";
    card.style.borderRadius = "12px";

    const title = document.createElement("h3");
    title.textContent = goal.name;

    const amounts = document.createElement("p");
    amounts.className = "muted";
    amounts.textContent =
      money(saved) + " saved of " + money(target);

    const track = document.createElement("div");
    track.style.height = "10px";
    track.style.background = "#30263f";
    track.style.borderRadius = "20px";
    track.style.overflow = "hidden";

    const bar = document.createElement("div");
    bar.style.height = "100%";
    bar.style.width = percentage + "%";
    bar.style.background =
      "linear-gradient(90deg, #a78bfa, #f0abfc)";
    bar.style.borderRadius = "20px";

    track.appendChild(bar);

    const progress = document.createElement("p");
    progress.className = "muted";
    progress.textContent =
      Math.round(percentage) + "% complete";

    const remainingText = document.createElement("p");
    remainingText.style.color = "#86efac";
    remainingText.textContent = remaining === 0
      ? "🎉 Goal reached!"
      : money(remaining) + " left to save";

    const addLabel = document.createElement("label");
    addLabel.textContent = "Add to savings ($)";

    const addInput = document.createElement("input");
    addInput.type = "number";
    addInput.min = "0.01";
    addInput.step = "0.01";
    addInput.placeholder = "Enter amount";
    addInput.setAttribute(
      "aria-label",
      "Amount to add to " + goal.name
    );

const recordExpenseLabel = document.createElement("label");
recordExpenseLabel.style.display = "block";
recordExpenseLabel.style.marginTop = "10px";

const recordExpenseCheckbox = document.createElement("input");
recordExpenseCheckbox.type = "checkbox";
recordExpenseCheckbox.checked = false;

recordExpenseLabel.append(
  recordExpenseCheckbox,
  document.createTextNode(" Record this contribution as an expense")
);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "Add savings";
    addButton.style.marginTop = "10px";

    addButton.addEventListener("click", () => {
      const amount = Number(addInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        savingsMessage.textContent =
          "Enter an amount greater than zero.";
        return;
      }

      
const previousSaved = goal.saved;
const previousTransactions = transactions.slice();
const shouldRecordExpense = recordExpenseCheckbox.checked;

if (shouldRecordExpense) {
  const savingsTransaction = {
    id: Date.now(),
    description: "Savings contribution: " + goal.name,
    amount: Math.round(amount * 100) / 100,
    type: "expense",
    category: "Personal",
    date: getToday()
  };

  transactions.push(savingsTransaction);

  if (!saveTransactions()) {
    transactions.splice(
      0,
      transactions.length,
      ...previousTransactions
    );
    return;
  }
}

goal.saved = Math.round(
  ((Number(goal.saved) || 0) + amount) * 100
) / 100;

if (!saveSavingsGoals()) {
  goal.saved = previousSaved;

  if (shouldRecordExpense) {
    transactions.splice(
      0,
      transactions.length,
      ...previousTransactions
    );
    saveTransactions();
  }

  return;
}

if (shouldRecordExpense) {
  updateDashboard();
  renderTransactions();
  renderBudgets();
  renderMonthlySummary();

}

renderSavingsGoals();

savingsMessage.textContent = shouldRecordExpense
  ? "Savings updated and expense recorded for " + goal.name + "!"
  : "Savings updated for " + goal.name + "!";

    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "text-button";
    deleteButton.textContent = "Delete goal";
    deleteButton.style.display = "block";
    deleteButton.style.marginTop = "12px";

    deleteButton.addEventListener("click", () => {
      const confirmed = confirm(
        "Delete the savings goal: " + goal.name + "?"
      );

      if (!confirmed) return;

      const previousGoals = savingsGoals;
      savingsGoals = savingsGoals.filter(
        item => item.id !== goal.id
      );

      if (!saveSavingsGoals()) {
        savingsGoals = previousGoals;
        return;
      }

      renderSavingsGoals();
      savingsMessage.textContent = "Savings goal deleted.";
    });

    
card.append(
  title,
  amounts,
  track,
  progress,
  remainingText,
  addLabel,
  addInput,
  recordExpenseLabel,
  addButton,
  deleteButton
);


    savingsList.appendChild(card);
  });
}

savingsForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = goalNameInput.value.trim();
  const target = Number(goalTargetInput.value);
  const saved = Number(goalSavedInput.value);

  if (
    !name ||
    !Number.isFinite(target) ||
    !Number.isFinite(saved) ||
    target <= 0 ||
    saved < 0
  ) {
    savingsMessage.textContent =
      "Please enter a valid name and amounts.";
    return;
  }

  const goal = {
    id: Date.now(),
    name: name,
    target: Math.round(target * 100) / 100,
    saved: Math.round(saved * 100) / 100
  };

  savingsGoals.push(goal);

  if (!saveSavingsGoals()) {
    savingsGoals.pop();
    return;
  }

  renderSavingsGoals();
  savingsForm.reset();
  goalSavedInput.value = "0";
  savingsMessage.textContent =
    "Your savings goal has been saved!";
});

renderSavingsGoals();

/* MONTHLY SPENDING SUMMARY AND CHART */

const summaryMonthInput =
  document.getElementById("summary-month");

const monthlyIncomeOutput =
  document.getElementById("monthly-income");

const monthlyExpensesOutput =
  document.getElementById("monthly-expenses");

const monthlyLeftOutput =
  document.getElementById("monthly-left");

const spendingChart =
  document.getElementById("spending-chart");

const chartMessage =
  document.getElementById("chart-message");

// Select the current month by default.
const currentDate = new Date();

const currentMonth =
  currentDate.getFullYear() + "-" +
  String(currentDate.getMonth() + 1).padStart(2, "0");

summaryMonthInput.value = currentMonth;

function renderMonthlySummary() {
  const selectedMonth = summaryMonthInput.value;

  const monthlyTransactions = transactions.filter(
    transaction =>
      typeof transaction.date === "string" &&
      transaction.date.startsWith(selectedMonth)
  );

  const income = monthlyTransactions
    .filter(transaction => transaction.type === "income")
    .reduce(
      (total, transaction) =>
        total + (Number(transaction.amount) || 0),
      0
    );

  const expenses = monthlyTransactions
    .filter(transaction => transaction.type === "expense")
    .reduce(
      (total, transaction) =>
        total + (Number(transaction.amount) || 0),
      0
    );

  monthlyIncomeOutput.textContent = money(income);
  monthlyExpensesOutput.textContent = money(expenses);
  monthlyLeftOutput.textContent =
    money(Math.round((income - expenses) * 100) / 100);

  // Group expenses by category.
  const categoryTotals = {};

  monthlyTransactions
    .filter(transaction => transaction.type === "expense")
    .forEach(transaction => {
      const category = transaction.category || "Other";
      const amount = Number(transaction.amount) || 0;

      categoryTotals[category] =
        (categoryTotals[category] || 0) + amount;
    });

  spendingChart.replaceChildren();

  const categories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  if (categories.length === 0) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent =
      "No expenses recorded for this month yet.";

    spendingChart.appendChild(empty);
    chartMessage.textContent = "";
    return;
  }

  const highestAmount = Math.max(
    ...categories.map(item => item[1])
  );

  categories.forEach(([category, amount]) => {
    const row = document.createElement("div");
    row.className = "chart-row";

    const label = document.createElement("div");
    label.className = "chart-label";

    const categoryName = document.createElement("span");
    categoryName.textContent = category;

    const categoryAmount = document.createElement("span");
    categoryAmount.textContent = money(amount);

    label.append(categoryName, categoryAmount);

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = "chart-bar";

    const percentage =
      highestAmount > 0 ? (amount / highestAmount) * 100 : 0;

    bar.style.width = percentage + "%";

    track.appendChild(bar);
    row.append(label, track);
    spendingChart.appendChild(row);
  });

  chartMessage.textContent =
    categories.length + " spending categories shown.";
}

// Refresh when a different month is selected.
summaryMonthInput.addEventListener(
  "change",
  renderMonthlySummary
);
summaryMonthInput.addEventListener(
  "change",
  renderMonthlySummary
);

// Show the summary when the app first opens.
renderMonthlySummary();
