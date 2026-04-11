const queryParameters = new URLSearchParams(window.location.search);
const configuredApiBase = queryParameters.get("apiBase");
const defaultApiBase =
  window.location.protocol === "file:"
    ? "http://localhost:3000"
    : window.location.origin;
const apiBase = (configuredApiBase || defaultApiBase).replace(/\/+$/, "");

const endpoints = {
  confirm(token) {
    return `${apiBase}/api/confirm/${encodeURIComponent(token)}`;
  },
  dbHealth: `${apiBase}/health/db`,
  health: `${apiBase}/health`,
  subscribe: `${apiBase}/api/subscribe`,
  subscriptions(email) {
    return `${apiBase}/api/subscriptions?email=${encodeURIComponent(email)}`;
  },
  unsubscribe(token) {
    return `${apiBase}/api/unsubscribe/${encodeURIComponent(token)}`;
  },
};

const elements = {
  apiBaseLabel: document.querySelector("#apiBaseLabel"),
  dbStatusCard: document.querySelector('[data-status-card="db"]'),
  healthStatusCard: document.querySelector('[data-status-card="health"]'),
  lookupButton: document.querySelector("#lookupButton"),
  lookupEmail: document.querySelector("#lookupEmail"),
  lookupForm: document.querySelector("#lookupForm"),
  refreshHealthButton: document.querySelector("#refreshHealthButton"),
  subscribeButton: document.querySelector("#subscribeButton"),
  subscribeEmail: document.querySelector("#subscribeEmail"),
  subscribeFeedback: document.querySelector("#subscribeFeedback"),
  subscribeForm: document.querySelector("#subscribeForm"),
  subscribeRepo: document.querySelector("#subscribeRepo"),
  subscriptionsResult: document.querySelector("#subscriptionsResult"),
  tokenButton: document.querySelector("#tokenButton"),
  tokenFeedback: document.querySelector("#tokenFeedback"),
  tokenForm: document.querySelector("#tokenForm"),
  tokenInput: document.querySelector("#tokenInput"),
};

const setButtonBusy = (button, isBusy, busyText) => {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent || "";
  }

  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : button.dataset.defaultText;
};

const setCardState = (card, state, value, detail) => {
  if (!(card instanceof HTMLElement)) {
    return;
  }

  const valueElement = card.querySelector(".status-card__value");
  const metaElement = card.querySelector(".status-card__meta");

  card.dataset.state = state;

  if (valueElement) {
    valueElement.textContent = value;
  }

  if (metaElement) {
    metaElement.textContent = detail;
  }
};

const renderFeedback = (container, tone, title, text, items) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.hidden = false;
  container.dataset.tone = tone;
  container.replaceChildren();

  const heading = document.createElement("h3");
  heading.className = "feedback__title";
  heading.textContent = title;
  container.append(heading);

  const body = document.createElement("p");
  body.className = "feedback__body";
  body.textContent = text;
  container.append(body);

  if (!items || items.length === 0) {
    return;
  }

  const list = document.createElement("ul");
  list.className = "feedback__list";

  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.append(entry);
  }

  container.append(list);
};

const clearFeedback = (container) => {
  if (!(container instanceof HTMLElement)) {
    return;
  }

  container.hidden = true;
  container.dataset.tone = "";
  container.replaceChildren();
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: "GET",
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(payload.message || `HTTP ${response.status}`);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
};

const getErrorDetails = (error) => {
  const payload =
    error && typeof error === "object" && "payload" in error
      ? error.payload
      : null;
  const items = [];

  if (
    payload &&
    typeof payload === "object" &&
    payload.details &&
    typeof payload.details === "object" &&
    Array.isArray(payload.details.issues)
  ) {
    for (const issue of payload.details.issues) {
      const path = issue.path ? `${issue.path}: ` : "";
      items.push(`${path}${issue.message || "Invalid value"}`);
    }
  }

  let message = "Request failed";

  if (payload && typeof payload === "object" && payload.message) {
    const { message: payloadMessage } = payload;
    message = payloadMessage;
  } else if (error instanceof Error) {
    const { message: errorMessage } = error;
    message = errorMessage;
  }

  return { items, message };
};

const refreshHealth = async () => {
  setCardState(
    elements.healthStatusCard,
    "loading",
    "Loading",
    "Checking /health"
  );
  setCardState(
    elements.dbStatusCard,
    "loading",
    "Loading",
    "Checking /health/db"
  );
  setButtonBusy(elements.refreshHealthButton, true, "Оновлення...");

  const [health, db] = await Promise.allSettled([
    requestJson(endpoints.health),
    requestJson(endpoints.dbHealth),
  ]);

  if (health.status === "fulfilled") {
    setCardState(
      elements.healthStatusCard,
      "success",
      String(health.value.status || "ok").toUpperCase(),
      health.value.timestamp || "API available"
    );
  } else {
    const details = getErrorDetails(health.reason);
    setCardState(elements.healthStatusCard, "error", "ERROR", details.message);
  }

  if (db.status === "fulfilled") {
    setCardState(
      elements.dbStatusCard,
      "success",
      String(db.value.status || "ok").toUpperCase(),
      "Database available"
    );
  } else {
    const details = getErrorDetails(db.reason);
    setCardState(elements.dbStatusCard, "error", "ERROR", details.message);
  }

  setButtonBusy(elements.refreshHealthButton, false, "");
};

