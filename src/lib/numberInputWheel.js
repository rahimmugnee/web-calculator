export function blurActiveNumberInputOnWheel(event) {
  const input = event.target;

  if (
    input instanceof HTMLInputElement &&
    input.type === "number" &&
    document.activeElement === input
  ) {
    input.blur();
  }
}

