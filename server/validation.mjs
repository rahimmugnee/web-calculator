export const textValue = (value, field, { required = true, max = 255 } = {}) => {
  const text = String(value ?? "").trim();
  if (required && !text) throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  if (text.length > max) throw Object.assign(new Error(`${field} is too long.`), { status: 400 });
  return text || null;
};
export const emailValue = (value, field = "Email") => {
  const email = textValue(value, field, { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  }
  return email;
};
export const slugValue = (value, field = "Code") => {
  const text = textValue(value, field, { max: 80 });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) throw Object.assign(new Error(`${field} must use lowercase letters, numbers, and hyphens.`), { status: 400 });
  return text;
};
export const moneyValue = (value, field = "Price") => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999999) throw Object.assign(new Error(`${field} must be a valid non-negative amount.`), { status: 400 });
  return number;
};
export const idValue = (value, field = "ID") => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw Object.assign(new Error(`${field} is invalid.`), { status: 400 });
  return number;
};
