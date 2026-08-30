import { render, screen } from '@testing-library/react';
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
});

test('renders the login page first', () => {
  renderApp();
  expect(screen.getByRole('heading', { name: /quotation builder/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});

test('shows an error after invalid login', () => {
  renderApp();

  const loginButton = screen.getByRole('button', { name: /login/i });

  userEvent.click(loginButton);

  expect(screen.getByRole('status')).toHaveTextContent(/invalid username or password/i);
  expect(loginButton).toBeEnabled();
});