const subscribe = async () => {
  clearFeedback(elements.subscribeFeedback);

  const email =
    elements.subscribeEmail instanceof HTMLInputElement
      ? elements.subscribeEmail.value.trim()
      : "";
  const repo =
    elements.subscribeRepo instanceof HTMLInputElement
      ? elements.subscribeRepo.value.trim()
      : "";

  setButtonBusy(elements.subscribeButton, true, "Надсилання...");

  try {
    const result = await requestJson(endpoints.subscribe, {
      body: JSON.stringify({ email, repo }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (elements.lookupEmail instanceof HTMLInputElement) {
      elements.lookupEmail.value = email;
    }

    renderFeedback(
      elements.subscribeFeedback,
      "success",
      "Успіх",
      result.message,
      []
    );
  } catch (error) {
    const details = getErrorDetails(error);
    renderFeedback(
      elements.subscribeFeedback,
      "error",
      "Помилка",
      details.message,
      details.items
    );
  } finally {
    setButtonBusy(elements.subscribeButton, false, "");
  }
};

const renderSubscriptions = (items) => {
  if (!(elements.subscriptionsResult instanceof HTMLElement)) {
    return;
  }

  elements.subscriptionsResult.replaceChildren();

  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Підписок не знайдено.";
    elements.subscriptionsResult.append(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "results-list";

  for (const item of items) {
    const row = document.createElement("article");
    row.className = "subscription-item";

    const title = document.createElement("strong");
    title.textContent = item.repo;

    const email = document.createElement("p");
    email.textContent = item.email;

    const meta = document.createElement("div");
    meta.className = "subscription-meta";

    const confirmed = document.createElement("span");
    confirmed.className = "tag";
    confirmed.textContent = item.confirmed ? "confirmed" : "pending";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item.last_seen_tag || "no tag";

    meta.append(confirmed, tag);
    row.append(title, email, meta);
    list.append(row);
  }

  elements.subscriptionsResult.append(list);
};

const lookupSubscriptions = async () => {
  const email =
    elements.lookupEmail instanceof HTMLInputElement
      ? elements.lookupEmail.value.trim()
      : "";

  setButtonBusy(elements.lookupButton, true, "Завантаження...");
  clearFeedback(elements.subscribeFeedback);

  try {
    const result = await requestJson(endpoints.subscriptions(email));
    renderSubscriptions(result);
  } catch (error) {
    const details = getErrorDetails(error);

    if (elements.subscriptionsResult instanceof HTMLElement) {
      elements.subscriptionsResult.innerHTML =
        '<div class="empty-state">Не вдалося завантажити підписки.</div>';
    }

    renderFeedback(
      elements.subscribeFeedback,
      "error",
      "Помилка API",
      details.message,
      details.items
    );
  } finally {
    setButtonBusy(elements.lookupButton, false, "");
  }
};

const runTokenAction = async () => {
  clearFeedback(elements.tokenFeedback);

  const token =
    elements.tokenInput instanceof HTMLInputElement
      ? elements.tokenInput.value.trim()
      : "";
  const actionField = document.querySelector(
    'input[name="tokenAction"]:checked'
  );
  const action =
    actionField instanceof HTMLInputElement ? actionField.value : "confirm";
  const url =
    action === "unsubscribe"
      ? endpoints.unsubscribe(token)
      : endpoints.confirm(token);

  setButtonBusy(elements.tokenButton, true, "Виконання...");

  try {
    const result = await requestJson(url);
    renderFeedback(
      elements.tokenFeedback,
      "success",
      "Успіх",
      result.message,
      []
    );
  } catch (error) {
    const details = getErrorDetails(error);
    renderFeedback(
      elements.tokenFeedback,
      "error",
      "Помилка",
      details.message,
      details.items
    );
  } finally {
    setButtonBusy(elements.tokenButton, false, "");
  }
};

const bindFormPrevention = (form, action) => {
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    action();
  });
};

const initialize = () => {
  if (elements.apiBaseLabel instanceof HTMLElement) {
    elements.apiBaseLabel.textContent = `API: ${apiBase}`;
  }

  bindFormPrevention(elements.subscribeForm, subscribe);
  bindFormPrevention(elements.lookupForm, lookupSubscriptions);
  bindFormPrevention(elements.tokenForm, runTokenAction);

  elements.subscribeButton?.addEventListener("click", subscribe);
  elements.lookupButton?.addEventListener("click", lookupSubscriptions);
  elements.tokenButton?.addEventListener("click", runTokenAction);
  elements.refreshHealthButton?.addEventListener("click", refreshHealth);

  refreshHealth();
};

window.addEventListener("DOMContentLoaded", initialize);
