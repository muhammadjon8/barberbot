import { Order } from "../schemas/order";

function generateOrderCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

export async function createUniqueOrderCode() {
  let code = "";
  let exists = true;

  while (exists) {
    code = generateOrderCode();
    exists = !!(await Order.exists({ orderCode: code ?? null }));
  }

  return code;
}
