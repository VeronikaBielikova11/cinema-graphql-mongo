// Schema-level guard for whole positive numbers (rows, seats, prices, minutes).
export const positiveInteger = {
  validator: (value: number) => Number.isInteger(value) && value > 0,
  message: (props: { path: string; value: unknown }) =>
    `${props.path} must be a positive integer, got ${String(props.value)}`,
};
