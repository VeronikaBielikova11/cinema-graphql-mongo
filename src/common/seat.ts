export interface SeatPosition {
  row: number;
  seat: number;
}

export const seatLabel = ({ row, seat }: SeatPosition) =>
  `row ${row} seat ${seat}`;

// Expands a hall layout into its seat list: 3 rows x 5 seats gives 15 seats.
export function listSeats(rows: number, seatsPerRow: number): SeatPosition[] {
  const seats: SeatPosition[] = [];
  for (let row = 1; row <= rows; row++) {
    for (let seat = 1; seat <= seatsPerRow; seat++) {
      seats.push({ row, seat });
    }
  }
  return seats;
}
