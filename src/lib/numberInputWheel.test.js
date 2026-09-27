import { blurActiveNumberInputOnWheel } from './numberInputWheel';

test('blurs a focused number input on wheel without blocking page scrolling', () => {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = '9300';
  document.body.appendChild(input);
  input.focus();

  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true });
  input.addEventListener('wheel', blurActiveNumberInputOnWheel);
  input.dispatchEvent(event);

  expect(document.activeElement).not.toBe(input);
  expect(input).toHaveValue(9300);
  expect(event.defaultPrevented).toBe(false);

  input.remove();
});

test('does not blur other input types', () => {
  const input = document.createElement('input');
  input.type = 'text';
  document.body.appendChild(input);
  input.focus();

  blurActiveNumberInputOnWheel({ target: input });

  expect(document.activeElement).toBe(input);

  input.remove();
});
