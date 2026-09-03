import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { CatalogProvider } from './context/CatalogContext';

function renderApp() {
  return render(
    <CatalogProvider>
      <App />
    </CatalogProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    disconnect() {}
  };
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/auth/me')) {
      return Promise.resolve({ ok: false, status: 401, json: async () => ({ error: 'Authentication required.' }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] });
  });
});

test('shows the animated workspace loader while the session is being prepared', () => {
  global.fetch.mockImplementation(() => new Promise(() => {}));
  renderApp();

  expect(screen.getByRole('status', { name: /loading workspace/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /loading your workspace/i })).toBeInTheDocument();
  expect(screen.getByText(/prepare everything for you/i)).toBeInTheDocument();
});

test('renders the email login page first', async () => {
  renderApp();
  expect(await screen.findByRole('heading', { name: /quotation builder/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('toggles password visibility from the eye icon', async () => {
  renderApp();
  const password = await screen.findByLabelText(/^password$/i);
  expect(password).toHaveAttribute('type', 'password');

  userEvent.click(screen.getByRole('button', { name: /show password/i }));
  expect(password).toHaveAttribute('type', 'text');

  userEvent.click(screen.getByRole('button', { name: /hide password/i }));
  expect(password).toHaveAttribute('type', 'password');
});

test('shows the API error after invalid login', async () => {
  global.fetch.mockImplementation((url) => {
    if (String(url).endsWith('/auth/login')) {
      return Promise.resolve({ ok: false, status: 401, json: async () => ({ error: 'Invalid email or password.' }) });
    }
    if (String(url).endsWith('/auth/me')) {
      return Promise.resolve({ ok: false, status: 401, json: async () => ({ error: 'Authentication required.' }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] });
  });
  renderApp();

  const loginButton = await screen.findByRole('button', { name: /login/i });
  userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com');
  userEvent.type(screen.getByLabelText(/^password$/i), 'wrong-password');

  userEvent.click(loginButton);

  expect(await screen.findByRole('status')).toHaveTextContent(/invalid email or password/i);
  await waitFor(() => expect(loginButton).toBeEnabled());
});

test('uses the database email login and never sends the legacy credentials', async () => {
  global.fetch.mockImplementation((url, options = {}) => {
    if (String(url).endsWith('/auth/login')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 1, email: 'rahim.mugnee@gmail.com', display_name: 'Abdur Rahim', role_name: 'Super Admin' } }) });
    }
    if (String(url).endsWith('/auth/me')) {
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] });
  });
  renderApp();
  userEvent.type(await screen.findByLabelText(/email/i), 'rahim.mugnee@gmail.com');
  userEvent.type(screen.getByLabelText(/^password$/i), 'secret-6');
  userEvent.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/auth\/login$/),
    expect.objectContaining({ body: expect.stringContaining('rahim.mugnee@gmail.com') })
  ));
  const loginCall = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/auth/login'));
  expect(loginCall[1].body).not.toContain('7679');
  const profileButton = await screen.findByRole('button', { name: /abdur rahim/i });
  expect(profileButton).toHaveTextContent(/super admin/i);
  const companySelect = screen.getByRole('combobox', { name: /company name/i });
  const categorySelect = screen.getByRole('combobox', { name: /calculator category/i });
  const displayTypeSelect = screen.getByRole('combobox', { name: /display type/i });
  const technologySelect = screen.getByRole('combobox', { name: /^technology$/i });
  expect(companySelect.closest('.calculator-context-row')).toBe(categorySelect.closest('.calculator-context-row'));
  expect(companySelect.closest('.calculator-context-row')).toBe(displayTypeSelect.closest('.calculator-context-row'));
  expect(companySelect.closest('.calculator-context-row')).toBe(technologySelect.closest('.calculator-context-row'));
  fireEvent.change(technologySelect, { target: { value: 'cob' } });
  expect(technologySelect).toHaveValue('cob');
  fireEvent.change(displayTypeSelect, { target: { value: 'outdoor' } });
  expect(displayTypeSelect).toHaveValue('outdoor');
  expect(technologySelect).toHaveValue('smd');
  fireEvent.change(categorySelect, { target: { value: 'rental' } });
  expect(categorySelect).toHaveValue('rental');
  expect(displayTypeSelect).toBeDisabled();
  expect(technologySelect).toBeDisabled();
  expect(screen.queryByRole('menuitem', { name: /logout/i })).not.toBeInTheDocument();
  userEvent.click(profileButton);
  expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
  userEvent.click(screen.getByRole('heading', { name: /preview/i }));
  expect(screen.queryByRole('menuitem', { name: /logout/i })).not.toBeInTheDocument();
});

test('updates the quotation reference when pixel pitch or display size changes', async () => {
  global.fetch.mockImplementation((url) => {
    const value = String(url);
    if (value.endsWith('/auth/me')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 1, email: 'admin@example.com', display_name: 'Admin', role_name: 'Super Admin' } }) });
    }
    if (value.includes('/public/companies')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 1, name: 'Mugnee', code: 'mugnee', is_default: true, assets: {} }] });
    }
    if (value.includes('/led-prices') || value.includes('/led-module/brands')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    }
    return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
  });

  renderApp();
  const sequenceKey = `quotationReferenceSequence:MUG:${new Date().getFullYear()}`;
  await screen.findByRole('button', { name: 'Pixel Pitch' });
  await waitFor(() => expect(Number(window.localStorage.getItem(sequenceKey))).toBeGreaterThan(0));
  const initialSequence = Number(window.localStorage.getItem(sequenceKey));

  fireEvent.click(screen.getByRole('button', { name: 'Pixel Pitch' }));
  fireEvent.click(screen.getByRole('option', { name: 'P2' }));
  await waitFor(() => expect(Number(window.localStorage.getItem(sequenceKey))).toBe(initialSequence + 1));

  fireEvent.change(screen.getByLabelText(/width \(ft\)/i), { target: { value: '16' } });
  await waitFor(() => expect(Number(window.localStorage.getItem(sequenceKey))).toBe(initialSequence + 2));
});
